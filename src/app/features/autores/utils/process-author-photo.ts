import {
  ProcessedImageResult,
  processImageFile,
} from '../../../shared/utils/process-image-file';

export type ProcessedAuthorPhoto = ProcessedImageResult;

export async function processAuthorPhoto(file: File): Promise<ProcessedAuthorPhoto> {
  return processImageFile(file, {
    inputLimitBytes: 1024 * 1024,
    outputLimitBytes: 150 * 1024,
    targetWidth: 1024,
    targetHeight: 1024,
    outputMimeType: 'image/webp',
    outputQuality: 0.95,
    minQuality: 0.3,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a foto do autor.',
    invalidImageMessage: 'Arquivo de foto inválido para o autor.',
    canvasErrorMessage: 'Não foi possível processar a foto do autor.',
    convertErrorMessage: 'Não foi possível converter a foto do autor para WebP.',
    outputLimitErrorMessage: 'Não foi possível reduzir a foto do autor para 150 KB.',
    serializeErrorMessage: 'Não foi possível serializar a foto do autor.',
  });
}
