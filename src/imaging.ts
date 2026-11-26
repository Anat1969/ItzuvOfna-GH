import type { Model } from './data'
import type { Transform } from './engine'
import { dressSvg, dressAspect, FIGURE_SVG } from './Stage'

const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, bad) => {
  const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => bad(new Error('image')); i.src = src
})
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
export const fileToDataUrl = (f: File) => new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(f) })

/**
 * האם הרקע אחיד? דוגמים את רצועת השוליים: רקע של צילום מוצר כמעט לא משתנה,
 * ואילו דוגמנית בחדר נותנת שוליים מגוונים. רק ברקע אחיד מציעים חיתוך.
 */
export async function bgUniform(src: string) {
  const img = await loadImg(src)
  const k = Math.min(1, 240 / Math.max(img.width, img.height))
  const W = Math.max(8, Math.round(img.width * k)), H = Math.max(8, Math.round(img.height * k))
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const cx = cv.getContext('2d', { willReadFrequently: true })!; cx.drawImage(img, 0, 0, W, H)
  const d = cx.getImageData(0, 0, W, H).data
  const px: number[][] = []
  const at = (x: number, y: number) => { const i = (y * W + x) * 4; px.push([d[i], d[i + 1], d[i + 2]]) }
  for (let x = 0; x < W; x++) { at(x, 0); at(x, 1); at(x, H - 1); at(x, H - 2) }
  for (let y = 0; y < H; y++) { at(0, y); at(1, y); at(W - 1, y); at(W - 2, y) }
  const m = [0, 1, 2].map(c => px.reduce((s, p) => s + p[c], 0) / px.length)
  const near = px.filter(p => Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]) < 26).length / px.length
  return near > 0.9
}

/**
 * חיתוך רקע לתמונת דגם: מילוי מהשוליים פנימה בכל פיקסל שדומה לצבע הרקע,
 * ריכוך קצוות, וחיתוך לתיבת השמלה. עובד היטב על צילום מוצר ברקע אחיד.
 */
export async function cutout(src: string, opts: { remove: boolean; tolerance: number; maxSide?: number }) {
  const img = await loadImg(src)
  const max = opts.maxSide ?? 1300
  const k = Math.min(1, max / Math.max(img.width, img.height))
  const W = Math.round(img.width * k), H = Math.round(img.height * k)
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const cx = cv.getContext('2d', { willReadFrequently: true })!
  cx.drawImage(img, 0, 0, W, H)
  if (!opts.remove) return { dataUrl: cv.toDataURL('image/jpeg', 0.9), aspect: W / H, cutout: false }

  const id = cx.getImageData(0, 0, W, H), d = id.data
  // צבע הרקע: ממוצע של רצועת השוליים
  let r = 0, g = 0, b = 0, n = 0
  const sample = (x: number, y: number) => { const i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
  for (let x = 0; x < W; x += 3) { sample(x, 0); sample(x, H - 1) }
  for (let y = 0; y < H; y += 3) { sample(0, y); sample(W - 1, y) }
  r /= n; g /= n; b /= n
  const tol = opts.tolerance, soft = tol * 1.7
  const dist = (i: number) => Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b)

  const seen = new Uint8Array(W * H)
  const stack: number[] = []
  const push = (p: number) => { if (!seen[p] && dist(p * 4) < soft) { seen[p] = 1; stack.push(p) } }
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (stack.length) {
    const p = stack.pop()!, x = p % W, y = (p - x) / W
    const dd = dist(p * 4)
    d[p * 4 + 3] = dd < tol ? 0 : Math.round(255 * (dd - tol) / (soft - tol))
    if (dd >= tol) continue // קצה רך: לא ממשיכים להתפשט דרכו
    if (x > 0) push(p - 1); if (x < W - 1) push(p + 1)
    if (y > 0) push(p - W); if (y < H - 1) push(p + W)
  }
  cx.putImageData(id, 0, 0)

  // חיתוך לתיבה של מה שנשאר
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 <= x0 || y1 <= y0) return { dataUrl: cv.toDataURL('image/png'), aspect: W / H, cutout: true }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const out = document.createElement('canvas'); out.width = cw; out.height = ch
  out.getContext('2d')!.drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch)
  return { dataUrl: out.toDataURL('image/png'), aspect: cw / ch, cutout: true }
}

/** מקטין תצלום לפני שליחה, כדי לעמוד במגבלת הגודל של השרת */
export async function shrink(src: string, maxSide = 1400, q = 0.88) {
  const img = await loadImg(src)
  const k = Math.min(1, maxSide / Math.max(img.width, img.height))
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k)
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', q)
}

/** תמונת דגם כ-data URL, גם לדגם מאויר (לשליחה למנוע AI) */
export async function dressDataUrl(model: Model, fill: string) {
  if (!model.image) return shrinkSvg(dressSvg(model, fill, 'x'))
  const img = await loadImg(model.image)
  const k = Math.min(1, 1100 / Math.max(img.width, img.height))
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k)
  const cx = cv.getContext('2d')!
  if (model.cutout === false) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height) }
  cx.drawImage(img, 0, 0, cv.width, cv.height)
  return model.cutout === false ? cv.toDataURL('image/jpeg', 0.88) : cv.toDataURL('image/png')
}

