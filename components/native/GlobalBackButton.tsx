"use client";

import { usePathname, useRouter } from "next/navigation";

export default function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/" || pathname === "/supportershub-preview") return null;

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <div className="global-back-row">
      <button
        type="button"
        onClick={goBack}
        className="global-back-button"
        aria-label="Ga terug naar de vorige pagina"
      >
        <span aria-hidden="true" className="global-back-button-icon">‹</span>
        <span>Terug</span>
      </button>
    </div>
  );
}
