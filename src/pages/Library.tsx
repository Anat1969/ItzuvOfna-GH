import { useEffect, useRef, useState } from 'react'
import { SALONS, can, type User } from '../data'
import { api, getKey, setKey, type RemoteModel } from '../api'
import { cutout, fileToDataUrl } from '../imaging'

interface Draft {
  key: string; file: string; name: string; remove: boolean; tolerance: number
  out?: { dataUrl: string; aspect: number; cutout: boolean }; busy: boolean; state: 'new' | 'saving' | 'saved' | 'error'; err?: string
}

const SIZES = [34, 36, 38, 40, 42, 44, 46]
const nameFrom = (f: string) => f.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 40) || 'דגם'
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

  const reload = () => api.models().then(setModels).catch(e => setErr(e.message))
  useEffect(() => { reload(); api.health().then(h => setKeyOk(h.keyOk)).catch(() => setKeyOk(false)) }, [])

  const collections = [...new Set(models.map(m => m.collection))]
  const allowed = can(user, 'catalog')

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    const fresh: Draft[] = await Promise.all(list.map(async f => ({ key: Math.random().toString(36).slice(2), file: await fileToDataUrl(f), name: nameFrom(f.name), remove: true, tolerance: 38, busy: true, state: 'new' as const })))
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
        <p className="lead">הרקע נחתך אוטומטית כשהצילום על רקע אחיד. אפשר לכוונן לפני שמירה.</p>
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
                <label className="check mini"><input type="checkbox" checked={d.remove} onChange={e => tweak(d.key, { remove: e.target.checked })} /><span>חיתוך רקע</span></label>
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
        <h2>במאגר: <b>{models.length}</b> דגמים ב-<b>{collections.length}</b> קולקציות</h2>
        {err && <p className="deny">{err}</p>}
        {models.length === 0 && <p className="muted">עדיין אין דגמים שהועלו. דגמי ההדגמה המאוירים ממשיכים להופיע בסטודיו.</p>}
        {collections.map(c => (
          <div key={c} className="col-row">
            <h3>{c} <span className="muted">· {models.filter(m => m.collection === c).length}</span></h3>
            <ul className="shelf-grid">
              {models.filter(m => m.collection === c).map(m => (
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
    </div>
  )
}
