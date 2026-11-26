const STAGES = [
  { id: 'א׳', title: 'פורטל הסלונים', state: 'now', items: ['UX/UI', 'הרשאות', 'פורטל רב־לשוני', 'קטלוג', 'הזמנות', 'פיננסים דו־חברתיים', 'אבטחה ובדיקות'] },
  { id: 'ב׳', title: 'AI CEO', state: 'next', items: ['ייפתח אחרי סיום שלב א׳'] },
  { id: 'ג׳', title: 'Bridal Studio', state: 'future', items: ['אחרי שלב א׳ וכניסת סלונים פעילים'] },
]

const PHASES = [
  { id: 'ג׳–1', title: 'תמונה סטטית', what: 'צילום אחד ודגם אחד, הדמיה מסומנת.', gate: 'איכות עקבית ב-80% מהסשנים, לפי דירוג יועצות.' },
  { id: 'ג׳–2', title: 'זוויות נוספות', what: 'חזית, צד וגב, עם בקרת איכות לפני הצגה.', gate: 'שיעור דחייה של הדמיות מתחת ל-10%.' },
  { id: 'ג׳–3', title: 'קליפ תנועה', what: 'הליכה, סיבוב או ריקוד קצר. לא בזמן אמת.', gate: 'זמן הכנה ועלות לסשן בתוך התקרה.' },
  { id: 'ג׳–4', title: 'תנועה חיה', what: 'רק אם הוכחו היתכנות, איכות ועלות סבירה.', gate: 'אין הבטחה למעקב בזמן אמת במכשירים זולים.' },
]

const PILOT = [
  'לפחות סלון פעיל אחד',
  'קטלוג מאושר עם מזהה קבוע וזכויות מתועדות',
  'מדיניות פרטיות ונוסח הסכמה, אחרי בחינה משפטית',
  'תוצאות איכות עקביות במבחן פנימי',
  'תקציב ניסוי מאושר',
  'תקרת שימוש לחודש ולסשן',
]

const METRICS = [
  ['שימוש חוזר של יועצות', 'סשנים ליועצת בשבוע'],
  ['זמן להכנת הדמיה', 'שניות מצילום ועד תצוגה'],
  ['שיעור בקשות להזמנה', 'בקשות חלקי סשנים'],
  ['משוב ושביעות רצון של כלות', 'שאלון קצר בסוף הסשן, 1 עד 5'],
  ['אירועי פרטיות', 'מספר, חומרה וזמן טיפול'],
  ['עלות ממוצעת לסשן', 'עלות מנוע ואחסון חלקי סשנים'],
]

const STANDARDS = [
  ['הסכמה מפורשת ונפרדת', 'GDPR, סעיף 7 · חוק הגנת הפרטיות, תיקון 13'],
  ['מחיקה לפי בקשה', 'GDPR, סעיף 17'],
  ['סימון תוכן שנוצר ממוחשב', 'EU AI Act, סעיף 50 (שקיפות)'],
  ['אבטחת מידע ובקרת גישה', 'ISO/IEC 27001'],
]

export default function Roadmap() {
  return (
    <div className="roadmap">
      <header className="ph">
        <span className="kicker">סטטוס: תיעוד חזון. אין פיתוח בייצור ואין הוצאה כספית.</span>
        <h1>ההדמיה מתקדמת <mark>רק כשהאיכות מוכחת</mark>.</h1>
        <p className="lead">כל שלב נפתח רק אחרי שהשער שלו עבר. לא מניחים מראש שההדמיה מעלה מכירות: בודקים.</p>
      </header>

      <section className="r-stages">
        {STAGES.map(s => (
          <div key={s.id} className={`stg ${s.state}`}>
            <span className="mono">שלב {s.id}</span>
            <h2>{s.title}</h2>
            <p>{s.items.join(' · ')}</p>
            <span className="state">{s.state === 'now' ? 'בעבודה עכשיו' : s.state === 'next' ? 'הבא בתור' : 'עתידי'}</span>
          </div>
        ))}
      </section>

      <section className="r-phases">
        <h2>שלב ג׳ בארבע מדרגות</h2>
        <ol className="ladder">
          {PHASES.map((p, i) => (
            <li key={p.id} style={{ ['--i' as string]: i }}>
              <span className="mono">{p.id}</span>
              <b>{p.title}</b>
              <span>{p.what}</span>
              <span className="gate">שער: {p.gate}</span>
            </li>
          ))}
        </ol>
        <p className="note">הערכה: ספי השערים (80%, 10%) הם הצעה לדיון, לא נתון. ייקבעו לפני הפיילוט.</p>
      </section>

      <section className="r-pilot">
        <h2>תנאי פתיחת פיילוט</h2>
        <ul className="checks">{PILOT.map(p => <li key={p}><i />{p}<span className="muted">טרם התקיים</span></li>)}</ul>
        <h3>בקרת עלויות</h3>
        <p>לא בוחרים מנוע ולא משלמים כעת. לא קונים טאבלטים. מתחילים במכשירים קיימים, ורק בהצלחה בוחנים <b>2–3</b> טאבלטים ממותגים לסלון.</p>
      </section>

      <section className="r-metrics">
        <h2>מדדי הצלחה ואיך מודדים</h2>
        <table className="matrix"><tbody>{METRICS.map(([a, b]) => <tr key={a}><td>{a}</td><td className="muted">{b}</td></tr>)}</tbody></table>
        <h3>על אילו תקנים נשען</h3>
        <table className="matrix"><tbody>{STANDARDS.map(([a, b]) => <tr key={a}><td>{a}</td><td className="mono">{b}</td></tr>)}</tbody></table>
        <p className="note">הערכה, לא ייעוץ משפטי. נדרשת בחינה של עורך דין מקומי בישראל ובכל מדינה באיחוד האירופי.</p>
        <h3>תשתית שנשמרת כבר עכשיו</h3>
        <p>מזהה דגם קבוע · זכויות שימוש מתועדות · שיוך סשן לסלון וליועצת · הרשאות קשיחות · ממשק מנוע בלי נעילת ספק.</p>
      </section>
    </div>
  )
}
