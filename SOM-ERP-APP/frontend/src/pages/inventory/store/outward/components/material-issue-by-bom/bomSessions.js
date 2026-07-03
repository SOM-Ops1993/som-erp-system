// Shared localStorage-backed session store for BOM issuance —
// used by both the active issuing screen and the BOM Issued history page.
const SESSIONS_KEY = 'bom_issue_sessions'

export const readSessions  = () => { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] } }
export const writeSessions = (list) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(list))
export const saveSession   = (s) => { const all = readSessions(); const i = all.findIndex(x => x.id === s.id); if (i >= 0) all[i] = s; else all.push(s); writeSessions(all) }
export const deleteSession = (id) => writeSessions(readSessions().filter(s => s.id !== id))
