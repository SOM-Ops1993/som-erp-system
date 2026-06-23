/**
 * Audit Logger — writes every mutating action to audit_log table
 * Usage: await writeAudit(prisma, { userId, username, action, tableName, recordId, oldValue, newValue, notes, ip })
 */
import prisma from '../db.js'

export async function writeAudit({ userId, username, action, tableName, recordId, oldValue, newValue, notes, ip } = {}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_log (user_id, username, action, table_name, record_id, old_value, new_value, ip_address, notes)
      VALUES (
        ${userId ? userId : null}::uuid,
        ${username || null},
        ${action},
        ${tableName || null},
        ${recordId?.toString() || null},
        ${oldValue ? JSON.stringify(oldValue) : null}::jsonb,
        ${newValue ? JSON.stringify(newValue) : null}::jsonb,
        ${ip || null},
        ${notes || null}
      )
    `
  } catch (err) {
    // Audit failures must never crash the main flow — log and continue
    console.error('[AUDIT LOG ERROR]', err.message)
  }
}

/**
 * Helper to extract user info from Express request (populated by authenticate middleware)
 */
export function auditUser(request) {
  return {
    userId: request.user?.user_id || null,
    username: request.user?.username || 'unknown',
    ip: request.ip || null,
  }
}
