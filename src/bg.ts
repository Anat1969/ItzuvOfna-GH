// הרכבת צילום אופנה: הלקוחה מופרדת מהרקע במכשיר (MediaPipe, Apache 2.0) ומונחת על רקע סטודיו
// או על רקע שהועלה, כמו בעיבוד של צילום מגזין: קצוות רכים, התאמת צבע ואור, זליגת אור מהרקע,
// צל מגע, עומק שדה, גרעין אחיד ומיקום על הרצפה. בלי שרת ובלי תשלום.
import type { ImageSegmenter } from '@mediapipe/tasks-vision'

export interface Backdrop { id: string; label: string; kind: 'original' | 'studio' | 'image'; tones?: [string, string, string]; url?: string; group?: string }

export const STUDIO: Backdrop[] = [
  { id: 'orig', label: 'מקור', kind: 'original', group: 'מקור' },
  { id: 'paper', label: 'לבן', kind: 'studio', tones: ['#fbfaf8', '#ecebe8', '#d6d3cf'], group: 'סטודיו מובנה' },
  { id: 'stone', label: 'אבן', kind: 'studio', tones: ['#e8e4de', '#cfc9c1', '#aaa298'], group: 'סטודיו מובנה' },
  { id: 'sand', label: 'חול', kind: 'studio', tones: ['#efe6da', '#ddd0bf', '#bfae97'], group: 'סטודיו מובנה' },
  { id: 'night', label: 'כהה', kind: 'studio', tones: ['#4a4744', '#2c2a28', '#121110'], group: 'סטודיו מובנה' },
]

let segP: Promise<ImageSegmenter> | null = null
function segmenter() {
  segP ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
    const fs = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    return ImageSegmenter.createFromOptions(fs, {
      baseOptions: { modelAssetPath: '/mediapipe/selfie_multiclass.tflite', delegate: 'CPU' },
      runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true,
    })
  })()
  return segP
}

