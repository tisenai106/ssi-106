self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icons/logo_ssi.png', // Coloque um ícone seu na pasta public/icons
      badge: '/icons/logo_ssi.png', // Ícone pequeno monocromático
      data: {
        url: data.url || '/',
      },
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})