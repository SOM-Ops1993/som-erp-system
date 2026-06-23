/**
 * Cron Jobs — run on server startup
 * Uses setInterval (no external scheduler needed with Node 22)
 *
 * Intervals:
 *   - Notification escalation checker: every 15 minutes
 *   - QR confirmation timeout flagging: every 30 minutes
 *   - CFU status updater: every 6 hours
 *   - Excel Sales Order sync: every 30 minutes (if MS365 configured)
 *   - Microbial dispatch follow-up: every hour
 */
import prisma from "../db.js";
import {
  checkEscalations,
  createNotification,
} from "./notification-service.js";
import { runPlanningEngine } from "../modules/planning/plan-engine/plan-engine.controller.js";

const MIN = 60 * 1000;
const HR = 60 * MIN;

// ── Schedule a daily job at a specific HH:MM ─────────────────────────────────
function scheduleDailyAt(hour, minute, fn, log, label) {
  function msUntilNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  }
  function run() {
    fn().catch((e) => log.error(`[CRON ${label}]`, e.message));
    setTimeout(run, msUntilNext() + 1000); // schedule next day
  }
  setTimeout(run, msUntilNext());
  log.info &&
    log.info(
      `[CRON ${label}] scheduled — next run in ${Math.round(msUntilNext() / MIN)} min`,
    );
}

export function startCronJobs(fastify) {
  const log = fastify?.log || console;

  // ── Planning engine: daily at 08:30 ─────────────────────────────────────
  scheduleDailyAt(
    8,
    30,
    async () => {
      log.info &&
        log.info("[CRON planning] Running scheduled planning engine…");
      const result = await runPlanningEngine("SCHEDULED");
      log.info &&
        log.info(`[CRON planning] Done — ${result.plansCreated} plans created`);
    },
    log,
    "planning",
  );

  // ── 1. Notification escalation: every 15 min ──────────────────────────────
  setInterval(async () => {
    try {
      await checkEscalations();
    } catch (e) {
      log.error("[CRON escalation]", e.message);
    }
  }, 15 * MIN);

  // ── 2. QR confirmation timeout: every 30 min ──────────────────────────────
  //    Flag gate inwards that were created >4h ago with status qr_pending
  setInterval(async () => {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * HR);
      const pending = await prisma.$queryRaw`
        SELECT gi.inward_id, gi.item_name, gi.lot_number, gi.created_at
        FROM gate_inward gi
        WHERE gi.status = 'qr_pending'
          AND gi.created_at < ${fourHoursAgo}
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.ref_type = 'gate_inward'
              AND n.ref_id = gi.inward_id::text
              AND n.notif_type = 'qr_pending'
              AND n.created_at > ${fourHoursAgo}
          )
        LIMIT 20
      `;
      for (const gi of pending) {
        await createNotification({
          type: "qr_pending",
          title: "QR Confirmation Overdue",
          message: `Gate inward for ${gi.item_name || gi.lot_number} created at ${new Date(gi.created_at).toLocaleString("en-IN")} has no QR confirmation. Pack is in quarantine.`,
          targetRole: "store_person",
          refType: "gate_inward",
          refId: gi.inward_id,
        });
      }
      if (pending.length)
        log.info(`[CRON qr_pending] Flagged ${pending.length} entries`);
    } catch (e) {
      log.error("[CRON qr_pending]", e.message);
    }
  }, 30 * MIN);

  // ── 3. CFU status updater: every 6 hours ──────────────────────────────────
  setInterval(async () => {
    try {
      await updateCfuStatuses(log);
    } catch (e) {
      log.error("[CRON cfu]", e.message);
    }
  }, 6 * HR);

  // ── 4. Microbial dispatch unconfirmed > 24h: every hour ───────────────────
  setInterval(async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * HR);
      const unconfirmed = await prisma.$queryRaw`
        SELECT mt.id, mt.container_id, mt.receiver_name, mt.dispatch_date, mc.strain_id
        FROM microbial_transactions mt
        JOIN microbial_containers mc ON mc.container_id = mt.container_id
        WHERE mt.receipt_confirmed = false
          AND mt.dispatch_date < ${yesterday}
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.ref_type = 'microbial_transaction'
              AND n.ref_id = mt.id::text
              AND n.notif_type = 'microbial_unconfirmed'
              AND n.created_at > ${yesterday}
          )
        LIMIT 20
      `;
      for (const tx of unconfirmed) {
        await createNotification({
          type: "microbial_unconfirmed",
          title: "Microbial Dispatch Unconfirmed",
          message: `Dispatch to "${tx.receiver_name}" on ${new Date(tx.dispatch_date).toLocaleDateString("en-IN")} has not been confirmed by receiver. Please follow up immediately.`,
          targetRole: "store_manager",
          refType: "microbial_transaction",
          refId: tx.id,
        });
      }
      if (unconfirmed.length)
        log.info(
          `[CRON microbial_unconfirmed] ${unconfirmed.length} dispatches flagged`,
        );
    } catch (e) {
      log.error("[CRON microbial_unconfirmed]", e.message);
    }
  }, HR);

  // ── 5. Batch start overdue: every 30 min ──────────────────────────────────
  setInterval(async () => {
    try {
      const now = new Date();
      const overdue = await prisma.$queryRaw`
        SELECT pj.job_id, pj.batch_code, pj.expected_start_time, ep.product_code
        FROM production_jobs pj
        JOIN production_plans pp ON pp.plan_id = pj.plan_id
        JOIN erp_products ep ON ep.product_code = pj.product_code
        WHERE pj.status = 'pending'
          AND pj.expected_start_time < ${now}
          AND pp.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.ref_type = 'production_job'
              AND n.ref_id = pj.job_id::text
              AND n.notif_type = 'batch_not_started'
          )
        LIMIT 20
      `;
      for (const job of overdue) {
        await createNotification({
          type: "batch_not_started",
          title: "Batch Not Started",
          message: `Batch ${job.batch_code} for ${job.product_code} was expected to start at ${new Date(job.expected_start_time).toLocaleString("en-IN")} but has not been started.`,
          targetRole: "plant_supervisor",
          refType: "production_job",
          refId: job.job_id,
        });
      }
    } catch (e) {
      log.error("[CRON batch_not_started]", e.message);
    }
  }, 30 * MIN);

  log.info("[CRON] All cron jobs started");
}

