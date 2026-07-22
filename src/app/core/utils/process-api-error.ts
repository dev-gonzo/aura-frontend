export function processApiError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      error?: { message?: string; detail?: string };
      message?: string;
    };

    return (
      candidate.error?.detail ??
      candidate.error?.message ??
      candidate.message ??
      'Nao foi possivel concluir a operacao.'
    );
  }

  return 'Nao foi possivel concluir a operacao.';
}
