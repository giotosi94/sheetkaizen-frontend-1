import GenericStepData from './GenericStepData'

const COMPONENT_REGISTRY = {}

export function getStepComponent(componente) {
  return COMPONENT_REGISTRY[componente] || GenericStepData
}
