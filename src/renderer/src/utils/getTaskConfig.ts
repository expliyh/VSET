import type { TaskConfig } from '@shared/type/taskConfig'
import useInputconfigStore from '@renderer/store/InputStore'
import useOutputconfigStore from '@renderer/store/OutputStore'
import useVfisettingconfigStore from '@renderer/store/VfiSettingsStore'
import { buildFFmpegCMD } from '@renderer/utils/getFFmpeg'
import { buildVpyContent } from '@renderer/utils/getVpy'
import { storeToRefs } from 'pinia'

export function buildTaskConfig(): TaskConfig {
  // Input
  const InputConfigStore = useInputconfigStore()
  const { fileList } = storeToRefs(InputConfigStore)
  const fileListNames = fileList.value.map(file => (file.path).replace(/\\/g, '/'))

  // Output
  const OutputConfigStore = useOutputconfigStore()
  const {
    audioContainer,
    isSaveAudio,
    isSaveSubtitle,
    outputFolder,
    videoContainer,
  } = storeToRefs(OutputConfigStore)

  // VFI (freeze repair is per-input, executed in main process)
  const VfiSettingStore = useVfisettingconfigStore()
  const {
    useVfi,
    useFreezeRepair,
    FreezeDetectNoiseValue,
    FreezeDetectMinFramesValue,
    FreezeDetectMaxFramesValue,
  } = storeToRefs(VfiSettingStore)

  return {
    fileList: fileListNames,
    outputFolder: outputFolder.value,
    videoContainer: videoContainer.value,
    audioContainer: audioContainer.value,
    vpyContent: buildVpyContent(),
    ffmpegCMD: buildFFmpegCMD(),
    isSaveAudio: isSaveAudio.value,
    isSaveSubtitle: isSaveSubtitle.value,
    freezeRepair: {
      enabled: Boolean(useVfi.value && useFreezeRepair.value),
      noise: FreezeDetectNoiseValue.value,
      minFrames: FreezeDetectMinFramesValue.value,
      maxFrames: FreezeDetectMaxFramesValue.value,
    },
  }
}
