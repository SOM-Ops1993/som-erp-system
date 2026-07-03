// Tracks which planning tasks have already been picked to start BOM issuance,
// so they drop out of the "select a task" list immediately (independent of the
// bom_issue_sessions lifecycle, which clears once a session is fully issued).
//
// Keyed by the task's own database id (productionTask.id) — NOT by
// productCode/batchRef, because task.productCode is frequently blank (tasks
// created from the BOM Issuance planning form only set productName) and would
// silently fail to match, letting an already-started task reappear in the list.
const KEY = 'bom_issued_task_ids'

export const readIssuedKeys = () => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}

export const markIssued = (taskId) => {
  if (!taskId) return
  const set = readIssuedKeys()
  set.add(taskId)
  localStorage.setItem(KEY, JSON.stringify([...set]))
}
