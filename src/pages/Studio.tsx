import { useEffect, useRef, useState } from 'react'
import { t, type Lang, type Key } from '../i18n'
import { can, modelsFor, salonOf, MODELS, ROLE_HE, type Retention, type User } from '../data'
import { activeEngine } from '../engine'
import { Stage, Dress } from '../Stage'
import { DEFAULT_T, fmtTime, type AuditEntry, type Consent, type Fav, type Page, type Session } from '../App'

interface Props {
  lang: Lang; user: User; session: Session | null
  setSession: React.Dispatch<React.SetStateAction<Session | null>>
  audit: AuditEntry[]; log: (w: string, l?: AuditEntry['level']) => void
  wipe: (r: string) => void; endSession: () => void; go: (p: Page) => void
}

const STEPS: Key[] = ['s1', 's2', 's3', 's4', 's5', 's6']
const fillOf = (modelId: string | null, v: string | null) => MODELS.find(m => m.id === modelId)?.variations.find(x => x.id === v)?.fill ?? '#F2EBDD'
const ils = (n: number) => `₪${n.toLocaleString('he-IL')}`

export default function Studio(p: Props) {
  const { lang, user, session, setSession, log } = p
  const L = (k: Key) => t(lang, k)
  const [client, setClient] = useState(false)
  const [cmp, setCmp] = useState<string[]>([])
  const s = session
  const step = s?.step ?? 0
  const upd = (patch: Partial<Session>) => setSession(x => x && { ...x, ...patch })
  const goStep = (n: number) => upd({ step: n })
  const [followPick, setFollowPick] = useState<Fav | null>(null)
  const shown: Fav | null = step === 5 ? (s?.request?.fav ?? followPick) : null
  const model = MODELS.find(m => m.id === (shown?.modelId ?? s?.modelId)) ?? null

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setClient(false) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])

  const reachable = (i: number) => {
    if (!s) return i === 0
    if (i <= 1) return true
    if (!s.consent) return false
    if (i === 2) return true
    if (!s.photoKind) return false
    if (i === 3) return true
    return !!s.modelId
  }

  const cmpFavs = s?.favorites.filter(f => cmp.includes(f.id)) ?? []

  return (
    <div className="studio">
      <ol className="steps" aria-label="שלבי הסשן">
        {STEPS.map((k, i) => (
          <li key={k}>
            <button className={`${step === i ? 'on' : ''}${s && step > i ? ' done' : ''}`} disabled={!reachable(i)} onClick={() => s && goStep(i)}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>{L(k)}
            </button>
          </li>
        ))}
        <li className="steps-foot">
          <span className="lbl">{L('engine')}</span>
          <b>{activeEngine().id === 'local-overlay' ? L('engineName') : activeEngine().name}</b>
          <span className="muted">{L('engineFoot')}</span>
        </li>
      </ol>

      <section className="center">
        {cmpFavs.length === 2 ? (
          <div className="cmp">
            {cmpFavs.map(f => {
              const m = MODELS.find(x => x.id === f.modelId)!
              return (
                <figure key={f.id}>
                  <Stage small photo={s!.photo} model={m} fill={fillOf(f.modelId, f.variation)} transform={f.transform} watermark={L('illustration')} uid={`c${f.id}`} />
                  <figcaption><b>{m.name}</b> <span className="mono">{m.id}</span> · {L('size')} {f.size}</figcaption>
                </figure>
              )
            })}
            <button className="ghost cmp-x" onClick={() => setCmp([])}>{L('closeCmp')}</button>
          </div>
        ) : (
          <div className={`stage-box${!s?.photoKind ? ' dim' : ''}`}>
            <Stage photo={s?.photo ?? null} model={step >= 3 ? model : null} fill={fillOf(shown?.modelId ?? s?.modelId ?? null, shown?.variation ?? s?.variation ?? null)} transform={shown?.transform ?? s?.transform ?? DEFAULT_T} watermark={L('illustration')} uid="main" />
            {!s?.photoKind && <div className="stage-veil"><b>{L(s?.consent ? 'veilWaiting' : 'veilNoConsent')}</b><span>{L('veilSub')}</span></div>}
          </div>
        )}
        <p className="disc"><mark>{L('illustration')}.</mark> {L('disclaimer')}</p>
      </section>

      <aside className="panel">
        {step === 0 && <OpenStep {...p} />}
        {s && step === 1 && <ConsentStep lang={lang} jurisdiction={salonOf(user).jurisdiction} done={s.consent} onAgree={c => {
          upd({ consent: c, step: 2 })
          log(`הסכמה נחתמה: צילום, הסבר עיבוד, שמירה "${L(('r_' + c.retention) as Key)}". שיווק ${c.o1 ? 'כן' : 'לא'}, אימון מודלים ${c.o2 ? 'כן' : 'לא'}, שליחה ${c.o3 ? 'כן' : 'לא'}`, 'privacy')
        }} />}
        {s && step === 2 && <CaptureStep lang={lang} onPhoto={(photo, kind) => {
          upd({ photo, photoKind: kind, step: 3 })
          log(kind === 'demo' ? 'נבחרה דמות הדגמה, ללא צילום' : `תצלום נקלט (${kind === 'camera' ? 'מצלמה' : 'קובץ'}) ונשמר בזיכרון המכשיר בלבד`, kind === 'demo' ? 'info' : 'privacy')
        }} />}
        {s && step === 3 && <ModelStep lang={lang} user={user} s={s} onPick={(patch) => upd(patch)} onNext={() => { goStep(4); log(`נבחר דגם ${s.modelId}, מידה ${s.size}, ${s.variation}`) }} />}
        {s && step === 4 && model && (
          <div className="stack">
            <h2>{model.name} <span className="mono muted">{model.id}</span></h2>
            <p className="lead">{L('size')} <b>{s.size}</b> · {model.variations.find(v => v.id === s.variation)?.label[lang]}</p>
            <fieldset className="sliders">
              <legend>{L('adjust')}</legend>
              {([['y', L('height'), 5, 45, .5], ['scale', L('scale'), 40, 95, .5], ['width', L('width'), .7, 1.6, .01]] as const).map(([k, lbl, mn, mx, st]) => (
                <label key={k}><span>{lbl}</span>
                  <input type="range" min={mn} max={mx} step={st} value={s.transform[k]} onChange={e => upd({ transform: { ...s.transform, [k]: +e.target.value } })} />
                </label>
              ))}
              <button className="ghost" onClick={() => upd({ transform: DEFAULT_T })}>{L('reset')}</button>
            </fieldset>
            <div className="row">
              <button className="primary" disabled={!can(user, 'favorites') || s.favorites.length >= 4} onClick={() => {
                const f: Fav = { id: Math.random().toString(36).slice(2, 7), modelId: s.modelId!, variation: s.variation!, size: s.size!, transform: s.transform }
                upd({ favorites: [...s.favorites, f] }); log(`נשמר למועדפים: ${f.modelId} מידה ${f.size}`)
              }}>{L('saveFav')}</button>
              <button onClick={() => { setClient(true); log('מעבר לתצוגת לקוחה') }}>{L('clientView')}</button>
            </div>
            <Favs lang={lang} s={s} cmp={cmp} setCmp={setCmp} onDelete={id => { upd({ favorites: s.favorites.filter(f => f.id !== id) }); setCmp(c => c.filter(x => x !== id)); log('מועדף נמחק לבקשת הכלה', 'privacy') }} />
            <div className="row end">
              <button className="ghost" onClick={() => goStep(3)}>{L('back')}</button>
              <button className="primary" onClick={() => goStep(5)}>{L('next')}</button>
            </div>
          </div>
        )}
        {s && step === 5 && <FollowStep {...p} s={s} onPick={setFollowPick} />}
      </aside>

      {client && s && model && (
        <div className="client" role="dialog" aria-label={L('clientView')}>
          <div className="client-stage"><Stage photo={s.photo} model={model} fill={fillOf(s.modelId, s.variation)} transform={s.transform} watermark={L('illustration')} uid="client" /></div>
          <div className="client-side">
            <span className="lbl">SHIRAN · {model.collection}</span>
            <h1>{model.name}</h1>
            <p className="mono">{model.id} · {L('size')} {s.size}</p>
            <p>{model.variations.find(v => v.id === s.variation)?.label[lang]}</p>
            <p className="disc"><mark>{L('illustration')}.</mark> {L('disclaimer')}</p>
            <button className="primary" onClick={() => setClient(false)}>{L('exitClient')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function OpenStep({ lang, user, setSession, log }: Props) {
  const L = (k: Key) => t(lang, k)
  const salon = salonOf(user)
  const ok = can(user, 'session')
  return (
    <div className="stack">
      <h2>{L('openTitle')}</h2>
      <p className="lead">{L('openLead')}</p>
      <dl className="kv">
        <dt>{L('kSalon')}</dt><dd>{salon.name} · {salon.place}</dd>
        <dt>{L('kUser')}</dt><dd>{user.name} · {ROLE_HE[user.role]}</dd>
        <dt>{L('kCatalog')}</dt><dd><b>{modelsFor(user).length}</b> {L('of')} {MODELS.length} {L('approvedFor')}</dd>
        <dt>{L('kLaw')}</dt><dd>{L(salon.jurisdiction === 'EU' ? 'lawEU' : 'lawIL')}</dd>
      </dl>
      <button className="primary big" disabled={!ok} onClick={() => {
        const id = `SES-${Date.now().toString(36).slice(-5).toUpperCase()}`
        setSession({ id, openedAt: Date.now(), salon: user.salon, user: user.id, step: 1, consent: null, photo: null, photoKind: null, modelId: null, variation: null, size: null, transform: DEFAULT_T, favorites: [], request: null })
        log(`נפתח סשן ${id} ב${salon.name}`)
      }}>{L('openBtn')}</button>
      {!ok && <p className="deny">{L('noPerm')}</p>}
    </div>
  )
}

function ConsentStep({ lang, jurisdiction, done, onAgree }: { lang: Lang; jurisdiction: 'IL' | 'EU'; done: Consent | null; onAgree: (c: Consent) => void }) {
  const L = (k: Key) => t(lang, k)
  const [c, setC] = useState<Omit<Consent, 'at'>>(done ?? { c1: false, c2: false, c3: false, o1: false, o2: false, o3: false, retention: 'session' })
  const ready = c.c1 && c.c2 && c.c3
  const box = (k: 'c1' | 'c2' | 'c3' | 'o1' | 'o2' | 'o3') => (
    <label className={`check${c[k] ? ' on' : ''}`}><input type="checkbox" checked={c[k]} disabled={!!done} onChange={e => setC({ ...c, [k]: e.target.checked })} /><span>{L(k)}</span></label>
  )
  return (
    <div className="stack">
      <h2>{L('consentTitle')}</h2>
      <p className="lead">{L('consentLead')}</p>
      {box('c1')}{box('c2')}
      <div className="ret">
        <span className="lbl">{L('retention')}</span>
        <div className="seg">
          {(['session', '24h', '7d'] as Retention[]).map(r => (
            <button key={r} className={c.retention === r ? 'on' : ''} disabled={!!done} onClick={() => setC({ ...c, retention: r })}>{L(('r_' + r) as Key)}</button>
          ))}
        </div>
      </div>
      {box('c3')}
      <span className="lbl">{L('optional')}</span>
      {box('o1')}{box('o2')}{box('o3')}
      {jurisdiction === 'EU' && <p className="note">סלון באיחוד האירופי: ברירת המחדל היא שמירה עד סוף הסשן. שמירה ארוכה יותר דורשת בסיס חוקי ובחינה משפטית מקומית.</p>}
      {done
        ? <p className="ok">הסכמה נחתמה ב-{fmtTime(done.at)}</p>
        : <button className="primary big" disabled={!ready} onClick={() => onAgree({ ...c, at: Date.now() })}>{L('agree')}</button>}
    </div>
  )
}

function CaptureStep({ lang, onPhoto }: { lang: Lang; onPhoto: (p: string | null, k: 'camera' | 'file' | 'demo') => void }) {
  const L = (k: Key) => t(lang, k)
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => () => stream?.getTracks().forEach(tr => tr.stop()), [stream])
  const start = async () => {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      setStream(st); if (video.current) { video.current.srcObject = st; await video.current.play() }
    } catch { setErr(true) }
  }
  const shoot = () => {
    const v = video.current; if (!v) return
    const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight
    cv.getContext('2d')!.drawImage(v, 0, 0)
    stream?.getTracks().forEach(tr => tr.stop()); setStream(null)
    onPhoto(cv.toDataURL('image/jpeg', .85), 'camera')
  }
  return (
    <div className="stack">
      <h2>{L('captureTitle')}</h2>
      <p className="lead">{L('captureLead')}</p>
      <video ref={video} className={`cam${stream ? ' live' : ''}`} playsInline muted />
      <div className="row">
        {!stream ? <button className="primary" onClick={start}>{L('camera')}</button> : <button className="primary" onClick={shoot}>{L('shoot')}</button>}
        <label className="btn">{L('upload')}<input type="file" accept="image/*" hidden onChange={e => {
          const f = e.target.files?.[0]; if (!f) return
          const r = new FileReader(); r.onload = () => onPhoto(r.result as string, 'file'); r.readAsDataURL(f)
        }} /></label>
        <button onClick={() => onPhoto(null, 'demo')}>{L('demoFigure')}</button>
      </div>
      {err && <p className="deny">{L('noCamera')}</p>}
      <p className="note">עמידה מלאה, גוף מלא בפריים, רקע אחיד ואור רך מלפנים. בשלב ג׳–2 תתווסף בקרת איכות אוטומטית לצילום.</p>
    </div>
  )
}

function ModelStep({ lang, user, s, onPick, onNext }: { lang: Lang; user: User; s: Session; onPick: (p: Partial<Session>) => void; onNext: () => void }) {
  const L = (k: Key) => t(lang, k)
  const list = modelsFor(user)
  const m = list.find(x => x.id === s.modelId)
  return (
    <div className="stack">
      <h2>{L('modelTitle')}</h2>
      <p className="lead"><b>{list.length}</b> {L('of')} {MODELS.length} {L('approvedFor')}. {L('modelLead2')}</p>
      <div className="catalog">
        {list.map(x => (
          <button key={x.id} className={`tile${s.modelId === x.id ? ' on' : ''}`} onClick={() => onPick({ modelId: x.id, variation: x.variations[0].id, size: x.sizes[Math.floor(x.sizes.length / 2)] })}>
            <Dress model={x} fill={x.variations[0].fill} uid={`t${x.id}`} />
            <b>{x.name}</b><span className="mono">{x.id}</span>
            {can(user, 'seePrice') && <span className="price mono">{ils(x.retailPrice)}</span>}
          </button>
        ))}
      </div>
      {m && <>
        <div><span className="lbl">{L('size')}</span><div className="seg">{m.sizes.map(z => <button key={z} className={s.size === z ? 'on' : ''} onClick={() => onPick({ size: z })}>{z}</button>)}</div></div>
        <div><span className="lbl">{L('variation')}</span><div className="seg">{m.variations.map(v => <button key={v.id} className={s.variation === v.id ? 'on' : ''} onClick={() => onPick({ variation: v.id })}><i className="sw" style={{ background: v.fill }} />{v.label[lang]}</button>)}</div></div>
        <p className="note">זכויות: {m.rights.source} · {m.rights.usage} · תועד {m.rights.documented}</p>
      </>}
      <div className="row end"><button className="primary" disabled={!m} onClick={onNext}>{L('next')}</button></div>
    </div>
  )
}

function Favs({ lang, s, cmp, setCmp, onDelete }: { lang: Lang; s: Session; cmp: string[]; setCmp: (f: (c: string[]) => string[]) => void; onDelete: (id: string) => void }) {
  const L = (k: Key) => t(lang, k)
  if (!s.favorites.length) return <p className="muted">{L('favNone')}</p>
  return (
    <div>
      <span className="lbl">{L('favorites')} · {s.favorites.length}/4 · {L('favPick')}</span>
      <ul className="favs">
        {s.favorites.map(f => {
          const m = MODELS.find(x => x.id === f.modelId)!
          return (
            <li key={f.id} className={cmp.includes(f.id) ? 'on' : ''}>
              <button className="fav-pick" onClick={() => setCmp(c => c.includes(f.id) ? c.filter(x => x !== f.id) : [...c, f.id].slice(-2))}>
                <Dress model={m} fill={fillOf(f.modelId, f.variation)} uid={`f${f.id}`} />
                <span><b>{m.name}</b><br /><span className="mono">{L('size')} {f.size}</span></span>
              </button>
              <button className="x danger" aria-label={L('del')} onClick={() => onDelete(f.id)}>{L('del')}</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FollowStep({ lang, user, s, setSession, log, audit, onPick }: Props & { s: Session; onPick: (f: Fav) => void }) {
  const L = (k: Key) => t(lang, k)
  const [pick, setPick] = useState<string>(s.favorites[0]?.id ?? 'current')
  const fav: Fav = s.favorites.find(f => f.id === pick) ?? { id: 'current', modelId: s.modelId!, variation: s.variation!, size: s.size!, transform: s.transform }
  const m = MODELS.find(x => x.id === fav.modelId)!
  const r = s.request
  useEffect(() => { onPick(fav) }, [pick]) // eslint-disable-line
  const setReq = (req: Session['request']) => setSession(x => x && { ...x, request: req })
  return (
    <div className="stack">
      <h2>{L('followTitle')}</h2>
      <p className="lead">{L('followLead')}</p>
      <div className="seg wrap">
        <button className={pick === 'current' ? 'on' : ''} onClick={() => setPick('current')} disabled={!!r}>{L('current')}</button>
        {s.favorites.map(f => <button key={f.id} className={pick === f.id ? 'on' : ''} disabled={!!r} onClick={() => setPick(f.id)}>{MODELS.find(x => x.id === f.modelId)!.name} · {f.size}</button>)}
      </div>
      <dl className="kv">
        <dt>{L('kModel')}</dt><dd><b>{m.name}</b> <span className="mono">{m.id}</span></dd>
        <dt>{L('size')}</dt><dd>{fav.size} · {m.variations.find(v => v.id === fav.variation)?.label[lang]}</dd>
        {can(user, 'seePrice') && <><dt>{L('kPrice')}</dt><dd><span className="mono">{ils(m.retailPrice)}</span></dd></>}
        <dt>{L('kAttached')}</dt><dd>{L('attachedTxt')}</dd>
      </dl>
      {!r && <>
        <button className="primary big" disabled={!can(user, 'requestOrder')} onClick={() => { setReq({ status: 'pending', at: Date.now(), by: user.name, fav }); log(`נשלחה בקשה להזמנה: ${m.id} מידה ${fav.size}`) }}>{L('requestOrder')}</button>
        {!can(user, 'requestOrder') && <p className="deny">{L('noPerm')}: {ROLE_HE[user.role]} יכולה לשמור מועדפים ולהעביר ליועצת.</p>}
        <button className="ghost" onClick={() => log('סומן להמשך טיפול ללא הזמנה')}>{L('followUp')}</button>
      </>}
      {r && (
        <div className={`req ${r.status}`}>
          <span className="lbl">{L('status')}</span>
          <b>{L(r.status === 'pending' ? 'pending' : r.status)}</b>
          <span className="muted">נשלחה ב-{fmtTime(r.at)} על ידי {r.by}{r.decidedBy ? ` · הוכרעה על ידי ${r.decidedBy}` : ''}</span>
          {r.status === 'pending' && (can(user, 'approveOrder')
            ? <div className="row">
                <button className="ok-btn" onClick={() => { setReq({ ...r, status: 'approved', decidedBy: user.name }); log(`הזמנה אושרה: ${r.fav.modelId}`, 'approve') }}>{L('approve')}</button>
                <button className="danger" onClick={() => { setReq({ ...r, status: 'declined', decidedBy: user.name }); log(`הזמנה נדחתה: ${r.fav.modelId}`, 'deny') }}>{L('decline')}</button>
              </div>
            : <p className="note">להדגמה: החליפי בסרגל העליון ל"בעלת סלון א׳" כדי לאשר.</p>)}
          {r.status === 'approved' && can(user, 'sendQuote') && <p className="ok">הצעת מחיר מוכנה למסירה: {ils(MODELS.find(x => x.id === r.fav.modelId)!.retailPrice)}, כפופה למדידה בסלון.</p>}
        </div>
      )}
      <div>
        <span className="lbl">{L('audit')}</span>
        <ul className="audit mini">{audit.slice(0, 4).map((a, i) => <li key={i} className={a.level}><span className="mono">{fmtTime(a.at)}</span>{a.what}</li>)}</ul>
        <a className="link" href="#/access">היומן המלא בדף ההרשאות</a>
      </div>
    </div>
  )
}

