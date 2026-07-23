import { processImageFile, type ProcessedImageResult } from '../../../shared/utils/process-image-file';

export async function processStoreBannerDesktop(file: File): Promise<ProcessedImageResult> {
  return processImageFile(file, {
    inputLimitBytes: 2 * 1024 * 1024,
    outputLimitBytes: 350 * 1024,
    targetWidth: 1600,
    targetHeight: 560,
    resizeMode: 'cover',
    outputMimeType: 'image/webp',
    outputQuality: 0.86,
    minQuality: 0.5,
    qualityStep: 0.06,
    readErrorMessage: 'Não foi possível ler o banner desktop.',
    invalidImageMessage: 'O banner desktop enviado é inválido.',
    canvasErrorMessage: 'Não foi possível preparar o banner desktop.',
    convertErrorMessage: 'Não foi possível converter o banner desktop.',
    outputLimitErrorMessage: 'O banner desktop processado excedeu o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar o banner desktop.',
  });
}
