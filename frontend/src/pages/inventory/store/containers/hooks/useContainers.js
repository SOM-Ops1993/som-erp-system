import { useState, useEffect, useCallback } from 'react'
import { containerApi } from '../../../../../api/inventory.js'

export function useContainers(itemCode) {
  const [containers, setContainers] = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const r = await containerApi.list(itemCode ? { itemCode } : undefined)
      setContainers(r.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [itemCode])

  useEffect(() => { load() }, [load])

  return { containers, loading, error, reload: load }
}
