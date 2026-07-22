import {
  ProcessedImageResult,
  processImageFile,
} from '../../../shared/utils/process-image-file';

export type ProcessedBookCover = ProcessedImageResult;

export async function processBookCover(file: File): Promise<ProcessedBookCover> {
  return processImageFile(file, {
    inputLimitBytes: 1024 * 1024,
    outputLimitBytes: 150 * 1024,
    targetWidth: 1024,
    targetHeight: 1024,
    outputMimeType: 'image/webp',
    outputQuality: 0.95,
    minQuality: 0.3,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a capa do livro.',
    invalidImageMessage: 'Arquivo de imagem inválido para a capa do livro.',
    canvasErrorMessage: 'Não foi possível processar a capa do livro.',
    convertErrorMessage: 'Não foi possível converter a capa do livro para WebP.',
    outputLimitErrorMessage: 'Não foi possível reduzir a capa do livro para 150 KB.',
    serializeErrorMessage: 'Não foi possível serializar a capa do livro.',
  });
}
