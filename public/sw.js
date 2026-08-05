self.addEventListener("push", (event) => {
  let payload = {
    title: "Community",
    body: "Je hebt een nieuw communitybericht.",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: "community-message",
    data: {
      url: "/community",
    },
  };

  try {
    if (event.data) {
      payload = {
        ...payload,
        ...event.data.json(),
      };
    }
  } catch {
    payload.body = event.data?.text() || payload.body;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: payload.renotify ?? true,
      data: payload.data,
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url || "/community";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        return clients.openWindow(targetUrl);
      }),
  );
});