// ─── CFU Status Updater ───────────────────────────────────────────────────────
async function updateCfuStatuses(log) {
  const containers = await prisma.$queryRaw`
    SELECT mc.container_id, mc.mfg_cfu_per_ml, mc.mfg_date, mc.expiry_date,
           ms.decay_k, mc.status
    FROM microbial_containers mc
    JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
    WHERE mc.status != 'exhausted'
  `;
  const today = new Date();
  let updated = 0;
  for (const c of containers) {
    const daysSinceMfg = (today - new Date(c.mfg_date)) / (1000 * 86400);
    const currentCfu = c.mfg_cfu_per_ml * Math.exp(-c.decay_k * daysSinceMfg);
    const cfuRatio = currentCfu / c.mfg_cfu_per_ml;
    const daysToExpiry = (new Date(c.expiry_date) - today) / (1000 * 86400);

    let newStatus = "healthy";
    if (cfuRatio < 0.3 || daysToExpiry < 10) newStatus = "at_risk";
    else if (cfuRatio < 0.5 || daysToExpiry < 30) newStatus = "watch";

    if (newStatus !== c.status) {
      await prisma.$executeRaw`
        UPDATE microbial_containers SET status = ${newStatus}, updated_at = NOW()
        WHERE container_id = ${c.container_id}::uuid
      `;
      updated++;
      if (newStatus === "at_risk" || newStatus === "watch") {
        await createNotification({
          type: "cfu_threshold",
          title: `Microbial Container Status: ${newStatus.toUpperCase()}`,
          message: `Container ${c.container_id} CFU ratio dropped to ${(cfuRatio * 100).toFixed(1)}%. Expiry: ${new Date(c.expiry_date).toLocaleDateString("en-IN")}. Status changed to ${newStatus}.`,
          targetRole: "store_manager",
          refType: "microbial_container",
          refId: c.container_id,
        });
      }
    }
  }
  if (updated) log?.info(`[CRON cfu] Updated ${updated} container statuses`);
}
