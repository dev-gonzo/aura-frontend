import { ProcessedImageResult, processImageFile } from '../../../shared/utils/process-image-file';

export type ProcessedCmsCardImage = ProcessedImageResult;

export async function processCmsCardImage(file: File): Promise<ProcessedCmsCardImage> {
  return processImageFile(file, {
    inputLimitBytes: 10 * 1024 * 1024,
    outputLimitBytes: 900 * 1024,
    targetWidth: 1080,
    targetHeight: 1080,
    resizeMode: 'contain',
    preserveAspectRatioCanvas: true,
    outputMimeType: 'image/webp',
    outputQuality: 0.7,
    minQuality: 0.35,
    qualityStep: 0.07,
    readErrorMessage: 'Não foi possível ler a imagem enviada.',
    invalidImageMessage: 'Arquivo de imagem inválido.',
    canvasErrorMessage: 'Não foi possível processar a imagem.',
    convertErrorMessage: 'Não foi possível converter a imagem.',
    outputLimitErrorMessage: 'Não foi possível reduzir a imagem para o limite permitido.',
    serializeErrorMessage: 'Não foi possível serializar a imagem processada.',
  });
}

