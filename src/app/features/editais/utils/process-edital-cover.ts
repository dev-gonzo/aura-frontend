import {
  ProcessedImageResult,
  processImageFile,
} from '../../../shared/utils/process-image-file';

export type ProcessedEditalCover = ProcessedImageResult;

export async function processEditalCover(file: File): Promise<ProcessedEditalCover> {
  return processImageFile(file, {
    inputLimitBytes: 1024 * 1024,
    outputLimitBytes: 150 * 1024,
    targetWidth: 1024,
    targetHeight: 1024,
    outputMimeType: 'image/webp',
    outputQuality: 0.95,
    minQuality: 0.3,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a arte de capa enviada.',
    invalidImageMessage: 'Arquivo de imagem inválido para a arte de capa.',
    canvasErrorMessage: 'Não foi possível processar a arte de capa.',
    convertErrorMessage: 'Não foi possível converter a arte de capa para WebP.',
    outputLimitErrorMessage: 'Não foi possível reduzir a arte de capa para 150 KB.',
    serializeErrorMessage: 'Não foi possível serializar a arte de capa processada.',
  });
}
