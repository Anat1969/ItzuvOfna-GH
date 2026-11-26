import { useEffect, useMemo, useState } from 'react'
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

export interface Consent { c1: boolean; c2: boolean; c3: boolean; o1: boolean; o2: boolean; o3: boolean; ai: boolean; retention: Retention; at: number }
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
const RET_MS: Record<Retention, number> = { session: 0, '24h': 864e5, '7d': 6048e5, '30d': 2592e6 }

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

      {session && page === 'studio' && <Ribbon lang={lang} session={session} onWipe={() => wipe('לבקשת הכלה')} onEnd={endSession} />}

      <main className={`page page-${page}`}>
        {page === 'cover' && <Cover go={go} />}
        {page === 'studio' && <Studio {...ctx} />}
        {page === 'access' && <Access user={user} audit={audit} />}
        {page === 'roadmap' && <Roadmap />}
        {page === 'library' && <Library user={user} onChange={refreshCatalog} log={w => log(w)} />}
        {page === 'gallery' && g && <Gallery lang={lang} g={g} />}
        {page === 'clients' && <Clients user={user} onReuse={async (photo, name) => {
          // לקוחה חוזרת: סשן חדש עם התצלום מהארכיון, ישר לבחירת דגמים
          const b = await (await fetch(photo)).blob()
          const data = await new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(b) })
          const id = `SES-${Date.now().toString(36).slice(-5).toUpperCase()}`
          setSession({ id, gallery: newGalleryId(), openedAt: Date.now(), salon: user.salon, user: user.id, step: 1, consent: null, photo: data, photoKind: 'file', modelId: null, variation: null, size: null, transform: DEFAULT_T, favorites: [], request: null, tryons: {}, client: name, picked: [], backdrop: 'paper', shots: {} })
          log(`מדידה חדשה ללקוחה מהארכיון: ${name || 'ללא שם'}. נדרשת הסכמה מחדש`, 'privacy')
          go('studio')
        }} />}
      </main>
    </div>
  )
}

function Ribbon({ lang, session, onWipe, onEnd }: { lang: Lang; session: Session; onWipe: () => void; onEnd: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [])
  const ret = session.consent?.retention ?? 'session'
  const until = useMemo(() => session.consent ? session.consent.at + RET_MS[ret] : 0, [session.consent, ret])
  const kept = [session.photo && 'תצלום', session.favorites.length > 0 && `${session.favorites.length} בגלריה`].filter(Boolean).join(' · ')
  const left = until - Date.now()
  const leftTxt = ret === 'session' ? t(lang, 'r_session') : left > 1728e5 ? `${Math.ceil(left / 864e5)} ${lang === 'en' ? 'days' : lang === 'ar' ? 'أيام' : 'ימים'}` : `${Math.floor(left / 36e5)}:${String(Math.floor(left % 36e5 / 6e4)).padStart(2, '0')}:${String(Math.floor(left % 6e4 / 1e3)).padStart(2, '0')}`
  return (
    <div className={`ribbon${session.photo ? ' hot' : ''}`} role="status">
      <span className="mono">{session.id}</span>
      <span className="r-kept"><i />{session.photo || session.favorites.length ? `${t(lang, 'ribbonKept')}: ${kept}` : t(lang, 'ribbonNothing')}</span>
      {session.consent && <span>{t(lang, 'ribbonUntil')}: <b className={ret === 'session' ? '' : 'mono'}>{leftTxt}</b></span>}
      <span className="r-note">{t(lang, 'memOnly')}</span>
      <span className="r-act">
        <button className="danger" onClick={onWipe} disabled={!session.photo && !session.favorites.length}>{t(lang, 'deleteAll')}</button>
        <button onClick={onEnd}>{t(lang, 'endSession')}</button>
      </span>
    </div>
  )
}
