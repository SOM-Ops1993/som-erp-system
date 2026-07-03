import { useState, useCallback } from 'react'
import { SK, lsLoad, lsSave } from '../utils/storage.js'

export function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])
  return { toast, show }
}

export function useTasks() {
  const [tasks, setTasks] = useState(() => lsLoad(SK.tasks))

  const reload = useCallback(() => {
    setTasks(lsLoad(SK.tasks))
  }, [])

  const deleteTask = useCallback((id) => {
    const updated = lsLoad(SK.tasks).filter(t => t.id !== id)
    lsSave(SK.tasks, updated)
    setTasks(updated)
  }, [])

  return { tasks, reload, deleteTask }
}
