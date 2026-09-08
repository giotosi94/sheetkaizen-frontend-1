import GenericStepData from './GenericStepData'
import { ScrapDefineStep } from './routes/processScrapReduction'

const COMPONENT_REGISTRY = {
  scrap_baseline: ScrapDefineStep,
}

export function getStepComponent(componente) {
  return COMPONENT_REGISTRY[componente] || GenericStepData
}
