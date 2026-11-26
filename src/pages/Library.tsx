import { useEffect, useRef, useState } from 'react'
import { SALONS, can, type User } from '../data'
import { api, getKey, setKey, type RemoteModel } from '../api'
import { cutout, bgUniform, fileToDataUrl } from '../imaging'

interface Draft {
  key: string; file: string; name: string; remove: boolean; tolerance: number; uniform: boolean
  out?: { dataUrl: string; aspect: number; cutout: boolean }; busy: boolean; state: 'new' | 'saving' | 'saved' | 'error'; err?: string
}

const SIZES = [34, 36, 38, 40, 42, 44, 46]
const ugly = /whatsapp|^img[ _-]?\d|^dsc|^image\s|^photo|^\d{6,}/i
const nameFrom = (f: string, n: number) => { const b = f.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40); return !b || ugly.test(b) ? `דגם ${String(n).padStart(2, '0')}` : b }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16)

export default function Library({ user, onChange, log }: { user: User; onChange: () => void; log: (w: string) => void }) {
  const [key, setK] = useState(getKey())
  const [keyOk, setKeyOk] = useState<boolean | null>(null)
  const [models, setModels] = useState<RemoteModel[]>([])
  const [collection, setCollection] = useState('')
  const [salons, setSalons] = useState<string[]>(SALONS.map(s => s.id))
  const [price, setPrice] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [biz, setBiz] = useState({ business: '', whatsapp: '', payUrl: '' })
  const [bizSaved, setBizSaved] = useState(false)
  useEffect(() => { api.settings().then(b => setBiz({ business: b.business || '', whatsapp: b.whatsapp || '', payUrl: b.payUrl || '' })).catch(() => null) }, [])

  const reload = () => api.models().then(setModels).catch(e => setErr(e.message))
  useEffect(() => { reload(); api.health().then(h => setKeyOk(h.keyOk)).catch(() => setKeyOk(false)) }, [])

  const backs = models.filter(m => m.kind === 'background')
  const coll = models.filter(m => m.kind !== 'background')
  const collections = [...new Set(coll.map(m => m.collection))]
  const allowed = can(user, 'catalog')

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    const start = models.filter(m => m.collection === (collection.trim() || 'ללא קולקציה') && m.kind !== 'background').length + drafts.length
    const fresh: Draft[] = await Promise.all(list.map(async (f, i) => { const file = await fileToDataUrl(f); const uniform = await bgUniform(file).catch(() => false); return { key: Math.random().toString(36).slice(2), file, name: nameFrom(f.name, start + i + 1), remove: uniform, uniform, tolerance: 38, busy: true, state: 'new' as const } }))
    setDrafts(d => [...d, ...fresh])
    for (const dr of fresh) process(dr)
  }
  const process = async (dr: Draft) => {
    try {
      const out = await cutout(dr.file, { remove: dr.remove, tolerance: dr.tolerance })
      setDrafts(d => d.map(x => x.key === dr.key ? { ...x, out, busy: false } : x))
    } catch { setDrafts(d => d.map(x => x.key === dr.key ? { ...x, busy: false, state: 'error', err: 'לא הצלחתי לקרוא את התמונה' } : x)) }
  }
  const tweak = (k: string, patch: Partial<Draft>) => {
    setDrafts(d => d.map(x => { if (x.key !== k) return x; const n = { ...x, ...patch, busy: true }; process(n); return n }))
  }

  const saveOne = async (dr: Draft) => {
    if (!dr.out) return
    setDrafts(d => d.map(x => x.key === dr.key ? { ...x, state: 'saving' } : x))
    try {
      const col = collection.trim() || 'ללא קולקציה'
      const id = `sh-${slug(col) || 'col'}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`
      await api.saveModel({ id, name: dr.name, collection: col, sizes: SIZES, salons, retailPrice: Number(price) || 0, aspect: dr.out.aspect, cutout: dr.out.cutout, createdAt: Date.now() }, dr.out.dataUrl)
      setDrafts(d => d.map(x => x.key === dr.key ? { ...x, state: 'saved' } : x))
      log(`דגם נוסף למאגר: ${dr.name} בקולקציה ${col}`)
      return true
    } catch (e: any) {
      setDrafts(d => d.map(x => x.key === dr.key ? { ...x, state: 'error', err: e.message } : x)); return false
    }
  }
  const saveAll = async () => {
    for (const dr of drafts.filter(x => x.state !== 'saved' && x.out)) await saveOne(dr)
    await reload(); onChange()
    setDrafts(d => d.filter(x => x.state !== 'saved'))
  }

  if (!allowed) return (
    <div className="library"><header className="ph"><h1>מאגר הדגמים</h1><p className="deny">העלאת דגמים פתוחה לבעלת הסלון בלבד. החליפי משתמשת בסרגל העליון.</p></header></div>
  )

  return (
    <div className="library">
      <header className="ph">
        <span className="kicker">מאגר הדגמים · נשמר בענן של האפליקציה</span>
        <h1>זורקים תמונה, בוחרים קולקציה, <mark>והדגם מופיע בסטודיו</mark>.</h1>
        <p className="lead">שמלה על רקע אחיד: הרקע נחתך, והשמלה מונחת על תצלום הכלה.<br />שמלה על דוגמנית: נשמרת כמו שהיא, ומוצגת לצד הכלה. הדמיה מלאה של הכלה בשמלה דורשת מנוע AI.</p>
      </header>

      {keyOk !== true && (
        <section className="keybox">
          <span className="lbl">מפתח סטודיו</span>
          <p className="note">פעם אחת בכל מכשיר של הסלון. המפתח נשמר רק במכשיר הזה.</p>
          <div className="row">
            <input type="password" value={key} onChange={e => setK(e.target.value)} placeholder="shiran-..." autoComplete="current-password" />
            <button className="primary" onClick={async () => { setKey(key.trim()); const h = await api.health().catch(() => null); setKeyOk(!!h?.keyOk) }}>אישור</button>
          </div>
          {keyOk === false && key && <p className="deny">המפתח לא תקין.</p>}
        </section>
      )}

      <section className="lib-up">
        <div className="lib-opts">
          <label><span className="lbl">קולקציה</span>
            <input list="cols" value={collection} onChange={e => setCollection(e.target.value)} placeholder="למשל Atelier 2027" />
            <datalist id="cols">{collections.map(c => <option key={c} value={c} />)}</datalist>
          </label>
          <label><span className="lbl">מחיר לצרכן (לא חובה)</span><input inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="₪" /></label>
          <div><span className="lbl">מורשה בסלונים</span>
            <div className="seg">{SALONS.map(s => <button key={s.id} className={salons.includes(s.id) ? 'on' : ''} onClick={() => setSalons(x => x.includes(s.id) ? x.filter(y => y !== s.id) : [...x, s.id])}>{s.name}</button>)}</div>
          </div>
        </div>
        <div className={`drop${over ? ' over' : ''}`} onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) }}>
          <b>גוררים לכאן תמונות של דגמים</b>
          <span>או לוחצים לבחירה. כמה תמונות בבת אחת, JPG או PNG.</span>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => e.target.files && addFiles(e.target.files)} />
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="drafts">
          <div className="row between">
            <h2>{drafts.length} דגמים לפני שמירה · {collection || 'ללא קולקציה'}</h2>
            <button className="primary big" disabled={keyOk !== true || drafts.some(d => d.busy)} onClick={saveAll}>שמירת הכול למאגר</button>
          </div>
          <ul className="draft-grid">
            {drafts.map(d => (
              <li key={d.key} className={d.state}>
                <div className="checker">{d.out ? <img src={d.out.dataUrl} alt="" /> : <span className="muted">מעבד...</span>}</div>
                <input value={d.name} onChange={e => setDrafts(x => x.map(y => y.key === d.key ? { ...y, name: e.target.value } : y))} aria-label="שם הדגם" />
                {!d.uniform && !d.remove && <p className="lib-note">צולם על דוגמנית או ברקע לא אחיד, ולכן נשמר כמו שהוא. בסטודיו יוצג לצד הכלה.</p>}
                <label className="check mini"><input type="checkbox" checked={d.remove} onChange={e => tweak(d.key, { remove: e.target.checked })} /><span>חיתוך רקע{d.uniform ? '' : ' (לא מומלץ)'}</span></label>
                {d.remove && <label className="tol"><span>רגישות</span><input type="range" min={10} max={90} value={d.tolerance} onChange={e => tweak(d.key, { tolerance: +e.target.value })} /></label>}
                <div className="row">
                  {d.state === 'saved' ? <span className="ok">נשמר</span> : <button onClick={async () => { if (await saveOne(d)) { await reload(); onChange() } }} disabled={keyOk !== true || d.busy || d.state === 'saving'}>{d.state === 'saving' ? 'שומר...' : 'שמירה'}</button>}
                  <button className="ghost" onClick={() => setDrafts(x => x.filter(y => y.key !== d.key))}>הסרה</button>
                </div>
                {d.err && <p className="deny">{d.err}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="shelf">
        <h2>במאגר: <b>{coll.length}</b> דגמים ב-<b>{collections.length}</b> קולקציות</h2>
        {err && <p className="deny">{err}</p>}
        {coll.length === 0 && <p className="muted">עדיין אין דגמים. גוררים לכאן את תמונות הקולקציה.</p>}
        {collections.map(c => (
          <div key={c} className="col-row">
            <h3>{c} <span className="muted">· {coll.filter(m => m.collection === c).length}</span></h3>
            <ul className="shelf-grid">
              {coll.filter(m => m.collection === c).map(m => (
                <li key={m.id}>
                  <div className="checker"><img src={m.image} alt={m.name} loading="lazy" /></div>
                  <b>{m.name}</b>
                  <span className="mono muted">{m.id}</span>
                  <button className="x danger" disabled={keyOk !== true} onClick={async () => {
                    if (!confirm(`למחוק את ${m.name} מהמאגר?`)) return
                    try { await api.deleteModel(m.id); log(`דגם נמחק מהמאגר: ${m.name}`); await reload(); onChange() } catch (e: any) { setErr(e.message) }
                  }}>מחיקה</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="shelf biz">
        <h2>הזמנה ותשלום</h2>
        <p className="note">הלקוחה לוחצת "הזמנה" בגלריה שלה, ונפתחת הודעת WhatsApp אלייך עם הדגמים שבחרה. קישור התשלום (Bit, PayBox, PayPal) מופיע לידו.</p>
        <div className="biz-grid">
          <label><span className="lbl">שם העסק</span><input value={biz.business} onChange={e => { setBiz({ ...biz, business: e.target.value }); setBizSaved(false) }} /></label>
          <label><span className="lbl">WhatsApp להזמנות</span><input inputMode="tel" value={biz.whatsapp} onChange={e => { setBiz({ ...biz, whatsapp: e.target.value }); setBizSaved(false) }} placeholder="972501234567" /></label>
          <label><span className="lbl">קישור תשלום</span><input value={biz.payUrl} onChange={e => { setBiz({ ...biz, payUrl: e.target.value }); setBizSaved(false) }} placeholder="https://" /></label>
          <button className="primary" disabled={keyOk !== true} onClick={async () => { try { await api.saveSettings(biz); setBizSaved(true) } catch (er: any) { setErr(er.message) } }}>{bizSaved ? 'נשמר' : 'שמירה'}</button>
        </div>
      </section>

      <section className="shelf">
        <h2>רקעים לנוף · <b>{backs.length}</b></h2>
        <p className="note">תמונות נוף או מקום שלך (חוף, גן, אולם). בסטודיו הלקוחה מוצבת עליהן אוטומטית, לצד רקעי הסטודיו המובנים.</p>
        <label className="btn">העלאת רקעים<input type="file" accept="image/*" multiple hidden disabled={keyOk !== true} onChange={async e => {
          const files = Array.from(e.target.files || []); e.target.value = ''
          for (const f of files) {
            try {
              const out = await cutout(await fileToDataUrl(f), { remove: false, tolerance: 0, maxSide: 2000 })
              await api.saveModel({ id: `bg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: nameFrom(f.name, backs.length + 1).replace('דגם', 'רקע'), collection: 'רקעים', kind: 'background', aspect: out.aspect, cutout: false, createdAt: Date.now() } as any, out.dataUrl)
            } catch (er: any) { setErr(er.message) }
          }
          await reload(); onChange()
        }} /></label>
        <ul className="shelf-grid">{backs.map(m => (
          <li key={m.id}><div className="checker"><img src={m.image} alt={m.name} loading="lazy" /></div><b>{m.name}</b>
            <button className="x danger" disabled={keyOk !== true} onClick={async () => { if (confirm('למחוק את הרקע?')) { await api.deleteModel(m.id).catch(() => null); await reload(); onChange() } }}>מחיקה</button></li>
        ))}</ul>
      </section>
    </div>
  )
}
