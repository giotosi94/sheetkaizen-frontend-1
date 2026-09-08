export default function GenericStepData({ step, stepData, onChange }) {
  const dati = stepData?.dati || {}

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm text-gray-500 mb-3">
        Componente dati per questo step non ancora implementato
        {step?.componente ? ` (${step.componente})` : ''}.
      </div>
      <label className="block text-sm font-medium mb-1">Note dati</label>
      <textarea
        rows={5}
        value={dati.note || ''}
        onChange={(e) => onChange({ dati: { ...dati, note: e.target.value } })}
        className="w-full border rounded-lg px-3 py-2 text-sm"
        placeholder="Inserisci qui i dati dello step..."
      />
    </div>
  )
}
