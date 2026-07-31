export function processApiError(error: unknown): string {
  if (typeof error === 'string') {
    if (error === 'Failed to fetch') {
      return 'Nao foi possivel acessar o sistema agora. Tente novamente em instantes.';
    }
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      error?: { message?: string; detail?: string };
      message?: string;
      status?: number;
    };

    const detailedMessage = candidate.error?.detail ?? candidate.error?.message;
    if (typeof detailedMessage === 'string' && detailedMessage.trim()) {
      return detailedMessage;
    }

    if (typeof candidate.status === 'number') {
      if (candidate.status === 0) {
        return 'Nao foi possivel conectar ao servidor.';
      }
      if (candidate.status === 400) {
        return 'Nao foi possivel concluir a operacao. Verifique os dados informados.';
      }
      if (candidate.status === 401) {
        return 'Sua sessao expirou. Faca login novamente.';
      }
      if (candidate.status === 403) {
        return 'Voce nao tem permissao para esta acao.';
      }
      if (candidate.status === 404) {
        return 'Nao foi possivel carregar as informacoes agora. Tente novamente.';
      }
      if (candidate.status >= 500) {
        return 'Ocorreu um erro no servidor. Tente novamente.';
      }
    }

    return (
      (typeof candidate.message === 'string' &&
      candidate.message.trim() &&
      !candidate.message.startsWith('Http failure response')
        ? candidate.message
        : undefined) ??
      'Nao foi possivel concluir a operacao.'
    );
  }

  return 'Nao foi possivel concluir a operacao.';
}
