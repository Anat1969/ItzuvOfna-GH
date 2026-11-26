// שכבת מנוע ההדמיה: ממשק אחד, כמה ספקים. כך אפשר לחבר מנוע חיצוני בעתיד בלי נעילת ספק.
// באב הטיפוס פועל רק מנוע מקומי: איור קו של הדגם מעל הצילום, בדפדפן, בלי שליחה לשרת.

export interface TryOnInput { photo: string | null; modelId: string; variation: string; size: number }
export interface Transform { y: number; scale: number; width: number }

export interface TryOnEngine {
  id: string
  name: string
  kind: 'local' | 'external'
  status: 'active' | 'not-connected'
  phase: string
  sendsImage: boolean
  costPerSession: string
  note: string
}

export const ENGINES: TryOnEngine[] = [
  { id: 'local-overlay', name: 'שכבת איור מקומית', kind: 'local', status: 'active', phase: 'אב טיפוס', sendsImage: false, costPerSession: '0', note: 'האיור מונח על הצילום בדפדפן. אין עיבוד AI ואין שליחה.' },
  { id: 'external-static', name: 'מנוע חיצוני: תמונה סטטית', kind: 'external', status: 'not-connected', phase: 'ג׳–1', sendsImage: true, costPerSession: 'ייקבע בפיילוט', note: 'ייבחר לפי איכות, עלות ואבטחה. דורש הסכם עיבוד נתונים.' },
  { id: 'external-angles', name: 'מנוע חיצוני: זוויות נוספות', kind: 'external', status: 'not-connected', phase: 'ג׳–2', sendsImage: true, costPerSession: 'ייקבע בפיילוט', note: 'כולל בקרת איכות לפני הצגה לכלה.' },
  { id: 'external-motion', name: 'מנוע חיצוני: קליפ תנועה', kind: 'external', status: 'not-connected', phase: 'ג׳–3', sendsImage: true, costPerSession: 'ייקבע בפיילוט', note: 'לא בזמן אמת. הליכה, סיבוב, ריקוד קצר.' },
]

export const activeEngine = () => ENGINES.find(e => e.status === 'active')!
