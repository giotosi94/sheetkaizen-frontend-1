import GenericStepData from './GenericStepData'
import ScrapBaseline from './routes/processScrapReduction/ScrapBaseline'
import BasicConditions from './routes/processScrapReduction/BasicConditions'

const COMPONENT_REGISTRY = {
  scrap_baseline: ScrapBaseline,
  basic_conditions: BasicConditions,
}

export function getStepComponent(componente) {
  return COMPONENT_REGISTRY[componente] || GenericStepData
}
