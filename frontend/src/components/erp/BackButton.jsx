import { useNavigate } from 'react-router-dom'

export default function BackButton({ label = 'Back' }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(-1)}
      className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                 bg-white border border-gray-200 shadow-sm
                 text-sm font-medium text-gray-600
                 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow
                 active:scale-95
                 transition-all duration-150"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors duration-150 group-hover:-translate-x-0.5 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      {label}
    </button>
  )
}
