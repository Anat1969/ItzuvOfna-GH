import { ACTIONS, allModels, NEVER, PERMS, ROLE_HE, SALONS, can, type Role, type User } from '../data'
import { ENGINES } from '../engine'
import { fmtTime, type AuditEntry } from '../App'

const ROLES: Role[] = ['owner', 'consultant', 'trainee']
const LVL: Record<AuditEntry['level'], string> = { info: 'פעולה', privacy: 'פרטיות', deny: 'דחייה', approve: 'אישור' }

export default function Access({ user, audit }: { user: User; audit: AuditEntry[] }) {
  const full = can(user, 'audit')
  const rows = full ? audit : audit.filter(a => a.who === user.name)
  return (
    <div className="access">
      <header className="ph">
        <h1>כל אחת רואה <mark>רק את הסלון שלה</mark>, ורק את מה שהתפקיד מתיר.</h1>
        <p className="lead">המטריצה נאכפת בכל מסך באב הטיפוס. בגרסת ייצור היא תיאכף בשרת, בשורת מסד הנתונים (RLS), ולא רק בממשק.</p>
      </header>

      <section className="a-matrix">
        <h2>תפקיד מול פעולה</h2>
        <table className="matrix">
          <thead><tr><th>פעולה</th>{ROLES.map(r => <th key={r} className={user.role === r ? 'me' : ''}>{ROLE_HE[r]}</th>)}</tr></thead>
          <tbody>
            {ACTIONS.map(a => (
              <tr key={a.id}><td>{a.he}</td>{ROLES.map(r => <td key={r} className={`${user.role === r ? 'me ' : ''}${PERMS[r].includes(a.id) ? 'yes' : 'no'}`}>{PERMS[r].includes(a.id) ? 'מותר' : 'חסום'}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="note">העמודה המודגשת היא התפקיד הנוכחי. מחליפים משתמשת בסרגל העליון.</p>
      </section>

      <section className="a-catalog">
        <h2>דגם מול סלון</h2>
        <table className="matrix">
          <thead><tr><th>דגם</th>{SALONS.map(s => <th key={s.id} className={user.salon === s.id ? 'me' : ''}>{s.name}<br /><span className="muted">{s.place}</span></th>)}</tr></thead>
          <tbody>
            {allModels().map(m => (
              <tr key={m.id}><td><span className="mono">{m.id}</span> {m.name}</td>{SALONS.map(s => <td key={s.id} className={`${user.salon === s.id ? 'me ' : ''}${m.salons.includes(s.id) ? 'yes' : 'no'}`}>{m.salons.includes(s.id) ? 'מורשה' : 'לא נטען'}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <h3>מה לא קיים במערכת בכלל</h3>
        <ul className="never">{NEVER.map(n => <li key={n}>{n}</li>)}</ul>
        <p className="note">מה שלא נשמר לא יכול לדלוף. הפרדה מוחלטת בין החנות לבין עסק המכירות הבינלאומי.</p>
      </section>

      <section className="a-audit">
        <h2>יומן פעולות {full ? '· מלא' : '· הפעולות שלי בלבד'}</h2>
        {!full && <p className="note">יומן מלא פתוח רק לבעלת הסלון.</p>}
        {rows.length === 0 ? <p className="muted">עדיין אין פעולות. פתחי סשן בסטודיו.</p> : (
          <ul className="audit">{rows.map((a, i) => <li key={i} className={a.level}><span className="mono">{fmtTime(a.at)}</span><b>{LVL[a.level]}</b><span>{a.what}</span><span className="muted">{a.who}</span></li>)}</ul>
        )}
        <h3>מנועי הדמיה: ממשק אחד, בלי נעילת ספק</h3>
        <ul className="engines">
          {ENGINES.map(e => (
            <li key={e.id} className={e.status}>
              <b>{e.name}</b><span className="mono">{e.phase}</span>
              <span>{e.status === 'active' ? 'פעיל' : 'לא מחובר'} · {e.sendsImage ? 'שולח תמונה' : 'ללא שליחה'} · עלות: {e.costPerSession}</span>
              <span className="muted">{e.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
