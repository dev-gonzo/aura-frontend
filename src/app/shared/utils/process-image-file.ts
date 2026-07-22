export interface ProcessImageOptions {
  inputLimitBytes: number;
  outputLimitBytes: number;
  targetWidth: number;
  targetHeight: number;
  resizeMode?: 'cover' | 'contain';
  preserveAspectRatioCanvas?: boolean;
  outputMimeType: 'image/webp';
  outputQuality: number;
  minQuality: number;
  qualityStep: number;
  readErrorMessage: string;
  invalidImageMessage: string;
  canvasErrorMessage: string;
  convertErrorMessage: string;
  outputLimitErrorMessage: string;
  serializeErrorMessage: string;
}

export interface ProcessedImageResult {
  previewUrl: string;
  payload: {
    base64: string;
    mime: 'image/webp';
    largura: number;
    altura: number;
    tamanho_bytes: number;
    hash_sha256: string;
  };
}

export async function processImageFile(
  file: File,
  options: ProcessImageOptions
): Promise<ProcessedImageResult> {
  if (file.size > options.inputLimitBytes) {
    throw new Error(
      `A imagem original deve ter no máximo ${formatBytes(options.inputLimitBytes)}.`
    );
  }

  const image = await loadImage(file, options);
  const useContain = (options.resizeMode ?? 'cover') === 'contain';
  const containRect = useContain
    ? resolveContainRect(
        image.width,
        image.height,
        options.targetWidth,
        options.targetHeight
      )
    : null;
  const canvas = document.createElement('canvas');
  canvas.width = options.preserveAspectRatioCanvas && containRect
    ? containRect.width
    : options.targetWidth;
  canvas.height = options.preserveAspectRatioCanvas && containRect
    ? containRect.height
    : options.targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(options.canvasErrorMessage);
  }

  if (useContain) {
    const destinationRect = containRect ?? {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
    context.drawImage(
      image,
      options.preserveAspectRatioCanvas ? 0 : destinationRect.x,
      options.preserveAspectRatioCanvas ? 0 : destinationRect.y,
      options.preserveAspectRatioCanvas ? canvas.width : destinationRect.width,
      options.preserveAspectRatioCanvas ? canvas.height : destinationRect.height
    );
  } else {
    const sourceRect = resolveSourceRect(
      image.width,
      image.height,
      options.targetWidth,
      options.targetHeight
    );

    context.drawImage(
      image,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      0,
      0,
      options.targetWidth,
      options.targetHeight
    );
  }

  let quality = options.outputQuality;
  let blob = await toWebpBlob(canvas, quality, options);

  while (blob.size > options.outputLimitBytes && quality > options.minQuality) {
    quality = Math.max(options.minQuality, quality - options.qualityStep);
    blob = await toWebpBlob(canvas, quality, options);
  }

  if (blob.size > options.outputLimitBytes) {
    throw new Error(options.outputLimitErrorMessage);
  }

  const base64 = await blobToBase64(blob, options);
  const hashSha256 = await sha256FromBase64(base64);

  return {
    previewUrl: `data:${options.outputMimeType};base64,${base64}`,
    payload: {
      base64,
      mime: options.outputMimeType,
      largura: canvas.width,
      altura: canvas.height,
      tamanho_bytes: blob.size,
      hash_sha256: hashSha256,
    },
  };
}

function loadImage(file: File, options: ProcessImageOptions): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(options.readErrorMessage));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(options.invalidImageMessage));
      image.onload = () => resolve(image);
      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function toWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number,
  options: ProcessImageOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(options.convertErrorMessage));
          return;
        }

        resolve(blob);
      },
      options.outputMimeType,
      quality
    );
  });
}

function blobToBase64(blob: Blob, options: ProcessImageOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(options.serializeErrorMessage));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(',')[1] ?? '');
    };

    reader.readAsDataURL(blob);
  });
}

async function sha256FromBase64(base64: string): Promise<string> {
  const binary = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const digest = await crypto.subtle.digest('SHA-256', binary);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveSourceRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { x: number; y: number; width: number; height: number } {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (Math.abs(sourceRatio - targetRatio) < 0.001) {
    return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  }

  if (sourceRatio > targetRatio) {
    const croppedWidth = sourceHeight * targetRatio;
    return {
      x: (sourceWidth - croppedWidth) / 2,
      y: 0,
      width: croppedWidth,
      height: sourceHeight,
    };
  }

  const croppedHeight = sourceWidth / targetRatio;
  return {
    x: 0,
    y: (sourceHeight - croppedHeight) / 2,
    width: sourceWidth,
    height: croppedHeight,
  };
}

function resolveContainRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  return {
    x: Math.round((targetWidth - width) / 2),
    y: Math.round((targetHeight - height) / 2),
    width,
    height,
  };
}
