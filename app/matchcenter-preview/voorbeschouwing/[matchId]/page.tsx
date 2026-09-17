"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

type Content = {
  title: string;
  intro: string;
  quickFacts: Array<{ label: string; value: string }>;
  patterns: Array<{ title: string; text: string }>;
  recentFormSummary: string;
  styleAnalysis: string;
  dangers: Array<{ title: string; text: string }>;
  pressurePoints: Array<{ title: string; text: string }>;
  caveat: string;
  sources: string[];
};

type Preview = {
  id: string;
  match_id: number;
  content: Content;
  model: string;
  generated_at: string;
  updated_at: string;
  is_published: boolean;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Je sessie is verlopen.");
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function AiMatchPreviewPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const headers = await authHeaders();
        const response = await fetch(`/api/admin/match-preview/${matchId}`, { headers, cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Voorbeschouwing laden mislukt.");
        if (active) setPreview(json.preview ?? null);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Voorbeschouwing laden mislukt.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [matchId]);

  async function generate() {
    try {
      setGenerating(true);
      setError("");
      const headers = await authHeaders();
      const response = await fetch(`/api/admin/match-preview/${matchId}`, {
        method: "POST",
        headers,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Genereren mislukt.");
      setPreview(json.preview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Genereren mislukt.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="ai-match-preview-page">
      <header className="ai-match-preview-topbar">
        <Link href="/matchcenter-preview" className="matchcenter-preview-back">‹</Link>
        <div><p>Admin preview</p><h1>AI Voorbeschouwing</h1></div>
        <span className="matchcenter-preview-badge">AI</span>
      </header>

      {loading ? <div className="matchcenter-preview-loading">Voorbeschouwing laden…</div> : null}
      {error ? <div className="ai-match-preview-error">{error}</div> : null}

      {!loading && !preview ? (
        <section className="ai-match-preview-empty">
          <span>🤖</span>
          <h2>Nog geen voorbeschouwing</h2>
          <p>Laat AI een feitelijke wedstrijdanalyse maken op basis van de officiële RBFA-data.</p>
          <button onClick={generate} disabled={generating}>
            {generating ? "Bezig met analyseren…" : "Voorbeschouwing genereren"}
          </button>
          <small>De tekst wordt als concept opgeslagen en is nog niet zichtbaar voor supporters.</small>
        </section>
      ) : null}

      {preview ? (
        <article className="ai-match-preview-document">
          <div className="ai-match-preview-document-head">
            <div><p>WEDSTRIJDVOORBESCHOUWING · AI CONCEPT</p><h2>{preview.content.title}</h2></div>
            <button onClick={generate} disabled={generating}>{generating ? "Analyseren…" : "Opnieuw genereren"}</button>
          </div>

          <p className="ai-match-preview-intro">{preview.content.intro}</p>

          <section className="ai-match-preview-facts">
            {preview.content.quickFacts.map((item) => (
              <div key={`${item.label}-${item.value}`}><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </section>

          {preview.content.patterns.length ? <section className="ai-match-preview-section"><h3>Opvallende patronen</h3>
            <div className="ai-match-preview-cards">{preview.content.patterns.map((item, i) => <div key={i}><span>VENSTER {i + 1}</span><strong>{item.title}</strong><p>{item.text}</p></div>)}</div>
          </section> : null}

          <section className="ai-match-preview-section"><h3>Recente vorm</h3><p>{preview.content.recentFormSummary}</p></section>
          <section className="ai-match-preview-section"><h3>Hoe de cijfers het wedstrijdbeeld schetsen</h3><p>{preview.content.styleAnalysis}</p></section>

          <div className="ai-match-preview-two-columns">
            <section><h3>Gevaarlijk / aandachtspunten</h3>{preview.content.dangers.map((item, i) => <div className="ai-match-preview-listitem" key={i}><strong>{item.title}</strong><p>{item.text}</p></div>)}</section>
            <section><h3>Onder druk</h3>{preview.content.pressurePoints.map((item, i) => <div className="ai-match-preview-listitem" key={i}><strong>{item.title}</strong><p>{item.text}</p></div>)}</section>
          </div>

          <aside className="ai-match-preview-caveat"><strong>Databeperking</strong><p>{preview.content.caveat}</p></aside>
          <footer className="ai-match-preview-sources"><strong>Bronnen</strong>{preview.content.sources.map((item, i) => <span key={i}>{item}</span>)}<small>Gegenereerd {new Date(preview.generated_at).toLocaleString("nl-BE")} · {preview.model}</small></footer>
        </article>
      ) : null}
    </main>
  );
}