const fitInto = (cx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
  const k = Math.min(w / img.width, h / img.height)
  cx.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k)
}

/** דגם שצולם על דוגמנית: אי אפשר להלביש אותו בהרכבה, ולכן מציגים זה לצד זה */
export async function composePair(o: { photo: string | null; model: Model; watermark: string; caption: string }) {
  const W = 2000, H = 1400, G = 24
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const cx = cv.getContext('2d')!
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H)
  cx.fillStyle = '#f7f6f4'; cx.fillRect(0, 0, W / 2 - G / 2, H - 60); cx.fillRect(W / 2 + G / 2, 0, W / 2 - G / 2, H - 60)
  fitInto(cx, await loadImg(o.photo ?? svgUrl(FIGURE_SVG)), W / 2 + G / 2, 0, W / 2 - G / 2, H - 60)
  fitInto(cx, await loadImg(o.model.image!), 0, 0, W / 2 - G / 2, H - 60)
  stamp(cx, W, H, o.watermark, o.caption)
  return cv.toDataURL('image/jpeg', 0.9)
}
async function shrinkSvg(svg: string) {
  const img = await loadImg(svgUrl(svg))
  const cv = document.createElement('canvas'); cv.width = 660; cv.height = 960
  cv.getContext('2d')!.drawImage(img, 0, 0, 660, 960)
  return cv.toDataURL('image/png')
}

/**
 * הרכבת התמונה הסופית, באותה גאומטריה כמו הבמה במסך (3:4):
 * תצלום הכלה בהתאמה מלאה (בלי חיתוך), הדגם במיקום שנבחר, וסימון "המחשה בלבד".
 */
export async function composeLook(o: { photo: string | null; model: Model; fill: string; t: Transform; watermark: string; caption: string }) {
  const W = 1200, H = 1600
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const cx = cv.getContext('2d')!
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H)
  const base = await loadImg(o.photo ?? svgUrl(FIGURE_SVG))
  const k = Math.min(W / base.width, H / base.height)
  cx.drawImage(base, (W - base.width * k) / 2, (H - base.height * k) / 2, base.width * k, base.height * k)

  const dress = await loadImg(o.model.image ?? svgUrl(dressSvg(o.model, o.fill, 'c')))
  const dh = H * o.t.scale / 100, dw = dh * dressAspect(o.model) * o.t.width
  cx.save(); cx.shadowColor = 'rgba(0,0,0,.14)'; cx.shadowBlur = 8; cx.shadowOffsetY = 3
  cx.drawImage(dress, (W - dw) / 2, H * o.t.y / 100, dw, dh)
  cx.restore()
  stamp(cx, W, H, o.watermark, o.caption)
  return cv.toDataURL('image/jpeg', 0.9)
}

/** סימון קבוע על כל תמונה שיוצאת מהסטודיו */
export async function stampImage(src: string, watermark: string, caption: string) {
  const img = await loadImg(src)
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
  const cx = cv.getContext('2d')!; cx.drawImage(img, 0, 0)
  stamp(cx, cv.width, cv.height, watermark, caption)
  return cv.toDataURL('image/jpeg', 0.9)
}

function stamp(cx: CanvasRenderingContext2D, W: number, H: number, wm: string, caption: string) {
  const u = W / 1200
  cx.save()
  cx.fillStyle = 'rgba(17,17,17,.07)'; cx.font = `700 ${46 * u}px "IBM Plex Sans Hebrew", sans-serif`; cx.textAlign = 'center'
  for (let i = 0; i < 6; i++) { cx.save(); cx.translate(W / 2, H * (i + 0.5) / 6); cx.rotate(-0.42); cx.fillText(wm, 0, 0); cx.restore() }
  cx.restore()
  cx.fillStyle = '#111'; cx.fillRect(W - 230 * u, 22 * u, 208 * u, 44 * u)
  cx.fillStyle = '#fff'; cx.font = `500 ${22 * u}px "IBM Plex Sans Hebrew", sans-serif`; cx.textAlign = 'center'; cx.direction = 'rtl'
  cx.fillText(wm, W - 126 * u, 52 * u)
  cx.fillStyle = 'rgba(255,255,255,.88)'; cx.fillRect(0, H - 60 * u, W, 60 * u)
  cx.fillStyle = '#4a4846'; cx.font = `400 ${20 * u}px "IBM Plex Sans Hebrew", sans-serif`; cx.textAlign = 'right'
  cx.fillText(caption, W - 24 * u, H - 24 * u)
  cx.textAlign = 'left'; cx.direction = 'ltr'; cx.fillText('SHIRAN Bridal Studio', 24 * u, H - 24 * u)
}
