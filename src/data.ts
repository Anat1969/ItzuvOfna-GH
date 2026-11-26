// מבנה הקטלוג וההרשאות. מחירי רכישה ונתוני חנות לא קיימים כאן בכלל.
// המבנה משמר את "התשתית שתישמר כבר עכשיו" מהאפיון: מזהה דגם קבוע, זכויות שימוש מתועדות,
// שיוך סשן לסלון וליועצת, והרשאות קשיחות לפי תפקיד.

export type Silhouette = 'aline' | 'mermaid' | 'ballgown' | 'sheath' | 'empire' | 'offshoulder'

export interface Variation { id: string; label: { he: string; en: string; ar: string }; fill: string }

export interface Model {
  id: string // מזהה קבוע, לא משתנה בין עונות
  name: string
  silhouette?: Silhouette // רק בדגמי ההדגמה המאוירים
  image?: string // תמונת התצוגה (תמונת המגזין, אם הוכנה)
  garment?: string // הצילום המקורי, להלבשה
  aspect?: number // רוחב חלקי גובה של התמונה
  uploaded?: boolean
  kind?: 'model' | 'background'
  cutout?: boolean // false: צולם על דוגמנית או ברקע לא אחיד, מוצג זה לצד זה
  collection: string
  sizes: number[]
  variations: Variation[]
  sleeves: boolean
  retailPrice: number // מחיר לצרכן בלבד. מחיר רכישה לא קיים במערכת הזו בכלל.
  rights: { source: string; usage: string; documented: string }
  salons: string[] // סלונים שמורשים להציג את הדגם
}

export interface Salon { id: string; name: string; place: string; jurisdiction: 'IL' | 'EU'; retentionDefault: Retention }

export type Role = 'owner' | 'consultant' | 'trainee'
export interface User { id: string; name: string; salon: string; role: Role }

export type Retention = 'session' | '24h' | '7d' | '30d'
export const RET_DAYS: Record<Retention, number> = { session: 0, '24h': 1, '7d': 7, '30d': 30 }

export const VAR = {
  ivory: { id: 'ivory', label: { he: 'שנהב', en: 'Ivory', ar: 'عاجي' }, fill: '#F2EBDD' },
  white: { id: 'white', label: { he: 'לבן אופטי', en: 'Optic white', ar: 'أبيض ناصع' }, fill: '#FCFCFA' },
  champagne: { id: 'champagne', label: { he: 'שמפניה', en: 'Champagne', ar: 'شمبانيا' }, fill: '#E8D8BC' },
  blush: { id: 'blush', label: { he: 'ורוד אבקה', en: 'Blush', ar: 'وردي فاتح' }, fill: '#EFDCD6' },
} satisfies Record<string, Variation>

const RIGHTS = { source: 'איור קו פנימי לאב הטיפוס', usage: 'הדגמה פנימית בלבד', documented: '26.11.2026' }

export const MODELS: Model[] = [
  { id: 'SH-1001', name: 'Aurora', silhouette: 'aline', collection: 'Atelier 2027', sizes: [34, 36, 38, 40, 42, 44], variations: [VAR.ivory, VAR.white, VAR.champagne], sleeves: false, retailPrice: 9800, rights: RIGHTS, salons: ['s-hfa', 's-par'] },
  { id: 'SH-1002', name: 'Selene', silhouette: 'mermaid', collection: 'Atelier 2027', sizes: [34, 36, 38, 40, 42], variations: [VAR.ivory, VAR.white], sleeves: true, retailPrice: 12400, rights: RIGHTS, salons: ['s-hfa'] },
  { id: 'SH-1003', name: 'Odette', silhouette: 'ballgown', collection: 'Grand Salon', sizes: [36, 38, 40, 42, 44, 46], variations: [VAR.white, VAR.champagne, VAR.blush], sleeves: false, retailPrice: 14900, rights: RIGHTS, salons: ['s-hfa', 's-par'] },
  { id: 'SH-1004', name: 'Lune', silhouette: 'sheath', collection: 'Minimal', sizes: [34, 36, 38, 40], variations: [VAR.ivory, VAR.white], sleeves: true, retailPrice: 7600, rights: RIGHTS, salons: ['s-par'] },
  { id: 'SH-1005', name: 'Iris', silhouette: 'empire', collection: 'Minimal', sizes: [36, 38, 40, 42, 44], variations: [VAR.ivory, VAR.blush], sleeves: false, retailPrice: 6900, rights: RIGHTS, salons: ['s-hfa'] },
  { id: 'SH-1006', name: 'Camille', silhouette: 'offshoulder', collection: 'Grand Salon', sizes: [34, 36, 38, 40, 42, 44], variations: [VAR.white, VAR.champagne], sleeves: false, retailPrice: 11200, rights: RIGHTS, salons: ['s-hfa', 's-par'] },
]

