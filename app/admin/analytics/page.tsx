"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type AnyRow = Record<string, any>;
type Dashboard = {
  kpis?: AnyRow;
  daily?: AnyRow[];
  top_pages?: AnyRow[];
  entry_pages?: AnyRow[];
  exit_pages?: AnyRow[];
  transitions?: AnyRow[];
  features?: AnyRow[];
  hourly?: AnyRow[];
  weekdays?: AnyRow[];
  devices?: AnyRow[];
  browsers?: AnyRow[];
  display_modes?: AnyRow[];
  top_events?: AnyRow[];
  errors?: AnyRow[];
  vitals?: AnyRow[];
  retention?: AnyRow[];
  funnels?: AnyRow[];
  match_engagement?: AnyRow[];
};

const tabs = ["Overzicht", "Pagina's", "Features", "Gedrag", "Performance", "Retentie & export"] as const;
type Tab = (typeof tabs)[number];

function fmt(n: unknown) { return new Intl.NumberFormat("nl-BE").format(Number(n || 0)); }
function duration(seconds: unknown) {
  const s = Math.max(0, Number(seconds || 0));
  if (s < 60) return `${Math.round(s)} sec`;
  const m = Math.floor(s / 60); const rest = Math.round(s % 60);
  return `${m}m ${rest}s`;
}
function pct(n: unknown) { return `${Number(n || 0).toFixed(1)}%`; }
function shortPath(path: string) { return path === "/" ? "Home" : path.replace(/\?.*$/, ""); }

function Bars({ rows, valueKey = "views", labelKey = "day" }: { rows: AnyRow[]; valueKey?: string; labelKey?: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0)));
  return <div className="an-bars">{rows.map((row, i) => <div className="an-bar-col" key={`${row[labelKey]}-${i}`} title={`${row[labelKey]}: ${row[valueKey]}`}>
    <div className="an-bar" style={{ height: `${Math.max(4, (Number(row[valueKey] || 0) / max) * 100)}%` }} />
    <span>{String(row[labelKey] ?? "").slice(5)}</span>
  </div>)}</div>;
}

