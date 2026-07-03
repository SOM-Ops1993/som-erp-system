/**
 * Notification Service
 * Creates in-app notifications + triggers WhatsApp/SMS delivery
 * Escalation: L1 immediately, L2 after 2h, L3 after 4h
 */
import prisma from '../db.js'
import { sendWhatsApp } from './whatsapp-service.js'

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

const WHATSAPP_TYPES = new Set([
  'qr_pending', 'bom_published', 'batch_not_started', 'batch_delayed', 'urgent_order',
])

export async function createNotification({ type, title, message, targetRole, targetUserId, refType, refId }) {
  const role = targetRole || NOTIF_ROLES[type] || null

  let targetUsers = []
  if (targetUserId) {
    targetUsers = await prisma.user.findMany({
      where: { userId: targetUserId, isActive: true },
      select: { userId: true, fullName: true, phone: true },
    })
  } else if (role) {
    targetUsers = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { userId: true, fullName: true, phone: true },
    })
  }

  const notifIds = []
  for (const user of targetUsers) {
    const notif = await prisma.erpNotification.create({
      data: {
        notifType:    type,
        title,
        message,
        targetRole:   role,
        targetUserId: user.userId,
        refType:      refType || null,
        refId:        refId?.toString() || null,
      },
    })
    notifIds.push(notif.notifId)

    if (WHATSAPP_TYPES.has(type) && user.phone) {
      await sendWhatsApp({
        to: user.phone,
        message: `[SOM ERP] ${title}\n${message}`,
        notifId: notif.notifId,
      }).catch(err => console.error('[WhatsApp delivery error]', err.message))
    }
  }

  return notifIds
}

export async function checkEscalations() {
  const now = new Date()
  const twoHoursAgo  = new Date(now - 2 * 60 * 60 * 1000)
  const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000)

  // L2 — unactioned > 2h, no L2 escalation yet
  const pendingL2 = await prisma.erpNotification.findMany({
    where: {
      isActioned: false,
      createdAt:  { lt: twoHoursAgo },
      NOT: { escalations: { some: { level: 2 } } },
    },
    select: { notifId: true, title: true, message: true, targetRole: true, createdAt: true },
    take: 50,
  })

  for (const notif of pendingL2) {
    const managerRole = getManagerRole(notif.targetRole)
    if (!managerRole) continue

    const managers = await prisma.user.findMany({
      where: { role: managerRole, isActive: true },
      select: { userId: true, phone: true, fullName: true },
    })

    for (const mgr of managers) {
      await prisma.notificationEscalation.create({
        data: {
          notifId:     notif.notifId,
          level:       2,
          escalatedTo: mgr.userId,
          notes:       `Action pending since 2 hours. Originally assigned to ${notif.targetRole}. Please action immediately.`,
        },
      })
      await prisma.erpNotification.create({
        data: {
          notifType:    'escalation',
          title:        `[ESCALATION L2] ${notif.title}`,
          message:      `Action pending since 2 hours. Originally assigned to ${notif.targetRole}. ${notif.message}`,
          targetUserId: mgr.userId,
          refType:      'notification',
          refId:        notif.notifId,
        },
      })
      if (mgr.phone) {
        await sendWhatsApp({ to: mgr.phone, message: `[SOM ERP ESCALATION] ${notif.title}\nAction pending 2h. Please action immediately.` })
          .catch(() => {})
      }
    }
  }

  // L3 — unactioned > 4h, no L3 escalation yet
  const pendingL3 = await prisma.erpNotification.findMany({
    where: {
      isActioned: false,
      createdAt:  { lt: fourHoursAgo },
      NOT: { escalations: { some: { level: 3 } } },
    },
    select: { notifId: true, title: true, message: true, targetRole: true, createdAt: true },
    take: 50,
  })

  for (const notif of pendingL3) {
    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { userId: true, phone: true, fullName: true },
    })
    for (const admin of admins) {
      await prisma.notificationEscalation.create({
        data: {
          notifId:     notif.notifId,
          level:       3,
          escalatedTo: admin.userId,
          notes:       'Action pending since 4 hours. Escalated to plant head/admin.',
        },
      })
      await prisma.erpNotification.create({
        data: {
          notifType:    'escalation',
          title:        `[ESCALATION L3] ${notif.title}`,
          message:      `URGENT: Action pending 4 hours. ${notif.message}`,
          targetUserId: admin.userId,
          refType:      'notification',
          refId:        notif.notifId,
        },
      })
      if (admin.phone) {
        await sendWhatsApp({ to: admin.phone, message: `[SOM ERP CRITICAL] ${notif.title}\nUrgent: action pending 4h.` })
          .catch(() => {})
      }
    }
  }
}

function getManagerRole(role) {
  const map = {
    store_person:     'store_manager',
    gate_staff:       'store_manager',
    plant_supervisor: 'admin',
    planner:          'planning_manager',
    planning_manager: 'admin',
    store_manager:    'admin',
  }
  return map[role] || 'admin'
}
