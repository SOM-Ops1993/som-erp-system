import './Toast.css'

export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-[13px] font-semibold text-white shadow-xl pointer-events-none
      ${toast.type === 'err' ? 'bg-red-600' : 'bg-gray-900'}`}>
      {toast.msg}
    </div>
  )
}
