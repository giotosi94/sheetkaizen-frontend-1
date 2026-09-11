import GenericStepData from './GenericStepData'
import ScrapBaseline from './routes/processScrapReduction/ScrapBaseline'

const COMPONENT_REGISTRY = {
  scrap_baseline: ScrapBaseline,
}

export function getStepComponent(componente) {
  return COMPONENT_REGISTRY[componente] || GenericStepData
}
