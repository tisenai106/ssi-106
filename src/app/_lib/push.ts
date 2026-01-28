import webpush from 'web-push';
import db from '@/app/_lib/prisma';

// Configuração única
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification({
  userId,
  title,
  body,
  url,
}: SendPushOptions) {
  try {
    // 1. Buscar todas as subscrições do utilizador (pode ter telemóvel + pc)
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    // 2. Enviar para todos os dispositivos
    const notifications = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({ title, body, url });

      return webpush
        .sendNotification(pushSubscription, payload)
        .catch((err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Se der 410 (Gone), a subscrição já não existe (o user removeu permissão)
            // Devemos apagar do banco para limpar
            console.log('Subscrição inválida, removendo...', sub.id);
            return db.pushSubscription.delete({ where: { id: sub.id } });
          }
          console.error('Erro ao enviar push:', err);
        });
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Erro geral no envio de push:', error);
  }
}
