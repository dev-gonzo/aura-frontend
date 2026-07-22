import {
  ProcessedImageResult,
  processImageFile,
} from '../../../shared/utils/process-image-file';

export interface ProcessedUserPhoto {
  previewUrl: string;
  payload: {
    base64: string;
    mime: 'image/webp';
    largura: 1024;
    altura: 1024;
    tamanho_bytes: number;
    hash_sha256: string;
  };
}

export async function processUserPhoto(file: File): Promise<ProcessedUserPhoto> {
  const processed: ProcessedImageResult = await processImageFile(file, {
    inputLimitBytes: 1024 * 1024,
    outputLimitBytes: 150 * 1024,
    targetWidth: 1024,
    targetHeight: 1024,
    outputMimeType: 'image/webp',
    outputQuality: 0.95,
    minQuality: 0.3,
    qualityStep: 0.08,
    readErrorMessage: 'Não foi possível ler a foto enviada.',
    invalidImageMessage: 'Arquivo de foto inválido.',
    canvasErrorMessage: 'Não foi possível processar a foto.',
    convertErrorMessage: 'Não foi possível converter a foto para WebP.',
    outputLimitErrorMessage: 'Não foi possível reduzir a foto para 150 KB.',
    serializeErrorMessage: 'Não foi possível serializar a foto processada.',
  });

  return {
    previewUrl: processed.previewUrl,
    payload: {
      base64: processed.payload.base64,
      mime: 'image/webp',
      largura: 1024,
      altura: 1024,
      tamanho_bytes: processed.payload.tamanho_bytes,
      hash_sha256: processed.payload.hash_sha256,
    },
  };
}
