"use client";

import { useAdminLayoutPreview } from "@/src/lib/use-admin-layout-preview";

export default function AdminLayoutPreviewToggle() {
  const { isAdmin, loading, mode, setMode } = useAdminLayoutPreview();

  if (loading || !isAdmin) return null;

  return (
    <div className="admin-layout-toggle" role="group" aria-label="Admin layout kiezen">
      <span className="admin-layout-toggle-label">Admin preview</span>
      <button
        type="button"
        className={mode === "current" ? "is-active" : ""}
        onClick={() => setMode("current")}
      >
        Huidig
      </button>
      <button
        type="button"
        className={mode === "preview" ? "is-active" : ""}
        onClick={() => setMode("preview")}
      >
        Preview
      </button>
    </div>
  );
}
