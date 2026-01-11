import { defineStore } from 'pinia'
import { ref } from 'vue'

export default defineStore('VfiSettingConfig', () => {
  const useVfi = ref(false)
  const VfiMethodValue = ref('Rife')

  // Freeze / stutter repair (for duplicated frames)
  const useFreezeRepair = ref(false)
  const FreezeDetectExactValue = ref(false)
  const FreezeDetectNoiseValue = ref(0.003)
  const FreezeDetectMinFramesValue = ref(2)
  const FreezeDetectMaxFramesValue = ref(8)

  const RifeInferenceValue = ref('Cuda')
  const RifeModelValue = ref('v4_0')
  const RifeScaleValue = ref(1.0)
  const RifeMultiValue = ref(120)
  const RifeEnsembleValue = ref(false)
  const RifeDetectionValue = ref(0.5)

  const Vfi_numstreams = ref('1')
  const Vfi_cudagraph = ref(false)

  return {
    useVfi,
    VfiMethodValue,
    useFreezeRepair,
    FreezeDetectExactValue,
    FreezeDetectNoiseValue,
    FreezeDetectMinFramesValue,
    FreezeDetectMaxFramesValue,
    RifeInferenceValue,
    RifeModelValue,
    RifeScaleValue,
    RifeMultiValue,
    RifeEnsembleValue,
    RifeDetectionValue,
    Vfi_numstreams,
    Vfi_cudagraph,
  }
}, {
  persist: true,
})
