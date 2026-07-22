import { processImageFile, type ProcessedImageResult } from '../../../shared/utils/process-image-file';

export async function processStoreLogo(file: File): Promise<ProcessedImageResult> {
  return processImageFile(file, {
    inputLimitBytes: 1024 * 1024,
    outputLimitBytes: 150 * 1024,
    targetWidth: 1024,
    targetHeight: 1024,
    resizeMode: 'contain',
    preserveAspectRatioCanvas: true,
    outputMimeType: 'image/webp',
    outputQuality: 0.88,
    minQuality: 0.5,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a logo da loja.',
    invalidImageMessage: 'A logo da loja enviada é inválida.',
    canvasErrorMessage: 'Não foi possível preparar a logo da loja.',
    convertErrorMessage: 'Não foi possível converter a logo da loja.',
    outputLimitErrorMessage: 'A logo processada excedeu o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar a logo da loja.',
  });
}
