// החלפת רקע: מפרידים את הכלה מהרקע במכשיר עצמו (MediaPipe, רישיון Apache 2.0),
// ומניחים אותה על רקע סטודיו או על נוף שבעלת העסק העלתה. בלי שרת ובלי תשלום.
import type { ImageSegmenter } from '@mediapipe/tasks-vision'

export interface Backdrop { id: string; label: string; kind: 'original' | 'studio' | 'image'; tones?: [string, string, string]; url?: string }

// רקעי סטודיו: קיר רציף שמתעגל לרצפה, כמו נייר צילום בסטודיו אופנה
export const STUDIO: Backdrop[] = [
  { id: 'orig', label: 'מקור', kind: 'original' },
  { id: 'paper', label: 'סטודיו לבן', kind: 'studio', tones: ['#fbfaf8', '#ecebe8', '#dcdad6'] },
  { id: 'stone', label: 'סטודיו אבן', kind: 'studio', tones: ['#e8e4de', '#cfc9c1', '#b5aea5'] },
  { id: 'sand', label: 'סטודיו חול', kind: 'studio', tones: ['#efe6da', '#ddd0bf', '#c7b7a2'] },
  { id: 'night', label: 'סטודיו כהה', kind: 'studio', tones: ['#4a4744', '#2c2a28', '#161514'] },
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

/** מסכת אדם (0 עד 1) בגודל התמונה */
async function personAlpha(img: HTMLImageElement) {
  const seg = await segmenter()
  const r = seg.segment(img)
  const m = r.confidenceMasks![0] // ערוץ 0: רקע
  const w = m.width, h = m.height, bgConf = m.getAsFloat32Array()
  const a = new Float32Array(w * h)
  for (let i = 0; i < a.length; i++) { const p = 1 - bgConf[i]; a[i] = p < 0.35 ? 0 : p > 0.65 ? 1 : (p - 0.35) / 0.3 }
  r.close()
  return { a, w, h }
}

function paintStudio(cx: CanvasRenderingContext2D, W: number, H: number, [hi, mid, lo]: [string, string, string]) {
  const horizon = H * 0.78
  const wall = cx.createRadialGradient(W / 2, H * 0.35, W * 0.05, W / 2, H * 0.4, Math.max(W, H) * 0.8)
  wall.addColorStop(0, hi); wall.addColorStop(0.6, mid); wall.addColorStop(1, lo)
  cx.fillStyle = wall; cx.fillRect(0, 0, W, H)
  const floor = cx.createLinearGradient(0, horizon - H * 0.06, 0, H)
  floor.addColorStop(0, 'rgba(0,0,0,0)'); floor.addColorStop(0.35, 'rgba(0,0,0,.05)'); floor.addColorStop(1, 'rgba(0,0,0,.12)')
  cx.fillStyle = floor; cx.fillRect(0, horizon - H * 0.06, W, H)
}

/** מחזירה את התמונה על הרקע שנבחר, כ-JPEG */
export async function applyBackdrop(src: string, b: Backdrop): Promise<string> {
  if (b.kind === 'original') return src
  const img = await load(src)
  const W = img.naturalWidth, H = img.naturalHeight
  const { a, w, h } = await personAlpha(img)
  let area = 0; for (let i = 0; i < a.length; i++) if (a[i] > 0.5) area++
  if (area < a.length * 0.03) throw new Error('no-person') // לא זוהתה דמות: לא מחזירים רקע ריק

  const person = document.createElement('canvas'); person.width = W; person.height = H
  const pc = person.getContext('2d')!; pc.drawImage(img, 0, 0)
  const pd = pc.getImageData(0, 0, W, H)
  for (let y = 0; y < H; y++) {
    const my = Math.min(h - 1, Math.floor(y * h / H))
    for (let x = 0; x < W; x++) pd.data[(y * W + x) * 4 + 3] = Math.round(255 * a[my * w + Math.min(w - 1, Math.floor(x * w / W))])
  }
  pc.putImageData(pd, 0, 0)

  const out = document.createElement('canvas'); out.width = W; out.height = H
  const cx = out.getContext('2d')!
  if (b.kind === 'studio') paintStudio(cx, W, H, b.tones!)
  else {
    const bg = await load(b.url!)
    const k = Math.max(W / bg.width, H / bg.height) // רקע ממלא את הפריים
    cx.drawImage(bg, (W - bg.width * k) / 2, (H - bg.height * k) / 2, bg.width * k, bg.height * k)
  }
  // צל רך לרגליים, כדי שהכלה תעמוד על הרצפה ולא תרחף
  let bottom = 0, left = W, right = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > 0.5) { if (y > bottom) bottom = y; if (x < left) left = x; if (x > right) right = x }
  const fy = (bottom / h) * H, fx = ((left + right) / 2 / w) * W, fw = ((right - left) / w) * W * 0.6
  const sh = cx.createRadialGradient(fx, fy, 1, fx, fy, Math.max(20, fw))
  sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)')
  cx.save(); cx.translate(0, fy); cx.scale(1, 0.18); cx.translate(0, -fy); cx.fillStyle = sh; cx.fillRect(0, fy - fw, W, fw * 2); cx.restore()
  cx.drawImage(person, 0, 0)
  return out.toDataURL('image/jpeg', 0.92)
}
