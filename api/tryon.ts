import { authed, send, type Req, type Res } from './_lib.js'

// מדידה וירטואלית חינמית: Leffa (מחקר פתוח, מתארח ב-Hugging Face).
// מקבל תצלום של הכלה ותמונת דגם, ומחזיר את הכלה בשמלה. בלי תשלום, בלי מפתח.
// HF_TOKEN (חשבון חינמי) מגדיל את המכסה היומית, אם יוגדר.
const SPACE = process.env.TRYON_SPACE || 'https://franciszzj-leffa.hf.space'
const img = (u: string) => ({ path: u, url: u, meta: { _type: 'gradio.FileData' } })

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' })
  if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
  const { person, garment, steps } = req.body || {}
  if (!/^data:image\//.test(person || '') || !/^https:\/\//.test(garment || '')) return send(res, 400, { error: 'חסרות תמונות' })
  const auth: Record<string, string> = process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}
  const t0 = Date.now()
  try {
    // מעלים את תצלום הכלה לשרת המנוע, כמו הממשק הרשמי שלו, ומקבלים נתיב
    const m0 = /^data:(image\/[a-z]+);base64,(.+)$/.exec(person)!
    const fd = new FormData()
    fd.append('files', new Blob([Buffer.from(m0[2], 'base64')], { type: m0[1] }), 'bride.jpg')
    const up = await fetch(`${SPACE}/gradio_api/upload`, { method: 'POST', body: fd, headers: auth })
    const paths: any = await up.json().catch(() => null)
    if (!Array.isArray(paths) || !paths[0]) { console.error('tryon upload failed', up.status, JSON.stringify(paths)?.slice(0, 300)); return send(res, 502, { error: 'העלאת התצלום לשירות ההלבשה נכשלה. נסי שוב.' }) }
    const personRef = { path: paths[0], orig_name: 'bride.jpg', meta: { _type: 'gradio.FileData' } }
    const data = [personRef, img(garment), false, Math.min(50, Math.max(10, Number(steps) || 30)), 2.5, 42, 'dress_code', 'dresses', false]
    const r1 = await fetch(`${SPACE}/gradio_api/call/leffa_predict_vt`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ data }) })
    const j1: any = await r1.json().catch(() => ({}))
    if (!j1.event_id) return send(res, 502, { error: 'שירות ההלבשה לא זמין כרגע. נסי שוב בעוד דקה.' })
    const r2 = await fetch(`${SPACE}/gradio_api/call/leffa_predict_vt/${j1.event_id}`, { headers: auth, signal: AbortSignal.timeout(52000) })
    const txt = await r2.text()
    if (/event: error/.test(txt)) {
      console.error('tryon error event', txt.slice(0, 600))
      return send(res, 503, { error: 'busy', detail: txt.slice(0, 200) })
    }
    const m = /event: complete\s*data: (\[.*\])/s.exec(txt)
    const out = m ? JSON.parse(m[1])?.[0]?.url : null
    if (!out) return send(res, 502, { error: 'השירות לא החזיר תמונה.' })
    const r3 = await fetch(out, { headers: auth })
    const buf = Buffer.from(await r3.arrayBuffer())
    send(res, 200, { image: `data:${r3.headers.get('content-type') || 'image/webp'};base64,${buf.toString('base64')}`, ms: Date.now() - t0 })
  } catch (e: any) {
    send(res, 504, { error: /timeout|abort/i.test(String(e?.message)) ? 'השירות עמוס ולא הספיק. נסי שוב.' : String(e?.message || e) })
  }
}
