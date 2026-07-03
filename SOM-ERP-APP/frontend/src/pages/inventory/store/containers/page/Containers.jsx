import { useState } from 'react'
import './Containers.css'
import { BackButton } from '../../../../../components/ui'
import ContainerList from '../components/container-list/ContainerList.jsx'
import CreateContainer from '../components/create-container/CreateContainer.jsx'

const TABS = ['All Containers', 'Create Container']

export default function Containers() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Container Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create containers for raw materials · Track stock levels
            </p>
          </div>
          <BackButton />
        </div>
        <div className="flex gap-0 border-b border-gray-200">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                tab === i ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 && <ContainerList />}
        {tab === 1 && <CreateContainer onCreated={() => setTab(0)} />}
      </div>
    </div>
  )
}
