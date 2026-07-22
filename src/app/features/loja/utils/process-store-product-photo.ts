import { processImageFile, type ProcessedImageResult } from '../../../shared/utils/process-image-file';

export async function processStoreProductPhoto(file: File): Promise<ProcessedImageResult> {
  return processImageFile(file, {
    inputLimitBytes: 2 * 1024 * 1024,
    outputLimitBytes: 220 * 1024,
    targetWidth: 1200,
    targetHeight: 1600,
    outputMimeType: 'image/webp',
    outputQuality: 0.9,
    minQuality: 0.55,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a foto do produto.',
    invalidImageMessage: 'A foto do produto enviada é inválida.',
    canvasErrorMessage: 'Não foi possível preparar a foto do produto.',
    convertErrorMessage: 'Não foi possível converter a foto do produto.',
    outputLimitErrorMessage: 'A foto processada excedeu o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar a foto do produto.',
  });
}
