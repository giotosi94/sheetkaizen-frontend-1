import GenericStepData from './GenericStepData'
import ScrapBaseline from './routes/processScrapReduction/ScrapBaseline'
import BasicConditions from './routes/processScrapReduction/BasicConditions'
import ScrapEventRegister from './routes/processScrapReduction/ScrapEventRegister'
import AnomalyAnalysis from './routes/processScrapReduction/AnomalyAnalysis'

const COMPONENT_REGISTRY = {
  scrap_baseline: ScrapBaseline,
  basic_conditions: BasicConditions,
  scrap_event_register: ScrapEventRegister,
  anomaly_analysis: AnomalyAnalysis,
}

export function getStepComponent(componente) {
  return COMPONENT_REGISTRY[componente] || GenericStepData
}
