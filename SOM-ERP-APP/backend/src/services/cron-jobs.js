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
import { runPlanningEngine } from "../modules/planning/plan-engine/create/plan-engine.controller.js";

const MIN = 60 * 1000;
const HR = 60 * MIN;

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
    setTimeout(run, msUntilNext() + 1000);
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
      log.info && log.info("[CRON planning] Running scheduled planning engine…");
      const result = await runPlanningEngine("SCHEDULED");
      log.info && log.info(`[CRON planning] Done — ${result.plansCreated} plans created`);
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
  setInterval(async () => {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * HR);

      // Pending gate inwards older than 4h
      const pending = await prisma.gateInward.findMany({
        where:  { status: 'qr_pending', createdAt: { lt: fourHoursAgo } },
        select: { inwardId: true, supplierName: true, createdAt: true },
        take:   20,
      })

      if (!pending.length) return

      // Recent notifications already sent for these gate inwards
      const recentNotifs = await prisma.erpNotification.findMany({
        where: {
          refType:   'gate_inward',
          notifType: 'qr_pending',
          createdAt: { gt: fourHoursAgo },
          refId:     { in: pending.map(gi => gi.inwardId) },
        },
        select: { refId: true },
      })
      const notifiedIds = new Set(recentNotifs.map(n => n.refId))

      for (const gi of pending) {
        if (notifiedIds.has(gi.inwardId)) continue
        await createNotification({
          type:       "qr_pending",
          title:      "QR Confirmation Overdue",
          message:    `Gate inward for ${gi.supplierName || gi.inwardId} created at ${new Date(gi.createdAt).toLocaleString("en-IN")} has no QR confirmation. Pack is in quarantine.`,
          targetRole: "store_person",
          refType:    "gate_inward",
          refId:      gi.inwardId,
        });
      }
      if (pending.length) log.info(`[CRON qr_pending] Processed ${pending.length} entries`);
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

      const unconfirmed = await prisma.microbialTransaction.findMany({
        where:   { receiptConfirmed: false, dispatchDate: { lt: yesterday } },
        include: { container: { include: { strain: { select: { strainId: true } } } } },
        take:    20,
      })

      if (!unconfirmed.length) return

      const recentNotifs = await prisma.erpNotification.findMany({
        where: {
          refType:   'microbial_transaction',
          notifType: 'microbial_unconfirmed',
          createdAt: { gt: yesterday },
          refId:     { in: unconfirmed.map(tx => tx.id) },
        },
        select: { refId: true },
      })
      const notifiedIds = new Set(recentNotifs.map(n => n.refId))

      for (const tx of unconfirmed) {
        if (notifiedIds.has(tx.id)) continue
        await createNotification({
          type:       "microbial_unconfirmed",
          title:      "Microbial Dispatch Unconfirmed",
          message:    `Dispatch to "${tx.receiverName}" on ${new Date(tx.dispatchDate).toLocaleDateString("en-IN")} has not been confirmed by receiver. Please follow up immediately.`,
          targetRole: "store_manager",
          refType:    "microbial_transaction",
          refId:      tx.id,
        });
      }
      if (unconfirmed.length) log.info(`[CRON microbial_unconfirmed] ${unconfirmed.length} dispatches processed`);
    } catch (e) {
      log.error("[CRON microbial_unconfirmed]", e.message);
    }
  }, HR);

  // ── 5. Batch start overdue: every 30 min ──────────────────────────────────
  setInterval(async () => {
    try {
      const now = new Date();

      const overdue = await prisma.erpProductionJob.findMany({
        where: {
          status:            'pending',
          expectedStartTime: { lt: now },
          plan:              { status: 'published' },
        },
        include: { plan: { select: { diNumber: true } } },
        take:    20,
      })

      if (!overdue.length) return

      const existingNotifs = await prisma.erpNotification.findMany({
        where: {
          refType:   'production_job',
          notifType: 'batch_not_started',
          refId:     { in: overdue.map(j => j.jobId) },
        },
        select: { refId: true },
      })
      const notifiedIds = new Set(existingNotifs.map(n => n.refId))

      for (const job of overdue) {
        if (notifiedIds.has(job.jobId)) continue
        await createNotification({
          type:       "batch_not_started",
          title:      "Batch Not Started",
          message:    `Batch ${job.batchCode} for ${job.productCode} was expected to start at ${new Date(job.expectedStartTime).toLocaleString("en-IN")} but has not been started.`,
          targetRole: "plant_supervisor",
          refType:    "production_job",
          refId:      job.jobId,
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
  const containers = await prisma.microbialContainer.findMany({
    where:   { status: { not: 'exhausted' } },
    include: { strain: { select: { decayK: true } } },
  })

  const today = new Date();
  let updated = 0;

  for (const c of containers) {
    const daysSinceMfg = (today - new Date(c.mfgDate)) / (1000 * 86400);
    const currentCfu   = Number(c.mfgCfuPerMl) * Math.exp(-Number(c.strain.decayK) * daysSinceMfg);
    const cfuRatio     = currentCfu / Number(c.mfgCfuPerMl);
    const daysToExpiry = (new Date(c.expiryDate) - today) / (1000 * 86400);

    let newStatus = "healthy";
    if (cfuRatio < 0.3 || daysToExpiry < 10) newStatus = "at_risk";
    else if (cfuRatio < 0.5 || daysToExpiry < 30) newStatus = "watch";

    if (newStatus !== c.status) {
      await prisma.microbialContainer.update({
        where: { containerId: c.containerId },
        data:  { status: newStatus },
      });
      updated++;

      if (newStatus === "at_risk" || newStatus === "watch") {
        await createNotification({
          type:       "cfu_threshold",
          title:      `Microbial Container Status: ${newStatus.toUpperCase()}`,
          message:    `Container ${c.containerId} CFU ratio dropped to ${(cfuRatio * 100).toFixed(1)}%. Expiry: ${new Date(c.expiryDate).toLocaleDateString("en-IN")}. Status changed to ${newStatus}.`,
          targetRole: "store_manager",
          refType:    "microbial_container",
          refId:      c.containerId,
        });
      }
    }
  }

  if (updated) log?.info(`[CRON cfu] Updated ${updated} container statuses`);
}
