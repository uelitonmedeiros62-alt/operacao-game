/**
 * Três níveis de aviso, com limites reais:
 * 1. Alertas dentro do app — funcionam sempre que o Dia Leve está aberto.
 * 2. Notificações do sistema — exibidas pelo navegador enquanto o Dia Leve está
 *    aberto (mesmo em outra aba ou minimizado). Dependem de permissão.
 * 3. Notificações com o app fechado — exigem um servidor de push.
 *    NÃO implementado nesta versão (ver services/push.ts).
 */

export type NotificationSupport = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationSupport;
}

/** Deve ser chamado apenas a partir de um toque/clique da pessoa. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as NotificationSupport;
  } catch {
    return notificationSupport();
  }
}

export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationSupport() !== 'granted') return false;
  const options: NotificationOptions = { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png' };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
