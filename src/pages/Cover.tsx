import { MODELS, VAR } from '../data'
import { Dress } from '../Stage'
import type { Page } from '../App'

const FLOW = ['סשן', 'הסכמה', 'צילום', 'דגם מורשה', 'הדמיה מסומנת', 'אישור בעלת הסלון']

export default function Cover({ go }: { go: (p: Page) => void }) {
  return (
    <div className="cover">
      <div className="cover-art" aria-hidden="true">
        <div className="draw"><Dress model={MODELS[2]} fill={VAR.white.fill} uid="cover" /></div>
      </div>
      <div className="cover-text">
        <span className="kicker">שלב ג׳ · אב טיפוס חזון · ללא עלות</span>
        <h1>הכלה רואה את השמלה עליה, <mark>רק אחרי שהסכימה</mark>.</h1>
        <p className="lead-xl">
          יועצת בסלון מצלמת בהסכמה, בוחרת דגם מהקטלוג המאושר לסלון, ומציגה המחשה מסומנת.
          <br />ההזמנה עוברת לאישור בעלת הסלון.
        </p>
        <ol className="flow">
          {FLOW.map((f, i) => <li key={f}><span className="mono">{i + 1}</span>{f}</li>)}
        </ol>
        <blockquote>
          ״זהו כלי הדמיה ושיווק, לא תחליף למדידה פיזית, גזרה או התחייבות להתאמה מדויקת.״
          <cite>מתוך מסמך החזון, 26.11.2026</cite>
        </blockquote>
        <p className="haiku">בד לבן נופל<br />על תמונה שלא נשמרה.<br />ההסכמה קודם.</p>
        <div className="row">
          <button className="primary big" onClick={() => go('studio')}>פתיחה: לסטודיו</button>
          <button className="big" onClick={() => go('roadmap')}>מפת הדרכים ותנאי הפיילוט</button>
          <button className="big ghost" onClick={() => go('access')}>הרשאות ויומן</button>
        </div>
        <p className="fine">נתוני הדגמה בלבד. אין שרת, אין AI בתשלום, ואין שליחת תמונות. האפליקציה נפרדת משלב א׳ ולא נוגעת בו.</p>
      </div>
    </div>
  )
}