function Distribution({ rows, labelKey, valueKey = "sessions" }: { rows: AnyRow[]; labelKey: string; valueKey?: string }) {
  const total = rows.reduce((s, r) => s + Number(r[valueKey] || 0), 0) || 1;
  return <div className="an-dist">{rows.map((row, i) => <div key={i} className="an-dist-row">
    <div className="an-dist-label"><strong>{row[labelKey]}</strong><span>{fmt(row[valueKey])}</span></div>
    <div className="an-dist-track"><i style={{ width: `${(Number(row[valueKey] || 0) / total) * 100}%` }} /></div>
  </div>)}</div>;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("Overzicht");
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [previousKpis, setPreviousKpis] = useState<AnyRow>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Je sessie is verlopen.");
    return data.session.access_token;
  }

  async function load() {
    setLoading(true); setError("");
    try {
      const token = await authToken();
      const response = await fetch(`/api/admin/analytics?range=${range}&includeAdmin=${includeAdmin ? 1 : 0}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analytics laden mislukt.");
      setDashboard(body.dashboard || {});
      setPreviousKpis(body.previousKpis || {});
    } catch (e) { setError(e instanceof Error ? e.message : "Analytics laden mislukt."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [range, includeAdmin]);

  async function exportCsv(type: "pages" | "events" | "sessions") {
    try {
      const token = await authToken();
      const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "season" ? 365 : range === "today" ? 1 : 30;
      const response = await fetch(`/api/admin/analytics/export?type=${type}&days=${days}`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Export mislukt.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `analytics-${type}-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert(e instanceof Error ? e.message : "Export mislukt."); }
  }

  const k = dashboard.kpis || {};
  function delta(key: string) {
    const current = Number(k[key] || 0);
    const previous = Number(previousKpis[key] || 0);
    if (!previous) return current ? "+100%" : "—";
    const value = ((current - previous) / previous) * 100;
    return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
  }
  const retentionMatrix = useMemo(() => {
    const map = new Map<string, AnyRow>();
    for (const row of dashboard.retention || []) {
      const key = String(row.cohort_week);
      const current = map.get(key) || { cohort: key, weeks: {} };
      current.weeks[row.week_number] = Number(row.users || 0); map.set(key, current);
    }
    return [...map.values()].slice(0, 8);
  }, [dashboard.retention]);

  return <main className="ucl-page analytics-admin-page"><div className="ucl-container !max-w-7xl">
    <header className="an-header"><div><p className="an-kicker">ADMIN · ANALYTICS</p><h1>App analytics</h1><p>Van pageviews tot retentie, funnels, performance en technische fouten.</p></div>
      <button className="an-refresh" onClick={() => void load()} disabled={loading}>↻ Vernieuwen</button>
    </header>

    <section className="an-toolbar">
      <div className="an-range">{[["today","Vandaag"],["7d","7 dagen"],["30d","30 dagen"],["90d","90 dagen"],["season","Seizoen"]].map(([key,label]) => <button key={key} className={range===key?"active":""} onClick={()=>setRange(key)}>{label}</button>)}</div>
      <label className="an-admin-toggle"><input type="checkbox" checked={includeAdmin} onChange={(e)=>setIncludeAdmin(e.target.checked)} /> Admingebruik meetellen</label>
    </section>

    {error ? <div className="an-error">{error}</div> : null}
    {loading ? <div className="an-loading">Analytics laden…</div> : <>
      <section className="an-kpis">
        <article><span>Actieve gebruikers</span><strong>{fmt(k.active_users)}</strong><small>{fmt(k.new_users)} nieuw · {fmt(k.returning_users)} terugkerend · {delta("active_users")} vs vorige periode</small></article>
        <article><span>Sessies</span><strong>{fmt(k.sessions)}</strong><small>{duration(k.avg_session_seconds)} gemiddeld · {delta("sessions")} vs vorige periode</small></article>
        <article><span>Paginaweergaven</span><strong>{fmt(k.page_views)}</strong><small>{Number(k.pages_per_session || 0).toFixed(2)} pagina's / sessie · {delta("page_views")} vs vorige periode</small></article>
        <article><span>Actieve tijd</span><strong>{duration(k.avg_active_seconds)}</strong><small>Focus + zichtbaar scherm</small></article>
        <article><span>Bounce</span><strong>{pct(k.bounce_rate)}</strong><small>Sessies met 1 pagina</small></article>
        <article><span>Clientfouten</span><strong>{fmt(k.errors)}</strong><small>JS + promise errors</small></article>
      </section>

      <nav className="an-tabs">{tabs.map((item)=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item}</button>)}</nav>

      {tab === "Overzicht" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Gebruik doorheen de tijd</span><h2>Dagelijkse pageviews</h2></div></div><Bars rows={dashboard.daily || []} /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Top</span><h2>Populairste features</h2></div></div><Distribution rows={(dashboard.features||[]).slice(0,8)} labelKey="feature" valueKey="views" /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Toestellen</span><h2>Device mix</h2></div></div><Distribution rows={dashboard.devices||[]} labelKey="device" /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Gebruik</span><h2>PWA vs browser</h2></div></div><Distribution rows={dashboard.display_modes||[]} labelKey="mode" /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Browsers</span><h2>Browsergebruik</h2></div></div><Distribution rows={(dashboard.browsers||[]).slice(0,6)} labelKey="browser" /></section>
      </div> : null}

      {tab === "Pagina's" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Pagina-analyse</span><h2>Meest bekeken pagina's</h2></div></div><div className="an-table-wrap"><table className="an-table"><thead><tr><th>Pagina</th><th>Views</th><th>Gebruikers</th><th>Actieve tijd</th><th>Scroll</th><th>Exit</th></tr></thead><tbody>{(dashboard.top_pages||[]).map((r,i)=><tr key={i}><td>{shortPath(r.path)}</td><td>{fmt(r.views)}</td><td>{fmt(r.users)}</td><td>{duration(r.avg_active_seconds)}</td><td>{pct(r.avg_scroll_pct)}</td><td>{pct(r.exit_rate)}</td></tr>)}</tbody></table></div></section>
        <section className="an-card"><div className="an-card-head"><div><span>Instroom</span><h2>Instappagina's</h2></div></div><Distribution rows={dashboard.entry_pages||[]} labelKey="path" valueKey="count" /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Uitstroom</span><h2>Uitstappagina's</h2></div></div><Distribution rows={dashboard.exit_pages||[]} labelKey="path" valueKey="count" /></section>
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Navigatiepaden</span><h2>Meest gebruikte overgangen</h2></div></div><div className="an-flow-list">{(dashboard.transitions||[]).map((r,i)=><div key={i}><span>{shortPath(r.from_path)}</span><b>→</b><span>{shortPath(r.to_path)}</span><strong>{fmt(r.transitions)}×</strong></div>)}</div></section>
      </div> : null}

      {tab === "Features" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Featuregebruik</span><h2>Wat supporters werkelijk openen</h2></div></div><div className="an-feature-grid">{(dashboard.features||[]).map((r,i)=><article key={i}><span>{r.feature}</span><strong>{fmt(r.users)}</strong><small>gebruikers · {fmt(r.views)} views · {fmt(r.sessions)} sessies</small></article>)}</div></section>
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Funnels</span><h2>Van openen naar actie</h2></div></div><div className="an-funnels">{(dashboard.funnels||[]).map((r,i)=>{const a=Number(r.opened||0),b=Number(r.detail||0),c=Number(r.conversion||0); return <article key={i}><h3>{r.feature}</h3><div><span>Open</span><strong>{a}</strong></div><div><span>Detail</span><strong>{b} <small>{a?Math.round(b/a*100):0}%</small></strong></div><div><span>Actie</span><strong>{c} <small>{b?Math.round(c/b*100):0}%</small></strong></div></article>})}</div></section>
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Interacties</span><h2>Meest gebruikte knoppen en events</h2></div></div><div className="an-table-wrap"><table className="an-table"><thead><tr><th>Event</th><th>Label</th><th>Type</th><th>Aantal</th></tr></thead><tbody>{(dashboard.top_events||[]).map((r,i)=><tr key={i}><td>{r.event_name}</td><td>{r.label}</td><td>{r.category||"—"}</td><td>{fmt(r.count)}</td></tr>)}</tbody></table></div></section>
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Wedstrijden</span><h2>Engagement per wedstrijd</h2></div></div><div className="an-table-wrap"><table className="an-table"><thead><tr><th>Wedstrijd</th><th>Datum</th><th>Views</th><th>Gebruikers</th><th>Sessies</th></tr></thead><tbody>{(dashboard.match_engagement||[]).map((r,i)=><tr key={i}><td>{r.home_team} – {r.away_team}</td><td>{r.kickoff ? new Date(r.kickoff).toLocaleDateString("nl-BE") : "—"}</td><td>{fmt(r.views)}</td><td>{fmt(r.users)}</td><td>{fmt(r.sessions)}</td></tr>)}</tbody></table></div></section>
      </div> : null}

      {tab === "Gedrag" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Moment van gebruik</span><h2>Activiteit per uur</h2></div></div><div className="an-hour-grid">{Array.from({length:24},(_,h)=>{const row=(dashboard.hourly||[]).find(r=>Number(r.hour_of_day)===h); const max=Math.max(1,...(dashboard.hourly||[]).map(r=>Number(r.views||0))); return <div key={h} title={`${h}u: ${row?.views||0} views`} style={{opacity:.25+.75*(Number(row?.views||0)/max)}}><strong>{h}</strong><span>{row?.views||0}</span></div>})}</div></section>
        <section className="an-card"><div className="an-card-head"><div><span>Weekritme</span><h2>Dagen van de week</h2></div></div><Distribution rows={(dashboard.weekdays||[]).map(r=>({...r,day:["","Ma","Di","Wo","Do","Vr","Za","Zo"][r.dow]}))} labelKey="day" valueKey="views" /></section>
        <section className="an-card"><div className="an-card-head"><div><span>Terugkeer</span><h2>Nieuw vs terugkerend</h2></div></div><Distribution rows={[{label:"Nieuw",value:k.new_users||0},{label:"Terugkerend",value:k.returning_users||0}]} labelKey="label" valueKey="value" /></section>
      </div> : null}

      {tab === "Performance" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Core Web Vitals</span><h2>Performance van de app</h2></div></div><div className="an-vitals">{(dashboard.vitals||[]).map((r,i)=><article key={i}><span>{r.name}</span><strong>{Number(r.p75||0).toFixed(r.name==="CLS"?3:0)}</strong><small>P75 · gem. {Number(r.average||0).toFixed(r.name==="CLS"?3:0)} · {fmt(r.samples)} metingen</small></article>)}</div></section>
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Problemen</span><h2>Clientfouten</h2></div></div>{(dashboard.errors||[]).length ? <div className="an-table-wrap"><table className="an-table"><thead><tr><th>Pagina</th><th>Melding</th><th>Aantal</th></tr></thead><tbody>{(dashboard.errors||[]).map((r,i)=><tr key={i}><td>{shortPath(r.path)}</td><td>{r.message}</td><td>{fmt(r.count)}</td></tr>)}</tbody></table></div> : <p className="an-empty">Geen clientfouten in deze periode.</p>}</section>
      </div> : null}

      {tab === "Retentie & export" ? <div className="an-grid">
        <section className="an-card an-wide"><div className="an-card-head"><div><span>Cohorten</span><h2>Wekelijkse retentie</h2></div></div><div className="an-table-wrap"><table className="an-table"><thead><tr><th>Cohort</th><th>Week 0</th><th>Week 1</th><th>Week 2</th><th>Week 3</th><th>Week 4</th></tr></thead><tbody>{retentionMatrix.map((r,i)=>{const base=Number(r.weeks[0]||0); return <tr key={i}><td>{String(r.cohort).slice(0,10)}</td>{[0,1,2,3,4].map(w=><td key={w}>{fmt(r.weeks[w]||0)}{w>0&&base?<small className="an-ret-pct"> {Math.round(Number(r.weeks[w]||0)/base*100)}%</small>:null}</td>)}</tr>})}</tbody></table></div></section>
        <section className="an-card"><div className="an-card-head"><div><span>Data export</span><h2>CSV downloaden</h2></div></div><div className="an-export"><button onClick={()=>void exportCsv("pages")}>Paginaweergaven CSV</button><button onClick={()=>void exportCsv("sessions")}>Sessies CSV</button><button onClick={()=>void exportCsv("events")}>Events CSV</button></div><p className="an-note">Exports bevatten interne gebruikers-ID's, geen IP-adressen.</p></section>
        <section className="an-card"><div className="an-card-head"><div><span>Bewaring</span><h2>Databeleid</h2></div></div><p className="an-copy">Ruwe analytics worden 400 dagen bewaard. Dagelijkse rollups 800 dagen. De tracker slaat geen IP-adressen op. Gebruik de cronroute dagelijks voor rollups en automatische opschoning.</p></section>
      </div> : null}
    </>}
  </div></main>;
}
