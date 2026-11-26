import { useEffect, useMemo, useState } from 'react'
import { DIR, LANG_LABEL, t, type Lang } from './i18n'
import { USERS, ROLE_HE, salonOf, type Retention, type User } from './data'
import type { Transform } from './engine'
import Cover from './pages/Cover'
import Studio from './pages/Studio'
import Access from './pages/Access'
import Roadmap from './pages/Roadmap'

export type Page = 'cover' | 'studio' | 'access' | 'roadmap'

export interface Consent { c1: boolean; c2: boolean; c3: boolean; o1: boolean; o2: boolean; o3: boolean; retention: Retention; at: number }
export interface Fav { id: string; modelId: string; variation: string; size: number; transform: Transform }
export interface OrderReq { status: 'pending' | 'approved' | 'declined'; at: number; by: string; fav: Fav; decidedBy?: string }
export interface Session {
  id: string; openedAt: number; salon: string; user: string; step: number
  consent: Consent | null
  photo: string | null; photoKind: 'camera' | 'file' | 'demo' | null
  modelId: string | null; variation: string | null; size: number | null
  transform: Transform
  favorites: Fav[]
  request: OrderReq | null
}
export interface AuditEntry { at: number; who: string; what: string; level: 'info' | 'privacy' | 'deny' | 'approve' }

export const DEFAULT_T: Transform = { y: 22.5, scale: 74, width: 1.15 }

const PAGES: Page[] = ['cover', 'studio', 'access', 'roadmap']
const fromHash = (): Page => { const h = location.hash.replace('#/', '') as Page; return PAGES.includes(h) ? h : 'cover' }

export const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const RET_MS: Record<Retention, number> = { session: 0, '24h': 864e5, '7d': 6048e5 }

export default function App() {
  const [lang, setLang] = useState<Lang>(() => { try { return (localStorage.getItem('sbs_lang') as Lang) || 'he' } catch { return 'he' } })
  const [page, setPage] = useState<Page>(fromHash)
  const [user, setUser] = useState<User>(USERS[1])
  const [session, setSession] = useState<Session | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])

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
    setSession(s => s && { ...s, photo: null, photoKind: null, favorites: [], step: Math.min(s.step, 2) })
    log(`מחיקה: ${reason}. התצלום והמועדפים נמחקו מהזיכרון`, 'privacy')
  }
  const endSession = () => { if (!session) return; log(`סיום סשן ${session.id}. כל הנתונים נמחקו`, 'privacy'); setSession(null) }

  const ctx = { lang, user, session, setSession, audit, log, wipe, endSession, go }

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#/cover" onClick={() => go('cover')}>
          <b>SHIRAN</b><span>Bridal Studio</span>
        </a>
        <nav className="nav">
          {(['studio', 'access', 'roadmap'] as Page[]).map(p => (
            <a key={p} href={`#/${p}`} className={page === p ? 'on' : ''} onClick={() => go(p)}>
              {t(lang, p === 'studio' ? 'navStudio' : p === 'access' ? 'navAccess' : 'navRoadmap')}
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
      </main>
    </div>
  )
}

function Ribbon({ lang, session, onWipe, onEnd }: { lang: Lang; session: Session; onWipe: () => void; onEnd: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [])
  const ret = session.consent?.retention ?? 'session'
  const until = useMemo(() => session.consent ? session.consent.at + RET_MS[ret] : 0, [session.consent, ret])
  const kept = [session.photo && 'תצלום', session.favorites.length > 0 && `${session.favorites.length} מועדפים`].filter(Boolean).join(' · ')
  const left = until - Date.now()
  const leftTxt = ret === 'session' ? t(lang, 'r_session') : `${Math.floor(left / 36e5)}:${String(Math.floor(left % 36e5 / 6e4)).padStart(2, '0')}:${String(Math.floor(left % 6e4 / 1e3)).padStart(2, '0')}`
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
