import { useEffect, useState } from 'react'
import { t, type Lang, type Key } from '../i18n'
import { findModel } from '../data'
import { api, galleryUrl, type Look } from '../api'

const day = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })

export default function Gallery({ lang, g }: { lang: Lang; g: string }) {
  const L = (k: Key) => t(lang, k)
  const [looks, setLooks] = useState<Look[] | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [zoom, setZoom] = useState<Look | null>(null)

  const load = () => api.looks(g).then(l => { setLooks(l); setSel(s => s.filter(u => l.some(x => x.url === u))) }).catch(e => { setErr(e.message); setLooks([]) })
  useEffect(() => { load() }, [g])

  const chosen = (looks ?? []).filter(l => sel.length ? sel.includes(l.url) : true)
  const name = (l: Look) => findModel(l.modelId)?.name ?? l.modelId
  const toggle = (u: string) => setSel(s => s.includes(u) ? s.filter(x => x !== u) : [...s, u])

  const blobs = async () => Promise.all(chosen.map(async (l, i) => {
    const b = await (await fetch(l.url)).blob()
    return new File([b], `shiran-${String(i + 1).padStart(2, '0')}-${name(l).replace(/\s+/g, '-')}.jpg`, { type: b.type || 'image/jpeg' })
  }))

  const download = async () => {
    setBusy('download')
    try {
      for (const f of await blobs()) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
        await new Promise(r => setTimeout(r, 350))
      }
    } catch { setErr(L('gErr')) } finally { setBusy('') }
  }
  const share = async () => {
    setBusy('share')
    try {
      const files = await blobs()
      if (navigator.canShare?.({ files })) await navigator.share({ files, title: 'SHIRAN Bridal Studio' })
      else if (navigator.share) await navigator.share({ title: 'SHIRAN Bridal Studio', url: galleryUrl(g) })
      else window.open(`https://wa.me/?text=${encodeURIComponent(galleryUrl(g))}`, '_blank')
    } catch { /* בוטל */ } finally { setBusy('') }
  }
  const remove = async (urls: string[]) => {
    if (!confirm(L('gConfirm'))) return
    for (const u of urls) await api.deleteLook(g, u).catch(() => null)
    load()
  }

  if (looks === null) return <div className="gallery"><p className="muted">...</p></div>
  const exp = looks.length ? Math.min(...looks.map(l => l.expires)) : 0

  return (
    <div className="gallery">
      <header className="g-head no-print">
        <div>
          <span className="kicker">SHIRAN Bridal Studio</span>
          <h1>{L('gTitle')}</h1>
          <p className="lead">{looks.length ? <>{L('gLead')} <b>{looks.length}</b> · {L('gUntil')} <b>{day(exp)}</b></> : L('gEmpty')}</p>
        </div>
        {looks.length > 0 && (
          <div className="g-actions">
            <span className="lbl">{sel.length ? `${sel.length} ${L('gSelected')}` : L('gAll')}</span>
            <div className="row">
              <button className="primary" onClick={() => window.print()}>{L('gPrint')}</button>
              <button onClick={download} disabled={!!busy}>{busy === 'download' ? '...' : L('gDownload')}</button>
              <button onClick={share} disabled={!!busy}>{busy === 'share' ? '...' : L('gSend')}</button>
              {sel.length > 0 && <button className="ghost" onClick={() => setSel([])}>{L('gClear')}</button>}
            </div>
          </div>
        )}
      </header>
      {err && <p className="deny no-print">{err}</p>}

      <ul className="g-grid no-print">
        {looks.map((l, i) => (
          <li key={l.url} className={sel.includes(l.url) ? 'on' : ''}>
            <button className="g-img" onClick={() => setZoom(l)} aria-label={name(l)}><img src={l.url} alt={name(l)} loading="lazy" /></button>
            <div className="g-cap">
              <label className="check mini"><input type="checkbox" checked={sel.includes(l.url)} onChange={() => toggle(l.url)} /><span><b>{String(i + 1).padStart(2, '0')}</b> {name(l)}{l.engine === 'ai' ? ' · AI' : ''}</span></label>
              <button className="x danger" onClick={() => remove([l.url])}>{L('del')}</button>
            </div>
          </li>
        ))}
      </ul>

      {looks.length > 0 && (
        <footer className="g-foot no-print">
          <p className="disc"><mark>{L('illustration')}.</mark> {L('disclaimer')}</p>
          <button className="danger" onClick={() => remove(looks.map(l => l.url))}>{L('gDeleteAll')}</button>
        </footer>
      )}

      <div className="print-sheet">
        {chosen.map((l, i) => (
          <figure key={l.url}><img src={l.url} alt="" /><figcaption>{String(i + 1).padStart(2, '0')} · {name(l)} · {L('illustration')}</figcaption></figure>
        ))}
      </div>

      {zoom && (
        <div className="g-zoom no-print" onClick={() => setZoom(null)} role="dialog">
          <img src={zoom.url} alt={name(zoom)} />
          <span>{name(zoom)} · {L('gClose')}</span>
        </div>
      )}
    </div>
  )
}
