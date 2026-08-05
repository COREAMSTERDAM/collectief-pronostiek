import { supabase } from "@/src/lib/supabase";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "denied"
  | "granted";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4,
  );
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0),
    ),
  );
}

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(
      "Je moet aangemeld zijn om meldingen te beheren.",
    );
  }

  return session.access_token;
}

export function getPushPermissionState(): PushPermissionState {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function registerPushServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "Service workers worden niet ondersteund op dit toestel.",
    );
  }

  const registration =
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

  await navigator.serviceWorker.ready;

  return registration;
}

export async function enableCommunityPush() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY is niet ingesteld.",
    );
  }

  const registration =
    await registerPushServiceWorker();

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Meldingen zijn geblokkeerd in je browserinstellingen."
        : "Toestemming voor meldingen werd niet gegeven.",
    );
  }

  const existingSubscription =
    await registration.pushManager.getSubscription();

  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey:
        urlBase64ToUint8Array(publicKey),
    }));

  const accessToken = await getAccessToken();

  const response = await fetch(
    "/api/community/push/subscription",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    },
  );

  const payload = (await response.json()) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error ??
        "Het pushabonnement kon niet worden opgeslagen.",
    );
  }

  return subscription;
}

export async function disableCommunityPush() {
  const registration =
    await navigator.serviceWorker.getRegistration("/");

  const subscription =
    await registration?.pushManager.getSubscription();

  const accessToken = await getAccessToken();

  if (subscription) {
    const response = await fetch(
      "/api/community/push/subscription",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: string;
      };

      throw new Error(
        payload.error ??
          "Het pushabonnement kon niet worden verwijderd.",
      );
    }

    await subscription.unsubscribe();
  }
}

export async function hasActivePushSubscription() {
  if (getPushPermissionState() !== "granted") {
    return false;
  }

  const registration =
    await navigator.serviceWorker.getRegistration("/");

  return Boolean(
    await registration?.pushManager.getSubscription(),
  );
}
