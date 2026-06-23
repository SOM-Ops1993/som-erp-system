/**
 * WhatsApp / SMS Notification Service
 * Primary: WhatsApp Business API via MSG91
 * Fallback: SMS via MSG91 if WhatsApp fails
 *
 * Required env vars:
 *   MSG91_AUTH_KEY         — your MSG91 auth key (from MSG91 dashboard)
 *   MSG91_SENDER_ID        — SMS sender ID, e.g. SOMERP (6 chars, DLT registered)
 *   MSG91_WHATSAPP_NUMBER  — your MSG91 integrated WhatsApp number, e.g. 919876543210
 *   WHATSAPP_ENABLED       — set to 'true' to actually send (default: false = mock/log only)
 *
 * Optional (for template-based WhatsApp, needed for business-initiated messages):
 *   MSG91_TEMPLATE_NAME    — approved WhatsApp template name in MSG91
 *   MSG91_TEMPLATE_LANG    — template language code, default: en
 *
 * MSG91 WhatsApp modes:
 *   - If MSG91_TEMPLATE_NAME is set → sends as an approved template (business-initiated,
 *     works outside 24h window). The {{1}} variable in the template receives the message text.
 *   - Otherwise → sends as a session/text message (only works within a 24h reply window,
 *     i.e. user must have messaged you first). Fine for internal ops where staff are active.
 */

const MSG91_AUTH_KEY      = process.env.MSG91_AUTH_KEY || ''
const MSG91_SENDER_ID     = process.env.MSG91_SENDER_ID || 'SOMERP'
const MSG91_WA_NUMBER     = process.env.MSG91_WHATSAPP_NUMBER || '919999999999'
const MSG91_TMPL_NAME     = process.env.MSG91_TEMPLATE_NAME || ''
const MSG91_TMPL_LANG     = process.env.MSG91_TEMPLATE_LANG || 'en'
const WHATSAPP_ENABLED    = process.env.WHATSAPP_ENABLED === 'true'

import prisma from '../db.js'

/**
 * sendWhatsApp — send via MSG91 WhatsApp Business API
 * Falls back to SMS if WhatsApp fails or is not configured.
 */
export async function sendWhatsApp({ to, message, notifId }) {
  if (!WHATSAPP_ENABLED || !MSG91_AUTH_KEY) {
    // Dev/staging: log intent only, don't send
    console.log(`[WhatsApp MOCK] To: ${to} | ${message.slice(0, 80)}`)
    if (notifId) await logDelivery(notifId, 'whatsapp', 'mock', null)
    return { success: true, mock: true }
  }

  const phone = normalizePhone(to)
  if (!phone) {
    console.warn('[WhatsApp] Invalid phone:', to)
    return { success: false, error: 'Invalid phone' }
  }

  try {
    // Build payload — template mode if template name is configured,
    // otherwise plain text (session message within 24h window)
    const waPayload = MSG91_TMPL_NAME
      ? {
          // Template-based (business-initiated) — works anytime
          // Your MSG91 template must have one body variable {{1}} = alert text
          integrated_number: MSG91_WA_NUMBER,
          content_type: 'template',
          payload: {
            to: phone,
            type: 'template',
            template: {
              name: MSG91_TMPL_NAME,
              language: { code: MSG91_TMPL_LANG },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: message.slice(0, 1024) }],
                },
              ],
            },
          },
        }
      : {
          // Session/text message — works only within 24h of user's last message
          integrated_number: MSG91_WA_NUMBER,
          content_type: 'text',
          payload: {
            to: phone,
            type: 'text',
            text: { body: message.slice(0, 4096) },
          },
        }

    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(waPayload),
    })
    const json = await res.json()
    const requestId = json?.request_id || json?.data?.request_id || null
    if (notifId) await logDelivery(notifId, 'whatsapp', res.ok ? 'sent' : 'failed', requestId)
    if (!res.ok) {
      console.warn('[WhatsApp] MSG91 rejected:', json)
      // Fall through to SMS
      return sendSMS({ to: phone, message, notifId })
    }
    return { success: true, data: json }
  } catch (err) {
    console.error('[WhatsApp Error]', err.message)
    // Fallback to SMS
    return sendSMS({ to: phone, message, notifId })
  }
}

/**
 * sendSMS — MSG91 SMS fallback
 */
export async function sendSMS({ to, message, notifId }) {
  if (!WHATSAPP_ENABLED || !MSG91_AUTH_KEY) {
    console.log(`[SMS MOCK] To: ${to} | ${message.slice(0, 80)}`)
    if (notifId) await logDelivery(notifId, 'sms', 'mock', null)
    return { success: true, mock: true }
  }

  const phone = normalizePhone(to)
  if (!phone) return { success: false, error: 'Invalid phone' }

  try {
    const params = new URLSearchParams({
      authkey: MSG91_AUTH_KEY,
      mobiles: phone,
      message: message.slice(0, 160),
      sender: MSG91_SENDER_ID,
      route: '4',
    })
    const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${params}`)
    const text = await res.text()
    if (notifId) await logDelivery(notifId, 'sms', res.ok ? 'sent' : 'failed', text)
    return { success: res.ok, data: text }
  } catch (err) {
    console.error('[SMS Error]', err.message)
    if (notifId) await logDelivery(notifId, 'sms', 'failed', err.message)
    return { success: false, error: err.message }
  }
}

async function logDelivery(notifId, channel, status, externalId) {
  try {
    await prisma.$executeRaw`
      INSERT INTO notification_delivery_log (notif_id, channel, status, external_id)
      VALUES (${notifId}::uuid, ${channel}, ${status}, ${externalId?.toString() || null})
    `
  } catch (e) { /* non-critical */ }
}

function normalizePhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length > 10) return digits
  return null
}
