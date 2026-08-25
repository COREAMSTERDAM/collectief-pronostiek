"use client";

type PreviewLevel = "guest" | "white_member" | "black_member";

const PREVIEW_STORAGE_KEY = "cwz_admin_membership_preview";

const OPTIONS: Array<{
  key: PreviewLevel;
  label: string;
  description: string;
}> = [
  {
    key: "guest",
    label: "Gast",
    description: "Bekijk de app met de rechten van een gast.",
  },
  {
    key: "white_member",
    label: "White Member",
    description: "Bekijk de app met White Member-rechten.",
  },
  {
    key: "black_member",
    label: "Black Member",
    description: "Bekijk de app met Black Member-rechten.",
  },
];

export default function AdminMembershipPreviewPanel() {
  function startPreview(level: PreviewLevel) {
    window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, level);
    window.location.href = "/";
  }

  function normalAdminView() {
    window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    window.location.href = "/";
  }

  return (
    <section className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-amber-200/70">
            Testweergave
          </p>
          <h2 className="mt-1 text-lg font-black text-white">
            Bekijk de app als member
          </h2>
          <p className="mt-1 text-sm text-white/45">
            Alleen jouw weergave verandert. Je eigen adminrechten en memberships
            worden niet aangepast.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => startPreview(option.key)}
            className="rounded-2xl border border-white/10 bg-black/25 p-3 text-left transition hover:border-amber-300/30 hover:bg-white/[0.05]"
          >
            <span className="block text-sm font-black text-white">
              {option.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-white/40">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={normalAdminView}
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/70"
      >
        Normale adminweergave
      </button>
    </section>
  );
}
