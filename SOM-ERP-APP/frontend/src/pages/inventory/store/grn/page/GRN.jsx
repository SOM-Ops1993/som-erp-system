import { useState, useEffect } from 'react'
import './GRN.css'
import { grnApi } from '../../../../../api/inventory.js'
import { ErrorModal } from '../../../../../components/ui'
import GrnList   from '../components/grn-list/GrnList.jsx'
import GrnDetail from '../components/grn-detail/GrnDetail.jsx'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function GRN() {
  const [list,          setList]          = useState([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [detail,        setDetail]        = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errModal, setErrModal] = useState({ open: false, message: '' })

  const filteredGrns = list.filter(grn => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (grn.invoiceNo || '').toLowerCase().includes(q) ||
      (grn.supplier || '').toLowerCase().includes(q) ||
      (grn.items || []).some(i => i.toLowerCase().includes(q))
  })

  useEffect(() => { loadList() }, [])

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await grnApi.list()
      setList(res.data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadDetail = async (grn) => {
    setSelected(grn); setDetail(null); setLoadingDetail(true)
    try {
      const res = await grnApi.detail(grn.invoiceNo, grn.supplier)
      setDetail(res.data)
    } catch (e) { setErrModal({ open: true, message: 'Failed to load GRN: ' + e.message }) }
    setLoadingDetail(false)
  }

  return (
    <div className="flex flex-col h-full grn-layout">
      <div className="flex flex-1 min-h-0">
        <GrnList
          list={filteredGrns}
          loading={loading}
          search={search}
          selected={selected}
          onSearch={setSearch}
          onSelect={loadDetail}
          fmtDate={fmtDate}
        />
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <GrnDetail
            selected={selected}
            detail={detail}
            loading={loadingDetail}
          />
        </div>
      </div>
      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
    </div>
  )
}