export const SALONS: Salon[] = [
  { id: 's-hfa', name: 'סלון הדגמה א׳', place: 'חיפה Haifa, Israel', jurisdiction: 'IL', retentionDefault: '7d' },
  { id: 's-par', name: 'סלון הדגמה ב׳', place: 'פריז Paris, France', jurisdiction: 'EU', retentionDefault: 'session' },
]

export const USERS: User[] = [
  { id: 'u1', name: 'בעלת סלון א׳', salon: 's-hfa', role: 'owner' },
  { id: 'u2', name: 'יועצת נועה', salon: 's-hfa', role: 'consultant' },
  { id: 'u3', name: 'מתלמדת ליה', salon: 's-hfa', role: 'trainee' },
  { id: 'u4', name: 'Conseillère Claire', salon: 's-par', role: 'consultant' },
  { id: 'u5', name: 'Propriétaire Salon B', salon: 's-par', role: 'owner' },
]

// מטריצת הרשאות קשיחה. בפועל תיאכף בשרת (RLS), כאן היא מודגמת בצד הלקוח.
export type Action = 'session' | 'capture' | 'favorites' | 'requestOrder' | 'approveOrder' | 'seePrice' | 'sendQuote' | 'audit' | 'catalog'
export const ACTIONS: { id: Action; he: string }[] = [
  { id: 'session', he: 'פתיחת סשן הדמיה' },
  { id: 'capture', he: 'צילום בהסכמה' },
  { id: 'favorites', he: 'שמירת מועדפים' },
  { id: 'requestOrder', he: 'בקשה להזמנה' },
  { id: 'seePrice', he: 'צפייה במחיר לצרכן' },
  { id: 'sendQuote', he: 'מסירת הצעת מחיר' },
  { id: 'approveOrder', he: 'אישור הזמנה' },
  { id: 'audit', he: 'יומן פעולות מלא' },
  { id: 'catalog', he: 'העלאת דגמים למאגר' },
]
export const PERMS: Record<Role, Action[]> = {
  owner: ['session', 'capture', 'favorites', 'requestOrder', 'seePrice', 'sendQuote', 'approveOrder', 'audit', 'catalog'],
  consultant: ['session', 'capture', 'favorites', 'requestOrder', 'seePrice'],
  trainee: ['session', 'capture', 'favorites'],
}
export const ROLE_HE: Record<Role, string> = { owner: 'בעלת סלון', consultant: 'יועצת', trainee: 'מתלמדת' }

