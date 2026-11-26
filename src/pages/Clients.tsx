import { useEffect, useState } from 'react'
import { api, galleryUrl } from '../api'
import { can, type User } from '../data'
import { IconBtn } from '../Icon'

type Client = { gallery: string; name: string; expires: number; createdAt: number; photos: string[] }
const day = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })

// ארכיון הלקוחות: תצלומי המקור, לפי לקוחה, עם קישור לגלריה שלה
export default function Clients({ user, onReuse }: { user: User; onReuse: (photo: string, name: string, gallery: string) => void }) {
  const [list, setList] = useState<Client[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [looks, setLooks] = useState<Record<string, string[]>>({})
  useEffect(() => { (list || []).forEach(c => { if (!looks[c.gallery]) api.looks(c.gallery).then(l => setLooks(x => ({ ...x, [c.gallery]: l.map(y => y.url) }))).catch(() => null) }) }, [list])
  const load = () => api.clients().then(setList).catch(e => { setErr(e.message); setList([]) })
  useEffect(() => { load() }, [])
  if (!can(user, 'catalog')) return <div className="clients"><h1>לקוחות</h1><p className="deny">ארכיון הלקוחות פתוח לבעלת העסק בלבד.</p></div>
  return (
    <div className="clients">
      <header className="ph">
        <span className="kicker">ארכיון · תצלומי מקור</span>
        <h1>כל לקוחה, <mark>התצלום שלה והגלריה שלה</mark>, במקום אחד.</h1>
        <p className="lead">התצלומים נמחקים לבד בתום משך השמירה שהלקוחה בחרה בהסכמה.</p>
      </header>
      {err && <p className="deny">{err}</p>}
      <input className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לקוחה לפי שם" />
      {list === null ? <p className="muted">...</p> : list.length === 0 ? <p className="muted">עדיין אין לקוחות. התצלום נשמר כאן אחרי צילום בסטודיו.</p> : (
        <ul className="client-grid">
          {list.filter(c => !q || (c.name || '').includes(q.trim())).map(c => (
            <li key={c.gallery}>
              <div className="cl-art">
                <img className="cl-main" src={looks[c.gallery]?.[0] || c.photos[0]} alt="" loading="lazy" onClick={() => { location.hash = `#/cg/${c.gallery}` }} />
                <div className="cl-side">
                  <img src={c.photos[0]} alt="" loading="lazy" title="תצלום המקור" />
                  {(looks[c.gallery] || []).slice(1, 3).map(u => <img key={u} src={u} alt="" loading="lazy" />)}
                </div>
              </div>
              <div className="cl-meta">
                <input className="name-edit" defaultValue={c.name} placeholder="שם הלקוחה" onBlur={e => { const v = e.target.value.trim(); if (v !== c.name) api.renameClient(c.gallery, v).then(load).catch(er => setErr(er.message)) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                <span className="muted">{looks[c.gallery]?.length ?? '…'} לוקים · {day(c.createdAt)}</span>
              </div>
              <div className="row">
                <button className="primary" onClick={() => onReuse(c.photos[0], c.name, c.gallery)}>מדידה חדשה</button>
                <button onClick={() => { location.hash = `#/cg/${c.gallery}` }}>הגלריה</button>
                <IconBtn icon="link" label="העתקת הקישור ללקוחה" onClick={() => navigator.clipboard?.writeText(galleryUrl(c.gallery))} />
                <IconBtn icon="trash" label="מחיקת התצלומים" danger onClick={async () => { if (confirm('למחוק את תצלומי הלקוחה?')) { await api.deleteClient(c.gallery).catch(() => null); load() } }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
