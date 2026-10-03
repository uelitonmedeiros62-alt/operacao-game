/**
 * Ponto de extensão para notificações com o app fechado (Web Push).
 *
 * Isso exige infraestrutura que esta versão NÃO tem:
 * - um servidor que guarde os lembretes e as inscrições de push;
 * - chaves VAPID (a privada fica só no servidor, nunca no navegador);
 * - tratamento do evento 'push' no service worker.
 *
 * Enquanto isso, o app usa `NoPushProvider` e a interface não exibe nenhum
 * controle de "push", para não parecer que o serviço existe.
 */
export interface PushProvider {
  readonly available: boolean;
  subscribe(): Promise<void>;
  unsubscribe(): Promise<void>;
  /** Envia ao servidor os próximos lembretes a disparar. */
  syncSchedule(reminders: Array<{ key: string; title: string; at: string }>): Promise<void>;
}

export const NoPushProvider: PushProvider = {
  available: false,
  async subscribe() {
    throw new Error('Push não disponível nesta versão.');
  },
  async unsubscribe() {},
  async syncSchedule() {},
};
