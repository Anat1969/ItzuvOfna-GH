import { useEffect, useState } from 'react'
import { t, type Lang, type Key } from '../i18n'
import { findModel } from '../data'
import { api, galleryUrl, type Look, type Biz } from '../api'
import { Icon, IconBtn } from '../Icon'

const day = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })

// הגלריה של הלקוחה כלוקבוק של בית אופנה: תמונה מובילה בתנועה איטית, טיפוגרפיה סריפית,
// גריד אחיד 3:4, צפייה במסך מלא, ופעולות כאייקונים. לצוות היא נפתחת בתוך האפליקציה (staff).
export default function Gallery({ lang, g, staff, onBack }: { lang: Lang; g: string; staff?: boolean; onBack?: () => void }) {
  const L = (k: Key) => t(lang, k)
  const [looks, setLooks] = useState<Look[] | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [view, setView] = useState<number | null>(null)
  const [auto, setAuto] = useState(false)
  const [hero, setHero] = useState(0)
  const [who, setWho] = useState({ photo: '', name: '' })
  const [biz, setBiz] = useState<Biz>({})
  const [ordered, setOrdered] = useState(false)
  useEffect(() => { api.galleryWho(g).then(setWho).catch(() => null); api.settings().then(setBiz).catch(() => null) }, [g])

  const load = () => api.looks(g).then(l => { setLooks(l); setSel(s => s.filter(u => l.some(x => x.url === u))) }).catch(e => { setErr(e.message); setLooks([]) })
  useEffect(() => { load(); const i = setInterval(load, 6000); return () => clearInterval(i) }, [g]) // זמן אמת
  const n = looks?.length ?? 0
  useEffect(() => { if (n < 2) return; const i = setInterval(() => setHero(h => (h + 1) % n), 5200); return () => clearInterval(i) }, [n])
  useEffect(() => { if (!auto || view === null || n < 2) return; const i = setInterval(() => setView(v => ((v ?? 0) + 1) % n), 2600); return () => clearInterval(i) }, [auto, view, n])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (view === null) return
      if (e.key === 'Escape') setView(null)
      if (e.key === 'ArrowLeft') setView(v => ((v ?? 0) + 1) % n)
      if (e.key === 'ArrowRight') setView(v => ((v ?? 0) - 1 + n) % n)
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [view, n])

  const name = (l: Look) => findModel(l.modelId)?.name ?? 'לוק'
  const chosen = (looks ?? []).filter(l => sel.length ? sel.includes(l.url) : true)
  const toggle = (u: string) => setSel(s => s.includes(u) ? s.filter(x => x !== u) : [...s, u])
  const files = async () => Promise.all(chosen.map(async (l, i) => { const b = await (await fetch(l.url)).blob(); return new File([b], `collection-${String(i + 1).padStart(2, '0')}.jpg`, { type: b.type || 'image/jpeg' }) }))
  const download = async () => {
    setBusy('dl')
    try { for (const f of await files()) { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); await new Promise(r => setTimeout(r, 350)) } }
    catch { setErr(L('gErr')) } finally { setBusy('') }
  }
  const share = async () => {
    setBusy('sh')
    try {
      const fs = await files()
      if (navigator.canShare?.({ files: fs })) await navigator.share({ files: fs, title: 'קולקציה' })
      else if (navigator.share) await navigator.share({ title: 'קולקציה', url: galleryUrl(g) })
      else window.open(`https://wa.me/?text=${encodeURIComponent(galleryUrl(g))}`, '_blank')
    } catch { /* בוטל */ } finally { setBusy('') }
  }
  const order = async () => {
    const items = chosen.map(l => { const m = findModel(l.modelId); return { modelId: l.modelId, name: name(l), price: m?.retailPrice || 0, image: l.url } })
    const seen = new Set<string>(); const uniq = items.filter(x => !seen.has(x.modelId) && seen.add(x.modelId))
    api.createOrder({ g, client: who.name, source: staff ? 'studio' : 'gallery', items: uniq }).then(() => setOrdered(true)).catch(() => null)
    if (biz.whatsapp) {
      const text = `שלום${biz.business ? ' ' + biz.business : ''}, אני רוצה להזמין מהקולקציה:\n${uniq.map((x, i) => `${i + 1}. ${x.name}`).join('\n')}\n\nהגלריה שלי: ${galleryUrl(g)}`
      window.open(`https://wa.me/${biz.whatsapp}?text=${encodeURIComponent(text)}`, '_blank')
    }
  }
  const remove = async (urls: string[]) => { if (!confirm(L('gConfirm'))) return; for (const u of urls) await api.deleteLook(g, u).catch(() => null); load() }

  if (looks === null) return <div className="lb"><p className="lb-wait">...</p></div>
  const exp = n ? Math.min(...looks.map(l => l.expires)) : 0

  return (
    <div className="lb">
      {staff && <div className="lb-staff no-print"><IconBtn icon="right" label="חזרה ללקוחות" onClick={onBack} /><span>צפיית סטודיו · כך הלקוחה רואה את הגלריה</span>
        <IconBtn icon="link" label="העתקת הקישור ללקוחה" onClick={() => navigator.clipboard?.writeText(galleryUrl(g))} /></div>}

      <section className="lb-hero no-print">
        <div className="lb-hero-art">
          {looks.map((l, k) => <div key={l.url} className={`lb-slide${k === hero % Math.max(1, n) ? ' on' : ''}`}><img className="lb-depth" src={l.url} alt="" /><img className="lb-front" src={l.url} alt="" /></div>)}
          {!n && <span className="lb-empty">{L('gEmpty')}</span>}
          {n > 1 && <div className="lb-progress"><i key={hero} /></div>}
          {n > 0 && <span className="lb-count">{String((hero % n) + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>}
        </div>
        <div className="lb-hero-text">
          <span className="lb-kicker">{biz.business || 'קולקציה'} · לוקבוק אישי</span>
          {who.photo && <img className="lb-portrait" src={who.photo} alt="" />}
          <h1 className="lb-name">{who.name || 'הלוקבוק שלך'}</h1>
          <p className="lb-meta">{n} לוקים · {day(Date.now())}{n ? <> · <span className="live">מתעדכן בזמן אמת</span></> : null}</p>
          <div className="lb-rule" />
          <div className="lb-actions">
            <button className="primary" onClick={order} disabled={!n}><Icon name="bag" /> {ordered ? 'ההזמנה נשלחה' : `הזמנה${sel.length ? ` · ${sel.length}` : ''}`}</button>
            {biz.payUrl && <a className="btn" href={biz.payUrl} target="_blank" rel="noreferrer">תשלום</a>}
            <span className="lb-tools">
              <IconBtn icon="check" label={sel.length === n ? 'ביטול בחירה' : 'בחירת הכול'} onClick={() => setSel(sel.length === n ? [] : looks.map(l => l.url))} disabled={!n} />
              <IconBtn icon="download" label={busy === 'dl' ? '...' : 'הורדה'} onClick={download} disabled={!n || !!busy} />
              <IconBtn icon="share" label="שליחה" onClick={share} disabled={!n || !!busy} />
              <IconBtn icon="print" label="הדפסה" onClick={() => window.print()} disabled={!n} />
            </span>
          </div>
          {sel.length > 0 && <p className="lb-sel">{sel.length} נבחרו. הפעולות חלות עליהם.</p>}
          {err && <p className="deny">{err}</p>}
        </div>
      </section>

      {n > 0 && <section className="lb-book no-print">
        <h2 className="lb-h2">הלוקים</h2>
        <ul className="lb-grid">
          {looks.map((l, k) => (
            <li key={l.url} className={sel.includes(l.url) ? 'on' : ''} style={{ ['--k' as string]: k }}>
              <button className="lb-card" onClick={() => setView(k)} aria-label={name(l)}><img src={l.url} alt={name(l)} loading="lazy" /></button>
              <button className={`lb-pick${sel.includes(l.url) ? ' on' : ''}`} aria-label="בחירה" onClick={() => toggle(l.url)}><Icon name="check" size={14} /></button>
              <IconBtn icon="x" label={L('del')} danger className="over-ib lb-del" onClick={() => remove([l.url])} />
              <div className="lb-cap"><span className="lb-num">{String(k + 1).padStart(2, '0')}</span>{name(l)}</div>
            </li>
          ))}
        </ul>
        <footer className="lb-foot">
          <p>{L('illustration')}. {L('disclaimer')} · מחיקה אוטומטית ב-{exp ? day(exp) : ''}</p>
          <button className="lb-wipe" onClick={() => remove(looks.map(l => l.url))}><Icon name="trash" size={14} /> {L('gDeleteAll')}</button>
        </footer>
      </section>}

      <div className="print-sheet">
        {chosen.map((l, i) => <figure key={l.url}><img src={l.url} alt="" /><figcaption>{String(i + 1).padStart(2, '0')} · {name(l)}</figcaption></figure>)}
      </div>

      {view !== null && looks[view] && (
        <div className="lb-view no-print" role="dialog" aria-label={name(looks[view])}>
          <img key={view} src={looks[view].url} alt="" />
          <div className="lb-view-bar">
            <IconBtn icon="right" label="הקודם" onClick={() => setView((view - 1 + n) % n)} />
            <span>{String(view + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} · {name(looks[view])}</span>
            <IconBtn icon="left" label="הבא" onClick={() => setView((view + 1) % n)} />
            <IconBtn icon={auto ? 'pause' : 'play'} label={auto ? 'עצירה' : 'מצגת'} onClick={() => setAuto(a => !a)} />
            <IconBtn icon="x" label="סגירה" onClick={() => { setView(null); setAuto(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}
