import { useEffect, useRef, useState } from 'react'
import { SALONS, can, type User } from '../data'
import { api, getKey, setKey, type RemoteModel } from '../api'
import { cutout, bgUniform, fileToDataUrl } from '../imaging'
import { STUDIO, applyBackdrop, type Backdrop } from '../bg'

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
  const [salons] = useState<string[]>(SALONS.map(s => s.id))
  const [price, setPrice] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'models' | 'backs' | 'poses' | 'biz'>('models')
  const [bgCat, setBgCat] = useState('קיר סטודיו')
  const [upgrade, setUpgrade] = useState<{ m: RemoteModel; img?: string; bd?: Backdrop; busy?: boolean } | null>(null)
  const [biz, setBiz] = useState({ business: '', whatsapp: '', payUrl: '', retentionDays: 180 })
  const [bizSaved, setBizSaved] = useState(false)
  useEffect(() => { api.settings().then(b => setBiz({ business: b.business || '', whatsapp: b.whatsapp || '', payUrl: b.payUrl || '', retentionDays: b.retentionDays || 180 })).catch(() => null) }, [])

  const reload = () => api.models().then(setModels).catch(e => setErr(e.message))
  useEffect(() => { reload(); api.health().then(h => setKeyOk(h.keyOk)).catch(() => setKeyOk(false)) }, [])

  const backs = models.filter(m => m.kind === 'background')
  const poses = models.filter(m => m.kind === 'pose')
  const coll = models.filter(m => m.kind !== 'background' && m.kind !== 'pose')
  const collections = [...new Set(coll.map(m => m.collection))]
  const allowed = can(user, 'catalog')
  const CATS = ['חדר סטודיו', 'קיר סטודיו', 'נוף']
  const bgCats = [...new Set([...CATS, ...backs.map(b => b.collection)])]
  // שינוי שם בזמן אמת: נשמר כשיוצאים מהשדה
  const rename = async (m: RemoteModel, name: string) => {
    if (!name.trim() || name === m.name) return
    try { await api.saveModel({ ...m, name: name.trim() }); log(`שם שונה: ${m.name} ← ${name.trim()}`); await reload(); onChange() } catch (e: any) { setErr(e.message) }
  }
  const remove = async (m: RemoteModel) => {
    if (!confirm(`למחוק את ${m.name}?`)) return
    try { await api.deleteModel(m.id); log(`נמחק מהמאגר: ${m.name}`); await reload(); onChange() } catch (e: any) { setErr(e.message) }
  }
  const backdrops: Backdrop[] = [...STUDIO.filter(b => b.kind !== 'original'), ...backs.map(b => ({ id: b.id, label: b.name, kind: 'image' as const, url: b.image, group: b.collection }))]
  const card = (m: RemoteModel, extra?: JSX.Element) => (
    <li key={m.id}>
      <div className="checker"><img src={m.cover || m.image} alt={m.name} loading="lazy" />
        <button className="xs" aria-label="מחיקה" title="מחיקה" disabled={keyOk !== true} onClick={() => remove(m)}>×</button>
      </div>
      <input className="name-edit" defaultValue={m.name} aria-label="שם" onBlur={e => rename(m, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      {extra}
    </li>
  )

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
        <span className="kicker">המאגר · נשמר בענן של האפליקציה</span>
        <h1>הקולקציה והרקעים, <mark>במקום אחד</mark>.</h1>
      </header>

      {keyOk !== true && (
        <section className="keybox">
          <span className="lbl">מפתח סטודיו</span>
          <p className="note">פעם אחת בכל מכשיר. המפתח נשמר רק במכשיר הזה.</p>
          <div className="row">
            <input type="password" value={key} onChange={e => setK(e.target.value)} placeholder="..." autoComplete="current-password" />
            <button className="primary" onClick={async () => { setKey(key.trim()); const h = await api.health().catch(() => null); setKeyOk(!!h?.keyOk) }}>אישור</button>
          </div>
          {keyOk === false && key && <p className="deny">המפתח לא תקין.</p>}
        </section>
      )}

      <nav className="tabs" role="tablist">
        <button role="tab" className={tab === 'models' ? 'on' : ''} onClick={() => setTab('models')}>דגמים · {coll.length}</button>
        <button role="tab" className={tab === 'backs' ? 'on' : ''} onClick={() => setTab('backs')}>רקעים · {backs.length}</button>
        <button role="tab" className={tab === 'poses' ? 'on' : ''} onClick={() => setTab('poses')}>תנוחות · {poses.length}</button>
        <button role="tab" className={tab === 'biz' ? 'on' : ''} onClick={() => setTab('biz')}>העסק</button>
      </nav>
      {err && <p className="deny">{err}</p>}

      {tab === 'models' && <>
        <section className="lib-up">
          <div className="lib-opts">
            <label><span className="lbl">קולקציה</span>
              <input list="cols" value={collection} onChange={e => setCollection(e.target.value)} placeholder="למשל Atelier 2027" />
              <datalist id="cols">{collections.map(c => <option key={c} value={c} />)}</datalist>
            </label>
            <label><span className="lbl">מחיר לצרכן (לא חובה)</span><input inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="₪" /></label>
          </div>
          <div className={`drop${over ? ' over' : ''}`} onClick={() => input.current?.click()}
            onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) }}>
            <b>גוררים לכאן את תמונות הקולקציה</b>
            <span>כמה תמונות בבת אחת. צילום על דוגמנית בחדר מתקבל כמו שהוא.</span>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>
        </section>

        {drafts.length > 0 && (
          <section className="drafts">
            <div className="row between">
              <h2>{drafts.length} לפני שמירה · {collection || 'ללא קולקציה'}</h2>
              <button className="primary big" disabled={keyOk !== true || drafts.some(d => d.busy)} onClick={saveAll}>שמירת הכול</button>
            </div>
            <ul className="draft-grid">
              {drafts.map(d => (
                <li key={d.key} className={d.state}>
                  <div className="checker">{d.out ? <img src={d.out.dataUrl} alt="" /> : <span className="muted">מעבד...</span>}
                    <button className="xs" aria-label="הסרה" onClick={() => setDrafts(x => x.filter(y => y.key !== d.key))}>×</button></div>
                  <input className="name-edit" value={d.name} onChange={e => setDrafts(x => x.map(y => y.key === d.key ? { ...y, name: e.target.value } : y))} aria-label="שם הדגם" />
                  {d.uniform && <label className="check mini"><input type="checkbox" checked={d.remove} onChange={e => tweak(d.key, { remove: e.target.checked })} /><span>חיתוך רקע</span></label>}
                  {d.err && <p className="deny">{d.err}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="shelf">
          {coll.length === 0 && <p className="muted">עדיין אין דגמים. גוררים לכאן את תמונות הקולקציה.</p>}
          {collections.map(c => (
            <div key={c} className="col-row">
              <h3>{c} <span className="muted">· {coll.filter(m => m.collection === c).length}</span></h3>
              <ul className="shelf-grid">
                {coll.filter(m => m.collection === c).map(m => card(m, <button className="ghost small" disabled={keyOk !== true} onClick={() => setUpgrade({ m })}>{m.cover ? 'רקע מגזין · שינוי' : 'רקע מגזין'}</button>))}
              </ul>
            </div>
          ))}
        </section>
      </>}

      {tab === 'backs' && <>
        <section className="lib-up">
          <div className="lib-opts">
            <label><span className="lbl">תיקייה</span>
              <input list="bgcats" value={bgCat} onChange={e => setBgCat(e.target.value)} />
              <datalist id="bgcats">{bgCats.map(c => <option key={c} value={c} />)}</datalist>
            </label>
            <div className="seg wrap">{bgCats.map(c => <button key={c} className={bgCat === c ? 'on' : ''} onClick={() => setBgCat(c)}>{c}</button>)}</div>
          </div>
          <label className="drop">
            <b>גוררים או בוחרים רקעים לתיקייה "{bgCat}"</b>
            <span>חדר סטודיו, קיר סטודיו, נוף, או תיקייה חדשה שתכתבי.</span>
            <input type="file" accept="image/*" multiple hidden disabled={keyOk !== true} onChange={async e => {
              const files = Array.from(e.target.files || []); e.target.value = ''
              for (const [i, f] of files.entries()) {
                try {
                  const out = await cutout(await fileToDataUrl(f), { remove: false, tolerance: 0, maxSide: 2000 })
                  const n = backs.filter(b => b.collection === bgCat).length + i + 1
                  await api.saveModel({ id: `bg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: nameFrom(f.name, n).replace('דגם', bgCat), collection: bgCat.trim() || 'נוף', kind: 'background', aspect: out.aspect, cutout: false, createdAt: Date.now() } as any, out.dataUrl)
                } catch (er: any) { setErr(er.message) }
              }
              await reload(); onChange()
            }} />
          </label>
        </section>
        <section className="shelf">
          {bgCats.filter(c => backs.some(b => b.collection === c)).map(c => (
            <div key={c} className="col-row">
              <h3>{c} <span className="muted">· {backs.filter(b => b.collection === c).length}</span></h3>
              <ul className="shelf-grid wide">{backs.filter(b => b.collection === c).map(m => card(m))}</ul>
            </div>
          ))}
        </section>
      </>}

      {tab === 'poses' && <>
        <section className="lib-up">
          <div className="lib-opts">
            <p className="note">תנוחות ייחוס לתנועה: דוגמנית בהליכה, בסיבוב, בתנוחת צילום, בגוף מלא. הלקוחה המולבשת מועברת אליהן אוטומטית.</p>
            <p className="note">כל עוד לא הועלו תנוחות, המערכת משתמשת בתנוחות של הדוגמניות מצילומי הקולקציה.</p>
          </div>
          <label className="drop">
            <b>גוררים או בוחרים תמונות תנוחה</b>
            <span>גוף מלא, לאורך, ידיים וכפות רגליים בפריים.</span>
            <input type="file" accept="image/*" multiple hidden disabled={keyOk !== true} onChange={async e => {
              const files = Array.from(e.target.files || []); e.target.value = ''
              for (const [i, f] of files.entries()) {
                try {
                  const out = await cutout(await fileToDataUrl(f), { remove: false, tolerance: 0, maxSide: 1400 })
                  await api.saveModel({ id: `ps-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: `תנוחה ${String(poses.length + i + 1).padStart(2, '0')}`, collection: 'תנוחות', kind: 'pose', aspect: out.aspect, cutout: false, createdAt: Date.now() } as any, out.dataUrl)
                } catch (er: any) { setErr(er.message) }
              }
              await reload(); onChange()
            }} />
          </label>
        </section>
        <section className="shelf"><ul className="shelf-grid">{poses.map(m => card(m))}</ul></section>
      </>}

      {tab === 'biz' && (
        <section className="shelf biz">
          <h2>העסק: הזמנה, תשלום ושמירה</h2>
          <p className="note">הלקוחה לוחצת "הזמנה" בגלריה שלה, ונפתחת הודעת WhatsApp אלייך עם הדגמים שבחרה. קישור התשלום מופיע לידו.</p>
          <div className="biz-grid">
            <label><span className="lbl">שם העסק</span><input value={biz.business} onChange={e => { setBiz({ ...biz, business: e.target.value }); setBizSaved(false) }} /></label>
            <label><span className="lbl">WhatsApp להזמנות</span><input inputMode="tel" value={biz.whatsapp} onChange={e => { setBiz({ ...biz, whatsapp: e.target.value }); setBizSaved(false) }} placeholder="972501234567" /></label>
            <label><span className="lbl">קישור תשלום</span><input value={biz.payUrl} onChange={e => { setBiz({ ...biz, payUrl: e.target.value }); setBizSaved(false) }} placeholder="https://" /></label>
            <label><span className="lbl">שמירת תמונות לקוחות</span>
              <select value={biz.retentionDays} onChange={e => { setBiz({ ...biz, retentionDays: +e.target.value }); setBizSaved(false) }}>
                {[30, 90, 180, 365].map(d => <option key={d} value={d}>{d} ימים</option>)}
              </select></label>
            <button className="primary" disabled={keyOk !== true} onClick={async () => { try { await api.saveSettings(biz); setBizSaved(true) } catch (er: any) { setErr(er.message) } }}>{bizSaved ? 'נשמר' : 'שמירה'}</button>
          </div>
          <p className="note">למה יש משך שמירה: חוק הגנת הפרטיות (ובאירופה GDPR) מתיר לשמור תמונה של אדם רק כל עוד יש לה מטרה. הקביעה היא שלך, פעם אחת, והלקוחה רואה אותה בהסכמה.</p>
        </section>
      )}

      {upgrade && (
        <div className="modal" role="dialog" onClick={e => { if (e.target === e.currentTarget && !upgrade.busy) setUpgrade(null) }}>
          <div className="modal-box">
            <div className="row between"><h2>רקע מגזין · {upgrade.m.name}</h2><button className="xs static" onClick={() => setUpgrade(null)}>×</button></div>
            <div className="up-grid">
              <figure><img src={upgrade.img || upgrade.m.image} alt="" />{upgrade.busy && <figcaption>מעבד...</figcaption>}</figure>
              <div className="stack">
                <span className="lbl">בחירת רקע</span>
                <div className="backs">{backdrops.map(b => (
                  <button key={b.id} className={upgrade.bd?.id === b.id ? 'on' : ''} disabled={upgrade.busy} onClick={async () => {
                    setUpgrade(u => u && { ...u, bd: b, busy: true })
                    try { const img = await applyBackdrop(upgrade.m.image, b); setUpgrade(u => u && { ...u, img, busy: false }) }
                    catch { setErr('לא זוהתה דמות בתמונה'); setUpgrade(u => u && { ...u, busy: false }) }
                  }}><i style={b.kind === 'studio' ? { background: `radial-gradient(circle at 50% 35%, ${b.tones![0]}, ${b.tones![1]} 60%, ${b.tones![2]})` } : { backgroundImage: `url(${b.url})` }} />{b.label}</button>
                ))}</div>
                <p className="note">התמונה המשודרגת מוצגת בקטלוג ובכריכה. ההלבשה על הלקוחה ממשיכה להשתמש בצילום המקורי, כדי לשמור על פרטי הבד.</p>
                <div className="row">
                  <button className="primary" disabled={!upgrade.img || upgrade.busy} onClick={async () => {
                    setUpgrade(u => u && { ...u, busy: true })
                    try { await api.saveModel({ ...upgrade.m }, undefined, upgrade.img); log(`רקע מגזין: ${upgrade.m.name} · ${upgrade.bd?.label}`); await reload(); onChange(); setUpgrade(null) }
                    catch (e: any) { setErr(e.message); setUpgrade(u => u && { ...u, busy: false }) }
                  }}>שמירה כתמונת תצוגה</button>
                  {upgrade.m.cover && <button className="ghost" disabled={upgrade.busy} onClick={async () => { await api.saveModel({ ...upgrade.m, cover: '' }); await reload(); onChange(); setUpgrade(null) }}>חזרה למקור</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
