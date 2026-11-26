import { useEffect, useState } from 'react'
import { api, galleryUrl } from '../api'
import { can, type User } from '../data'

type Client = { gallery: string; name: string; expires: number; createdAt: number; photos: string[] }
const day = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })

// ארכיון הלקוחות: תצלומי המקור, לפי לקוחה, עם קישור לגלריה שלה
export default function Clients({ user, onReuse }: { user: User; onReuse: (photo: string, name: string) => void }) {
  const [list, setList] = useState<Client[] | null>(null)
  const [err, setErr] = useState('')
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
      {list === null ? <p className="muted">...</p> : list.length === 0 ? <p className="muted">עדיין אין לקוחות. התצלום נשמר כאן אחרי צילום בסטודיו.</p> : (
        <ul className="client-grid">
          {list.map(c => (
            <li key={c.gallery}>
              <div className="ph-row">{c.photos.slice(0, 2).map(u => <img key={u} src={u} alt="" loading="lazy" />)}</div>
              <div className="cl-meta">
                <b>{c.name || 'ללא שם'}</b>
                <span className="muted">צולמה {day(c.createdAt)} · נמחק {day(c.expires)}</span>
              </div>
              <div className="row">
                <button className="primary" onClick={() => onReuse(c.photos[0], c.name)}>מדידה חדשה</button>
                <a className="btn" href={galleryUrl(c.gallery)} target="_blank" rel="noreferrer">גלריה</a>
                <button className="ghost danger" onClick={async () => { if (confirm('למחוק את תצלומי הלקוחה?')) { await api.deleteClient(c.gallery).catch(() => null); load() } }}>מחיקה</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
