import { processImageFile, type ProcessedImageResult } from '../../../shared/utils/process-image-file';

export async function processStoreFavicon(file: File): Promise<ProcessedImageResult> {
  return processImageFile(file, {
    inputLimitBytes: 512 * 1024,
    outputLimitBytes: 80 * 1024,
    targetWidth: 256,
    targetHeight: 256,
    outputMimeType: 'image/webp',
    outputQuality: 0.86,
    minQuality: 0.5,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler o favicon da loja.',
    invalidImageMessage: 'O favicon enviado é inválido.',
    canvasErrorMessage: 'Não foi possível preparar o favicon da loja.',
    convertErrorMessage: 'Não foi possível converter o favicon da loja.',
    outputLimitErrorMessage: 'O favicon processado excedeu o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar o favicon da loja.',
  });
}
