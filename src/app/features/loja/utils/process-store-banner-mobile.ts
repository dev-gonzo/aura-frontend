import { processImageFile, type ProcessedImageResult } from '../../../shared/utils/process-image-file';

export async function processStoreBannerMobile(file: File): Promise<ProcessedImageResult> {
  return processImageFile(file, {
    inputLimitBytes: 2 * 1024 * 1024,
    outputLimitBytes: 320 * 1024,
    targetWidth: 1080,
    targetHeight: 1440,
    resizeMode: 'contain',
    outputMimeType: 'image/webp',
    outputQuality: 0.86,
    minQuality: 0.5,
    qualityStep: 0.06,
    readErrorMessage: 'Não foi possível ler o banner mobile.',
    invalidImageMessage: 'O banner mobile enviado é inválido.',
    canvasErrorMessage: 'Não foi possível preparar o banner mobile.',
    convertErrorMessage: 'Não foi possível converter o banner mobile.',
    outputLimitErrorMessage: 'O banner mobile processado excedeu o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar o banner mobile.',
  });
}