const load = (src: string) => new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = bad; i.src = src })
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** מסכה רכה בגודל המודל: חדות בליבה, מעבר רך בקצה, בלי הילה של הרקע הישן */
async function matte(img: HTMLImageElement) {
  const seg = await segmenter()
  const r = seg.segment(img)
  const m = r.confidenceMasks![0]
  const w = m.width, h = m.height, bg = m.getAsFloat32Array()
  const c = canvas(w, h), cx = c.getContext('2d')!, id = cx.createImageData(w, h)
  let area = 0, x0 = w, x1 = 0, y0 = h, y1 = 0
  for (let i = 0; i < w * h; i++) {
    const p = 1 - bg[i]
    const a = clamp((p - 0.42) / 0.36, 0, 1) // מעט שחיקה של הקצה מעלימה את שארית הרקע הישן
    id.data[i * 4 + 3] = Math.round(a * 255)
    if (a > 0.5) { area++; const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  r.close()
  cx.putImageData(id, 0, 0)
  return { c, w, h, area: area / (w * h), box: { x0: x0 / w, x1: x1 / w, y0: y0 / h, y1: y1 / h } }
}

function paintStudio(cx: CanvasRenderingContext2D, W: number, H: number, [hi, mid, lo]: [string, string, string], floorY: number) {
  // קיר רציף שמתעגל לרצפה (סייקלורמה), עם אור מפתח רך מלמעלה ומשמאל
  const wall = cx.createRadialGradient(W * 0.42, H * 0.3, W * 0.05, W / 2, H * 0.45, Math.max(W, H) * 0.85)
  wall.addColorStop(0, hi); wall.addColorStop(0.55, mid); wall.addColorStop(1, lo)
  cx.fillStyle = wall; cx.fillRect(0, 0, W, H)
  const sweep = cx.createLinearGradient(0, floorY - H * 0.12, 0, H)
  sweep.addColorStop(0, 'rgba(0,0,0,0)'); sweep.addColorStop(0.45, 'rgba(0,0,0,.045)'); sweep.addColorStop(1, 'rgba(0,0,0,.14)')
  cx.fillStyle = sweep; cx.fillRect(0, floorY - H * 0.12, W, H)
}

function avgColor(cx: CanvasRenderingContext2D, W: number, H: number, mask?: CanvasRenderingContext2D) {
  const d = cx.getImageData(0, 0, W, H).data, md = mask?.getImageData(0, 0, W, H).data
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < d.length; i += 16) { const wgt = md ? md[i + 3] / 255 : 1; if (wgt < 0.5) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
  n = Math.max(1, n)
  return { r: r / n, g: g / n, b: b / n, l: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n }
}

/** הלקוחה על הרקע שנבחר, כצילום אופנה מוגמר (JPEG, 3:4) */
export async function applyBackdrop(src: string, b: Backdrop): Promise<string> {
  if (b.kind === 'original') return src
  const img = await load(src)
  const mt = await matte(img)
  if (mt.area < 0.03) throw new Error('no-person') // לא זוהתה דמות: לא מחזירים רקע ריק

  const W = 1200, H = 1600, floorY = H * 0.93
  // מיקום: הדמות בגובה כ-84% מהפריים, הרגליים על הרצפה, במרכז
  const iw = img.naturalWidth, ih = img.naturalHeight
  const ph = (mt.box.y1 - mt.box.y0) * ih
  const k = clamp((H * 0.84) / Math.max(1, ph), 0.5, 2.4)
  const dw = iw * k, dh = ih * k
  const dx = W / 2 - ((mt.box.x0 + mt.box.x1) / 2) * dw
  const dy = floorY - mt.box.y1 * dh

  // שכבת המסכה בגודל הסופי: הגדלה חלקה וריכוך של פיקסל וחצי
  const mask = canvas(W, H), mc = mask.getContext('2d')!
  mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high'; mc.filter = 'blur(1.4px)'
  mc.drawImage(mt.c, dx, dy, dw, dh); mc.filter = 'none'

  // רקע
  const back = canvas(W, H), bc = back.getContext('2d')!
  if (b.kind === 'studio') paintStudio(bc, W, H, b.tones!, floorY)
  else {
    const bg = await load(b.url!)
    const s = Math.max(W / bg.width, H / bg.height)
    bc.filter = 'blur(2.2px)' // עומק שדה: הרקע רך, הלקוחה חדה
    bc.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s)
    bc.filter = 'none'
  }

  // הלקוחה: גזירה לפי המסכה
  const person = canvas(W, H), pc = person.getContext('2d')!
  pc.imageSmoothingQuality = 'high'
  pc.drawImage(img, dx, dy, dw, dh)
  pc.globalCompositeOperation = 'destination-in'; pc.drawImage(mask, 0, 0); pc.globalCompositeOperation = 'source-over'

  // התאמת צבע ואור: חשיפה וטמפרטורה לכיוון הרקע, בעדינות
  const bgc = avgColor(bc, W, H), pcol = avgColor(pc, W, H, mc)
  const expo = clamp(Math.sqrt((bgc.l * 0.55 + 128 * 0.45) / Math.max(30, pcol.l)), 0.86, 1.14)
  const graded = canvas(W, H), gc = graded.getContext('2d')!
  gc.filter = `brightness(${expo.toFixed(3)}) saturate(0.96)`; gc.drawImage(person, 0, 0); gc.filter = 'none'
  gc.globalCompositeOperation = 'source-atop'
  gc.globalAlpha = 0.14; gc.fillStyle = `rgb(${bgc.r | 0},${bgc.g | 0},${bgc.b | 0})`; gc.fillRect(0, 0, W, H)
  gc.globalAlpha = 1; gc.globalCompositeOperation = 'source-over'

  // זליגת אור: צבע הרקע המטושטש נכנס מעט לשולי הדמות, כמו באור אמיתי
  const wrap = canvas(W, H), wc = wrap.getContext('2d')!
  wc.filter = 'blur(22px)'; wc.drawImage(back, 0, 0); wc.filter = 'none'
  const inner = canvas(W, H), ic = inner.getContext('2d')!
  ic.filter = 'blur(9px)'; ic.drawImage(mask, 0, 0); ic.filter = 'none'
  wc.globalCompositeOperation = 'destination-in'; wc.drawImage(mask, 0, 0)
  wc.globalCompositeOperation = 'destination-out'; wc.drawImage(inner, 0, 0); wc.drawImage(inner, 0, 0)
  wc.globalCompositeOperation = 'source-over'

  // הרכבה
  const out = canvas(W, H), o = out.getContext('2d')!
  o.drawImage(back, 0, 0)
  // צל מגע וצל רך: הדמות עומדת על הרצפה
  const fx = W / 2, fw = (mt.box.x1 - mt.box.x0) * dw
  for (const [rx, ry, a] of [[fw * 0.75, H * 0.022, 0.22], [fw * 0.38, H * 0.009, 0.42]] as const) {
    o.save(); o.translate(fx, floorY); o.scale(1, ry / rx)
    const g = o.createRadialGradient(0, 0, 1, 0, 0, rx)
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)')
    o.fillStyle = g; o.beginPath(); o.arc(0, 0, rx, 0, Math.PI * 2); o.fill(); o.restore()
  }
  o.drawImage(graded, 0, 0)
  o.globalCompositeOperation = 'screen'; o.globalAlpha = 0.32; o.drawImage(wrap, 0, 0)
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'

  // ויניטה עדינה וגרעין אחיד, שמאחדים את שתי השכבות לצילום אחד
  const v = o.createRadialGradient(W / 2, H * 0.46, H * 0.35, W / 2, H * 0.5, H * 0.85)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.16)')
  o.fillStyle = v; o.fillRect(0, 0, W, H)
  const grain = canvas(240, 320), gx = grain.getContext('2d')!, gd = gx.createImageData(240, 320)
  for (let i = 0; i < gd.data.length; i += 4) { const n = 128 + (Math.random() - 0.5) * 36; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = n; gd.data[i + 3] = 255 }
  gx.putImageData(gd, 0, 0)
  o.globalCompositeOperation = 'overlay'; o.globalAlpha = 0.06
  for (let y = 0; y < H; y += 320) for (let x = 0; x < W; x += 240) o.drawImage(grain, x, y)
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over'
  return out.toDataURL('image/jpeg', 0.93)
}
