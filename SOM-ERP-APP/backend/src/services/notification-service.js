/**
 * Notification Service
 * Creates in-app notifications + triggers WhatsApp/SMS delivery
 * Escalation: L1 immediately, L2 after 2h, L3 after 4h
 */
import prisma from '../db.js'
import { sendWhatsApp } from './whatsapp-service.js'

// ─── Notification type → L1 roles mapping ───────────────────────────────────
const NOTIF_ROLES = {
  qr_pending:            'store_person',
  bom_published:         'store_person',
  batch_not_started:     'plant_supervisor',
  batch_delayed:         'plant_supervisor',
  rm_reorder:            'store_manager',
  cfu_threshold:         'store_manager',
  fifo_override_req:     'store_manager',
  adj_pending_approval:  'store_manager',
  bom_version_changed:   'planner',
  urgent_order:          'plant_supervisor',
  microbial_unconfirmed: 'store_manager',
  unauthorised_outward:  'store_manager',
  transfer_pending:      'store_person',
}

// WhatsApp-enabled notification types
const WHATSAPP_TYPES = new Set([
  'qr_pending', 'bom_published', 'batch_not_started', 'batch_delayed', 'urgent_order',
])

/**
 * createNotification — create an in-app notification + optionally deliver via WhatsApp
 * @param {object} opts
 * @param {string} opts.type          - notif_type key (see NOTIF_ROLES)
 * @param {string} opts.title         - short title
 * @param {string} opts.message       - full message
 * @param {string} [opts.targetRole]  - broadcast to all users with this role
 * @param {string} [opts.targetUserId]- send to specific user
 * @param {string} [opts.refType]     - e.g. 'gate_inward'
 * @param {string} [opts.refId]       - ID of the related record
 */
export async function createNotification({ type, title, message, targetRole, targetUserId, refType, refId }) {
  // Determine role from type if not provided
  const role = targetRole || NOTIF_ROLES[type] || null

  // Fetch target users
  let targetUsers = []
  if (targetUserId) {
    const rows = await prisma.$queryRaw`
      SELECT user_id, full_name, phone FROM users WHERE user_id = ${targetUserId}::uuid AND is_active = true
    `
    targetUsers = rows
  } else if (role) {
    const rows = await prisma.$queryRaw`
      SELECT user_id, full_name, phone FROM users WHERE role = ${role} AND is_active = true
    `
    targetUsers = rows
  }

  // Insert notification record(s)
  const notifIds = []
  for (const user of targetUsers) {
    const rows = await prisma.$queryRaw`
      INSERT INTO notifications (notif_type, title, message, target_role, target_user_id, ref_type, ref_id)
      VALUES (${type}, ${title}, ${message}, ${role}, ${user.user_id}::uuid, ${refType || null}, ${refId?.toString() || null})
      RETURNING notif_id
    `
    const notifId = rows[0]?.notif_id
    notifIds.push(notifId)

    // Deliver via WhatsApp if applicable
    if (WHATSAPP_TYPES.has(type) && user.phone) {
      await sendWhatsApp({
        to: user.phone,
        message: `[SOM ERP] ${title}\n${message}`,
        notifId,
      }).catch(err => console.error('[WhatsApp delivery error]', err.message))
    }
  }

  return notifIds
}

/**
 * checkEscalations — called by cron every 15 min
 * Finds un-actioned notifications and escalates to manager/plant-head
 */
export async function checkEscalations() {
  const now = new Date()
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000)

  // Find notifications not actioned, older than 2h, not yet escalated to L2
  const pendingL2 = await prisma.$queryRaw`
    SELECT n.notif_id, n.title, n.message, n.target_role, n.created_at
    FROM notifications n
    WHERE n.is_actioned = false
      AND n.created_at < ${twoHoursAgo}
      AND NOT EXISTS (
        SELECT 1 FROM notification_escalations ne WHERE ne.notif_id = n.notif_id AND ne.level = 2
      )
    LIMIT 50
  `

  for (const notif of pendingL2) {
    const managerRole = getManagerRole(notif.target_role)
    if (!managerRole) continue
    const managers = await prisma.$queryRaw`
      SELECT user_id, phone, full_name FROM users WHERE role = ${managerRole} AND is_active = true
    `
    for (const mgr of managers) {
      await prisma.$executeRaw`
        INSERT INTO notification_escalations (notif_id, level, escalated_to, notes)
        VALUES (${notif.notif_id}::uuid, 2, ${mgr.user_id}::uuid,
          ${'Action pending since 2 hours. Originally assigned to ' + notif.target_role + '. Please action immediately.'})
      `
      await prisma.$executeRaw`
        INSERT INTO notifications (notif_type, title, message, target_user_id, ref_type, ref_id)
        VALUES ('escalation', ${'[ESCALATION L2] ' + notif.title},
          ${'Action pending since 2 hours. Originally assigned to ' + notif.target_role + '. ' + notif.message},
          ${mgr.user_id}::uuid, 'notification', ${notif.notif_id.toString()})
      `
      if (mgr.phone) {
        await sendWhatsApp({ to: mgr.phone, message: `[SOM ERP ESCALATION] ${notif.title}\nAction pending 2h. Please action immediately.` })
          .catch(() => {})
      }
    }
  }

  // L3 escalation (4h unactioned)
  const pendingL3 = await prisma.$queryRaw`
    SELECT n.notif_id, n.title, n.message, n.target_role, n.created_at
    FROM notifications n
    WHERE n.is_actioned = false
      AND n.created_at < ${fourHoursAgo}
      AND NOT EXISTS (
        SELECT 1 FROM notification_escalations ne WHERE ne.notif_id = n.notif_id AND ne.level = 3
      )
    LIMIT 50
  `
  for (const notif of pendingL3) {
    const admins = await prisma.$queryRaw`
      SELECT user_id, phone, full_name FROM users WHERE role = 'admin' AND is_active = true
    `
    for (const admin of admins) {
      await prisma.$executeRaw`
        INSERT INTO notification_escalations (notif_id, level, escalated_to, notes)
        VALUES (${notif.notif_id}::uuid, 3, ${admin.user_id}::uuid,
          ${'Action pending since 4 hours. Escalated to plant head/admin.'})
      `
      await prisma.$executeRaw`
        INSERT INTO notifications (notif_type, title, message, target_user_id, ref_type, ref_id)
        VALUES ('escalation', ${'[ESCALATION L3] ' + notif.title},
          ${'URGENT: Action pending 4 hours. ' + notif.message},
          ${admin.user_id}::uuid, 'notification', ${notif.notif_id.toString()})
      `
      if (admin.phone) {
        await sendWhatsApp({ to: admin.phone, message: `[SOM ERP CRITICAL] ${notif.title}\nUrgent: action pending 4h.` })
          .catch(() => {})
      }
    }
  }
}

function getManagerRole(role) {
  const map = {
    store_person:    'store_manager',
    gate_staff:      'store_manager',
    plant_supervisor:'admin',
    planner:         'planning_manager',
    planning_manager:'admin',
    store_manager:   'admin',
  }
  return map[role] || 'admin'
}
