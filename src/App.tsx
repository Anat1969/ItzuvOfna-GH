import { useEffect, useState } from 'react'
import { DIR, LANG_LABEL, t, type Lang } from './i18n'
import { USERS, ROLE_HE, salonOf, setRemote, type Retention, type User } from './data'
import { api, setKey } from './api'
import type { Transform } from './engine'
import Cover from './pages/Cover'
import Studio from './pages/Studio'
import Access from './pages/Access'
import Roadmap from './pages/Roadmap'
import Library from './pages/Library'
import Gallery from './pages/Gallery'
import Clients from './pages/Clients'
import { newGalleryId } from './api'

export type Page = 'cover' | 'studio' | 'library' | 'clients' | 'access' | 'roadmap' | 'gallery'

export interface Consent { c1: boolean; c2: boolean; c3: boolean; o1: boolean; o2: boolean; o3: boolean; ai: boolean; retention: Retention; days: number; at: number }
export interface Fav { id: string; modelId: string; variation: string; size: number; transform: Transform; lookUrl?: string; engine?: 'local' | 'ai' }
export interface OrderReq { status: 'pending' | 'approved' | 'declined'; at: number; by: string; fav: Fav; decidedBy?: string }
export interface Session {
  id: string; openedAt: number; salon: string; user: string; step: number; gallery: string
  consent: Consent | null
  photo: string | null; photoKind: 'camera' | 'file' | 'demo' | null
  modelId: string | null; variation: string | null; size: number | null
  transform: Transform
  favorites: Fav[]
  request: OrderReq | null
  tryons: Record<string, string> // דגם ← תמונת הכלה בשמלה, בזיכרון בלבד
  client: string // שם הלקוחה, לא חובה
  picked: string[] // דגמים שסומנו למדידה
  backdrop: string // רקע נבחר: orig, סטודיו או רקע שהועלה
  shots: Record<string, string> // `${דגם}|${רקע}` ← התמונה על הרקע
}
export interface AuditEntry { at: number; who: string; what: string; level: 'info' | 'privacy' | 'deny' | 'approve' }

export const DEFAULT_T: Transform = { y: 22.5, scale: 74, width: 1.15 }

const PAGES: Page[] = ['cover', 'studio', 'library', 'clients', 'access', 'roadmap']
const galleryFromHash = () => /^#\/g\/([a-z0-9]{20,40})/.exec(location.hash)?.[1] ?? ''
const fromHash = (): Page => { if (galleryFromHash()) return 'gallery'; const h = location.hash.replace('#/', '').split('?')[0] as Page; return PAGES.includes(h) ? h : 'cover' }
// קישור אישי של בעלת הסלון: #/library?key=... שומר את המפתח במכשיר ומסיר אותו מהכתובת
;(() => { const m = /[?&]key=([^&]+)/.exec(location.hash); if (m) { setKey(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + location.hash.replace(/[?&]key=[^&]+/, '')) } })()

