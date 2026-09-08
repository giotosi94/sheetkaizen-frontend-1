export default function MajorRouteNavigator({ steps, stepsData, activeKey, onSelect }) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-200 flex-wrap">
      <button
        onClick={() => onSelect('overview')}
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
          activeKey === 'overview'
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Overview
      </button>
      {steps.map(step => {
        const sd = stepsData?.[step.step_id] || {}
        const completato = sd.stato === 'completato'
        return (
          <button
            key={step.step_id}
            onClick={() => onSelect(step.step_id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeKey === step.step_id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
              completato ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step.ordine}
            </span>
            {step.titolo}
          </button>
        )
      })}
    </div>
  )
}
