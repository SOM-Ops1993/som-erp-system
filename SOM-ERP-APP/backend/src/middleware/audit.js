import prisma from '../db.js'

export async function writeAudit({ userId, username, action, tableName, recordId, oldValue, newValue, notes, ip } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId:    userId    || null,
        username:  username  || null,
        action,
        tableName: tableName || null,
        recordId:  recordId?.toString() || null,
        oldValue:  oldValue  || undefined,
        newValue:  newValue  || undefined,
        ipAddress: ip        || null,
        notes:     notes     || null,
      },
    })
  } catch (err) {
    // Audit failures must never crash the main flow — log and continue
    console.error('[AUDIT LOG ERROR]', err.message)
  }
}

export function auditUser(request) {
  return {
    userId:   request.user?.user_id  || null,
    username: request.user?.username || 'unknown',
    ip:       request.ip             || null,
  }
}
