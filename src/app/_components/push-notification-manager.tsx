'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/_components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

// Função auxiliar para converter a chave pública
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState(
    typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  );

  useEffect(() => {
    if (isSupported) {
      // Regista o Service Worker
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, [isSupported]);
  const subscribeToPush = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      // Envia para o nosso backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });

      setIsSubscribed(true);
      toast.success('Notificações ativadas!');
    } catch (error) {
      console.error(error);
      toast.error(
        'Erro ao ativar notificações. Verifique as permissões do navegador.',
      );
    }
  };

  if (!isSupported) return null;

  if (isSubscribed) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-full text-green-600"
        disabled
      >
        <Bell className="h-5 w-5" />
        <span className="hidden sm:inline">Notificações Ativas</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={subscribeToPush}
      className="h-full"
    >
      <BellOff className="h-5 w-5" />
      <span className="hidden sm:inline">Ativar Notificações</span>
    </Button>
  );
}
