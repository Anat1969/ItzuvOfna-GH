import { useEffect, useState } from 'react'
import { api, type Order } from '../api'
import { can, type User } from '../data'
import { Icon, IconBtn } from '../Icon'

const ST: Record<Order['status'], string> = { new: 'חדשה', approved: 'אושרה', paid: 'שולמה', delivered: 'נמסרה', cancelled: 'בוטלה' }
const ils = (n: number) => n ? `₪${n.toLocaleString('he-IL')}` : '—'
const day = (ms: number) => new Date(ms).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })

// רשימת ההזמנות: שורה קצרה עם החשוב, והפרטים נפתחים בלחיצה
export default function Orders({ user, openGallery }: { user: User; openGallery: (g: string) => void }) {
  const [list, setList] = useState<Order[] | null>(null)
  const [q, setQ] = useState('')
  const [st, setSt] = useState<Order['status'] | ''>('')
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const load = () => api.orders().then(setList).catch(e => { setErr(e.message); setList([]) })
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i) }, [])
  const patch = async (o: Order, p: Partial<Order>) => { try { const n = await api.updateOrder(o.id, p); setList(l => l?.map(x => x.id === o.id ? n : x) ?? null) } catch (e: any) { setErr(e.message) } }

  if (!can(user, 'catalog')) return <div className="orders"><h1>הזמנות</h1><p className="deny">רשימת ההזמנות פתוחה לבעלת העסק בלבד.</p></div>
  const term = q.trim()
  const rows = (list ?? []).filter(o => (!st || o.status === st) && (!term || o.client.includes(term) || o.id.includes(term) || o.items.some(i => i.name.includes(term))))
  const count = (s: Order['status']) => (list ?? []).filter(o => o.status === s).length
  const open$ = (list ?? []).filter(o => o.status === 'new' || o.status === 'approved')

  return (
    <div className="orders">
      <header className="ph">
        <span className="kicker">הזמנות</span>
        <h1><b>{open$.length}</b> הזמנות פתוחות{open$.reduce((s, o) => s + o.total, 0) > 0 && <>, <mark>{ils(open$.reduce((s, o) => s + o.total, 0))}</mark></>}</h1>
      </header>
      <div className="ord-bar">
        <label className="ord-search"><Icon name="search" size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי לקוחה, דגם או מספר" /></label>
        <div className="seg">
          <button className={st === '' ? 'on all' : 'all'} onClick={() => setSt('')}>הכול · {list?.length ?? 0}</button>
          {(Object.keys(ST) as Order['status'][]).map(s => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{ST[s]} · {count(s)}</button>)}
        </div>
      </div>
      {err && <p className="deny">{err}</p>}
      {list === null ? <p className="muted">...</p> : rows.length === 0 ? <p className="muted">אין הזמנות. הזמנה נוצרת כשהלקוחה לוחצת "הזמנה" בגלריה שלה.</p> : (
        <table className="ord-table">
          <thead><tr><th>תאריך</th><th>לקוחה</th><th>דגמים</th><th>סכום</th><th>סטטוס</th><th /></tr></thead>
          <tbody>
            {rows.map(o => [
              <tr key={o.id} className={`ord-row ${o.status}${open === o.id ? ' open' : ''}`} onClick={() => setOpen(open === o.id ? null : o.id)}>
                <td className="mono">{day(o.createdAt)}</td>
                <td><b>{o.client || 'ללא שם'}</b></td>
                <td className="ord-items">
                  <span className="ord-thumbs">{o.items.slice(0, 3).map(i => i.image && <img key={i.image} src={i.image} alt="" />)}</span>
                  {o.items.slice(0, 2).map(i => i.name).join(', ')}{o.items.length > 2 ? ` +${o.items.length - 2}` : ''}
                </td>
                <td className="mono">{ils(o.total)}</td>
                <td><span className={`st ${o.status}`}>{ST[o.status]}</span></td>
                <td className="ord-x"><Icon name={open === o.id ? 'left' : 'right'} size={14} /></td>
              </tr>,
              open === o.id && <tr key={o.id + '-d'} className="ord-detail"><td colSpan={6}>
                <div className="ord-d">
                  <ul className="ord-looks">{o.items.map(i => <li key={i.modelId}><img src={i.image} alt="" /><span>{i.name}</span><span className="mono">{ils(i.price)}</span></li>)}</ul>
                  <div className="ord-side">
                    <span className="lbl">מספר {o.id} · {o.source === 'gallery' ? 'מהגלריה של הלקוחה' : 'מהסטודיו'}</span>
                    <label><span className="lbl">סכום</span><input inputMode="numeric" defaultValue={o.total || ''} onBlur={e => patch(o, { total: Number(e.target.value.replace(/\D/g, '')) || 0 })} placeholder="₪" /></label>
                    <label><span className="lbl">הערות</span><textarea defaultValue={o.note} rows={3} onBlur={e => patch(o, { note: e.target.value })} placeholder="מידה, תאריך מדידה, מקדמה..." /></label>
                    <div className="seg wrap">{(Object.keys(ST) as Order['status'][]).map(s => <button key={s} className={o.status === s ? 'on' : ''} onClick={() => patch(o, { status: s })}>{ST[s]}</button>)}</div>
                    <div className="row">
                      <IconBtn icon="open" label="הגלריה של הלקוחה" onClick={() => openGallery(o.g)} />
                      <IconBtn icon="trash" label="מחיקת ההזמנה" danger onClick={async () => { if (confirm('למחוק את ההזמנה?')) { await api.deleteOrder(o.id).catch(() => null); load() } }} />
                    </div>
                  </div>
                </div>
              </td></tr>,
            ])}
          </tbody>
        </table>
      )}
    </div>
  )
}
