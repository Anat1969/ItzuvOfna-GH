import { allModels } from '../data'
import type { Page } from '../App'

const FLOW = ['הלקוחה מצטלמת', 'מודדת את הקולקציה', 'רקע סטודיו או נוף', 'גלריה אישית', 'הזמנה']

export default function Cover({ go }: { go: (p: Page) => void }) {
  const hero = allModels().slice(0, 3)
  return (
    <div className="cover">
      <div className={`cover-art n${hero.length}`} aria-hidden="true">
        {hero.length ? hero.map(m => <img key={m.id} src={m.image} alt="" />) : <span className="cover-empty">הקולקציה תופיע כאן אחרי ההעלאה הראשונה</span>}
      </div>
      <div className="cover-text">
        <span className="kicker">קולקציה · סטודיו אופנה אוטומטי</span>
        <h1>הלקוחה מצטלמת פעם אחת. <mark>כל הקולקציה עליה.</mark></h1>
        <p className="lead-xl">
          מעלים את הקולקציה כמו שהיא, מצולמת על דוגמנית.
          <br />הלקוחה מצטלמת או שולחת תמונה, מודדת את כל הדגמים, בוחרת רקע, ומקבלת גלריה אישית.
        </p>
        <ol className="flow">
          {FLOW.map((f, i) => <li key={f}><span className="mono">{i + 1}</span>{f}</li>)}
        </ol>
        <div className="row">
          <button className="primary big" onClick={() => go('studio')}>פתיחה: לסטודיו</button>
          <button className="big" onClick={() => go('library')}>הקולקציה</button>
          <button className="big ghost" onClick={() => go('clients')}>לקוחות</button>
        </div>
        <p className="fine">ההדמיה ממחישה ואינה מחליפה מדידה. בלי עלות: ההלבשה בשירות מחקר פתוח, והחלפת הרקע במכשיר עצמו.</p>
      </div>
    </div>
  )
}