export const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function App() {
  const [lang, setLang] = useState<Lang>(() => { try { return (localStorage.getItem('sbs_lang') as Lang) || 'he' } catch { return 'he' } })
  const [page, setPage] = useState<Page>(fromHash)
  const [user, setUser] = useState<User>(USERS[1])
  const [session, setSession] = useState<Session | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [, setCatVer] = useState(0)
  const refreshCatalog = () => api.models().then(m => { setRemote(m); setCatVer(v => v + 1) }).catch(() => null)
  useEffect(() => { refreshCatalog(); api.health().then(h => { if (h.keyOk) setUser(USERS[0]) }).catch(() => null) }, [])

  useEffect(() => { const f = () => setPage(fromHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = DIR[lang]
    try { localStorage.setItem('sbs_lang', lang) } catch { /* ignore */ }
  }, [lang])

  const go = (p: Page) => { location.hash = `#/${p}`; setPage(p) }
  const log = (what: string, level: AuditEntry['level'] = 'info', who = user.name) => setAudit(a => [{ at: Date.now(), who, what, level }, ...a].slice(0, 200))

  const switchUser = (u: User) => {
    log(`החלפת משתמשת: ${u.name} (${ROLE_HE[u.role]})`, 'info', u.name)
    setUser(u)
    if (session && session.salon !== u.salon) {
      setSession(null)
      log('הסשן נסגר: המשתמשת החדשה שייכת לסלון אחר, ואין לה גישה אליו', 'privacy', u.name)
    }
  }

  const wipe = (reason: string) => {
    if (!session) return
    if (session.favorites.some(f => f.lookUrl)) api.deleteGallery(session.gallery).catch(() => null)
    setSession(s => s && { ...s, photo: null, photoKind: null, favorites: [], tryons: {}, shots: {}, step: Math.min(s.step, 2) })
    log(`מחיקה: ${reason}. התצלום נמחק מהמכשיר, והגלריה נמחקה מהשרת`, 'privacy')
  }
  const endSession = () => { if (!session) return; log(`סיום סשן ${session.id}. כל הנתונים נמחקו`, 'privacy'); setSession(null) }

  const ctx = { lang, user, session, setSession, audit, log, wipe, endSession, go }
  const g = galleryFromHash()

  return (
    <div className="app">
      <header className={`top${page === 'gallery' ? ' guest' : ''}`}>
        <a className="brand" href="#/cover" onClick={() => go('cover')}>
          <b>קולקציה</b><span>סטודיו אופנה</span>
        </a>
        <nav className="nav">
          {(['studio', 'library', 'clients', 'access', 'roadmap'] as Page[]).map(p => (
            <a key={p} href={`#/${p}`} className={page === p ? 'on' : ''} onClick={() => go(p)}>
              {p === 'clients' ? 'לקוחות' : t(lang, p === 'studio' ? 'navStudio' : p === 'library' ? 'navLibrary' : p === 'access' ? 'navAccess' : 'navRoadmap')}
            </a>
          ))}
        </nav>
        <div className="top-end">
          <label className="who">
            <span>{t(lang, 'actingAs')}</span>
            <select value={user.id} onChange={e => switchUser(USERS.find(u => u.id === e.target.value)!)}>
              {USERS.map(u => <option key={u.id} value={u.id}>{u.name} · {ROLE_HE[u.role]} · {salonOf(u).name}</option>)}
            </select>
          </label>
          <div className="langs" role="group" aria-label="language">
            {(['he', 'en', 'ar'] as Lang[]).map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>)}
          </div>
          {/* @ts-expect-error custom element */}
          <ai-menu />
        </div>
      </header>

      {session && page === 'studio' && <Ribbon lang={lang} session={session} onWipe={() => wipe('לבקשת הלקוחה')} onEnd={endSession} onStep={n => setSession(x => x && { ...x, step: Math.min(n, x.photo ? 5 : x.consent ? 2 : 1) })} />}

      <main className={`page page-${page}`}>
        {page === 'cover' && <Cover go={go} />}
        {page === 'studio' && <Studio {...ctx} />}
        {page === 'access' && <Access user={user} audit={audit} />}
        {page === 'roadmap' && <Roadmap />}
        {page === 'library' && <Library user={user} onChange={refreshCatalog} log={w => log(w)} />}
        {page === 'gallery' && g && <Gallery lang={lang} g={g} />}
        {page === 'clients' && <Clients user={user} onReuse={async (photo, name, gallery) => {
          // לקוחה חוזרת: סשן חדש עם התצלום מהארכיון, ישר לבחירת דגמים
          const b = await (await fetch(photo)).blob()
          const data = await new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(b) })
          const id = `SES-${Date.now().toString(36).slice(-5).toUpperCase()}`
          setSession({ id, gallery: gallery || newGalleryId(), openedAt: Date.now(), salon: user.salon, user: user.id, step: 1, consent: null, photo: data, photoKind: 'file', modelId: null, variation: null, size: null, transform: DEFAULT_T, favorites: [], request: null, tryons: {}, client: name, picked: [], backdrop: 'paper', shots: {} })
          log(`מדידה חדשה ללקוחה מהארכיון: ${name || 'ללא שם'}. נדרשת הסכמה מחדש`, 'privacy')
          go('studio')
        }} />}
      </main>
    </div>
  )
}

// מערכת הניווט: מחשבת מהסשן איפה הלקוחה במסלול, מה הושלם, ומה הצעד הבא
function Ribbon({ session, onWipe, onEnd, onStep }: { lang: Lang; session: Session; onWipe: () => void; onEnd: () => void; onStep: (n: number) => void }) {
  const fitted = Object.keys(session.tryons || {}).length
  const saved = session.favorites.length
  const stages = [
    { k: 'client', label: session.client || 'לקוחה', done: !!session.consent, step: 1, hint: 'הסכמה מפורשת' },
    { k: 'photo', label: 'צילום', done: !!session.photo, step: 2, hint: 'צילום לאורך, כל הגוף' },
    { k: 'pick', label: session.picked.length ? `${session.picked.length} נבחרו` : 'בחירת דגמים', done: session.picked.length > 0 || !!session.modelId, step: 3, hint: 'סימון דגמים מהקולקציה' },
    { k: 'fit', label: fitted ? `${fitted} נמדדו` : 'מדידה', done: fitted > 0, step: 4, hint: 'הלבשה על הלקוחה' },
    { k: 'save', label: saved ? `${saved} בגלריה` : 'גלריה', done: saved > 0, step: 4, hint: 'שמירה לגלריה' },
    { k: 'order', label: session.request ? 'הוזמן' : 'הזמנה', done: !!session.request, step: 5, hint: 'שליחת הגלריה והזמנה' },
  ]
  const next = stages.find(x => !x.done)
  return (
    <div className="journey" role="navigation" aria-label="מסלול הלקוחה">
      <ol>
        {stages.map((x, i) => (
          <li key={x.k} className={`${x.done ? 'done' : ''}${next?.k === x.k ? ' now' : ''}`}>
            <button onClick={() => onStep(x.step)}><span className="mono">{i + 1}</span>{x.label}</button>
          </li>
        ))}
      </ol>
      <span className="j-next">{next ? <>הבא: <b>{next.hint}</b></> : <b>המסלול הושלם</b>}</span>
      <span className="j-act">
        <button className="danger" onClick={onWipe} disabled={!session.photo && !saved}>מחיקת הכול</button>
        <button onClick={onEnd}>סיום</button>
      </span>
    </div>
  )
}
