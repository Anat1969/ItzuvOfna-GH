import { useEffect, useState } from 'react'
import { allModels } from '../data'
import type { Page } from '../App'

const FLOW = [
  { t: 'הקולקציה', d: 'מעלים את הדגמים כמו שצולמו' },
  { t: 'הלקוחה', d: 'מצטלמת פעם אחת, לאורך' },
  { t: 'מדידה', d: 'כל הדגמים שסימנה, עליה' },
  { t: 'סטודיו', d: 'רקע של צילום אופנה' },
  { t: 'גלריה והזמנה', d: 'בוחרת, משתפת ומזמינה' },
]

export default function Cover({ go }: { go: (p: Page) => void }) {
  const imgs = allModels().slice(0, 8).map(m => m.image!).filter(Boolean)
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(x => x + 1), 4200); return () => clearInterval(t) }, [])
  const cur = imgs.length ? i % imgs.length : 0
  const stage = i % FLOW.length
  return (
    <div className="cover lux">
      <div className="lux-art" aria-hidden="true">
        {imgs.map((src, k) => (
          <div key={src} className={`lux-slide${k === cur ? ' on' : ''}`}>
            <img className="lux-depth" src={src} alt="" />
            <img className="lux-front" src={src} alt="" />
          </div>
        ))}
        {!imgs.length && <span className="cover-empty">הקולקציה תופיע כאן</span>}
        <div className="lux-frame" />
        <div className="lux-count mono">{String(cur + 1).padStart(2, '0')} / {String(Math.max(1, imgs.length)).padStart(2, '0')}</div>
      </div>
      <div className="lux-text">
        <span className="lux-kicker">קולקציה · סטודיו אופנה</span>
        <h1 className="lux-title">הלקוחה מצטלמת פעם אחת.<br /><em>כל הקולקציה עליה.</em></h1>
        <p className="lux-lead">סטודיו אוטומטי: מדידה, צילום סטודיו, גלריה אישית והזמנה, בלי לצאת מהסלון.</p>
        <ol className="lux-flow">
          {FLOW.map((f, k) => (
            <li key={f.t} className={k === stage ? 'on' : ''} style={{ ['--k' as string]: k }}>
              <span className="lux-n">{String(k + 1).padStart(2, '0')}</span>
              <b>{f.t}</b><span>{f.d}</span>
            </li>
          ))}
        </ol>
        <div className="row">
          <button className="primary big" onClick={() => go('studio')}>כניסה לסטודיו</button>
          <button className="big ghost" onClick={() => go('library')}>הקולקציה</button>
          <button className="big ghost" onClick={() => go('clients')}>לקוחות</button>
        </div>
      </div>
    </div>
  )
}