export const can = (u: User, a: Action) => PERMS[u.role].includes(a)
// הקטלוג המלא: דגמים שהועלו למאגר, ואחריהם דגמי ההדגמה המאוירים
let REMOTE: Model[] = []
export const VAR_PHOTO: Variation = { id: 'photo', label: { he: 'כמו בתמונה', en: 'As photographed', ar: 'كما في الصورة' }, fill: '#FFFFFF' }
// שם קריא במקום שם קובץ של מצלמה או WhatsApp
const ugly = /whatsapp|^img[ _-]?\d|^dsc|^image\s|^photo|^\d{6,}/i
let BACKS: { id: string; name: string; url: string; group: string }[] = []
export const backgrounds = () => BACKS
let POSES: string[] = []
/** תנוחות ייחוס: מה שהועלה ללשונית "תנוחות", ואם אין, צילומי הדוגמניות של הקולקציה */
export const poseRefs = (exceptGarment?: string) => (POSES.length ? POSES : REMOTE.map(m => m.garment!).filter(Boolean)).filter(u => u !== exceptGarment)
export function setRemote(all: any[]) {
  POSES = all.filter(m => m.kind === 'pose').map(m => m.image)
  BACKS = all.filter(m => m.kind === 'background').map(m => ({ id: m.id, name: cleanBgName(m.name), url: m.image, group: BG_FOLDERS.includes(m.collection) || (m.collection && m.collection !== 'רקעים') ? m.collection : classifyBg(m.name) }))
  const list = all.filter(m => m.kind !== 'background' && m.kind !== 'pose').sort((a, b) => a.createdAt - b.createdAt)
  const count: Record<string, number> = {}
  for (const m of list) { count[m.collection] = (count[m.collection] || 0) + 1; m._n = count[m.collection]; if (ugly.test(m.name || '')) m.name = `דגם ${String(m._n).padStart(2, '0')}` }
  REMOTE = list.map(m => ({
    id: m.id, name: m.name, collection: m.collection, sizes: m.sizes, variations: [VAR_PHOTO], sleeves: false,
    retailPrice: m.retailPrice || 0, image: m.cover || m.image, garment: m.image, aspect: m.cover ? 0.75 : m.aspect, uploaded: true, cutout: m.cutout !== false,
    rights: { source: m.rights, usage: 'שימוש בסלון', documented: new Date(m.createdAt).toLocaleDateString('he-IL') },
    salons: m.salons?.length ? m.salons : SALONS.map(x => x.id),
  }))
}
export const allModels = () => REMOTE // דגמי ההדגמה המאוירים הוסרו: רק הקולקציה האמיתית
export const findModel = (id: string | null | undefined) => allModels().find(m => m.id === id)
export const modelsFor = (u: User) => allModels().filter(m => m.salons.includes(u.salon))
export const collectionsOf = (list: Model[]) => [...new Set(list.map(m => m.collection))]
export const salonOf = (u: User) => SALONS.find(s => s.id === u.salon)!

// מה שאין במערכת בכלל, ולכן לא יכול לדלוף
export const NEVER = ['מחירי רכישה', 'לקוחות של סלונים אחרים', 'ספרי החנות', 'נתוני החברה הבינלאומית']

// מיון רקעים לתיקיות לפי השם: חלל ואדריכלות לחדר, טקסטורה וצבע לקיר, טבע לנוף
export const BG_FOLDERS = ['חדר סטודיו', 'קיר סטודיו', 'נוף']
export function classifyBg(name: string) {
  const n = ` ${(name || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} ` // מילים שלמות בלבד
  const has = (words: string[]) => words.some(w => n.includes(` ${w} `) || n.includes(` ${w}`) && w.length > 3)
  if (has(['חלל', 'חדר', 'סטודיו', 'קשת', 'קשתות', 'אולם', 'תיכוני', 'room', 'interior', 'arch', 'hall', 'loft', 'studio'])) return 'חדר סטודיו'
  if (has(['נוף', 'חוף', 'ים', 'גן', 'יער', 'שדה', 'מדבר', 'beach', 'sea', 'garden', 'forest', 'field', 'desert', 'landscape', 'mountain', 'park'])) return 'נוף'
  return 'קיר סטודיו' // טקסטורות, צבעים, בדים: קיר רקע
}
/** שם רקע קצר וקריא: בלי קידומת מחולל, עד ארבע מילים */
export function cleanBgName(name: string) {
  const s = (name || '').replace(/^anatsht\s+/i, '').replace(/\s+(and|with)\s+.*$/i, '').replace(/[_-]+/g, ' ').trim()
  return s.split(/\s+/).slice(0, 4).join(' ') || 'רקע'
}
