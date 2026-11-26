import { timingSafeEqual } from 'node:crypto'
import { authed, send, q, type Req, type Res } from './_lib.js'

const DEFAULT_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
const same = (a: string, b: string) => !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// מצב השירותים, ובדיקת מפתח הסטודיו בלי לחשוף אותו. ai כבוי כל עוד AI_IMAGES לא on, כי הפקת תמונות ב-Gemini בתשלום.
// ?probe=<מפתח סטודיו>: הפקה אחת קטנה מטקסט, כדי לוודא שמנוע ה-AI עובד ושיש מכסה.
export default async function handler(req: Req, res: Res) {
  const base = { storage: !!process.env.BLOB_READ_WRITE_TOKEN, ai: !!process.env.GEMINI_API_KEY && process.env.AI_IMAGES === 'on', keyOk: authed(req) }
  const probe = q(req, 'probe')
  if (!probe || !same(probe, process.env.STUDIO_KEY || '')) return send(res, 200, base)
  const key = process.env.GEMINI_API_KEY
  if (!key) return send(res, 200, { ...base, probe: { ok: false, error: 'GEMINI_API_KEY חסר' } })
  const MODEL = (q(req, 'model') || DEFAULT_MODEL).replace(/[^a-z0-9.-]/gi, '').slice(0, 60)
  const t0 = Date.now()
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'A simple ivory wedding dress on a dress form, plain light grey background, product photo.' }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
    })
    const j: any = await r.json()
    const part = j?.candidates?.[0]?.content?.parts?.find((x: any) => x.inline_data || x.inlineData)
    const img = part?.inline_data || part?.inlineData
    send(res, 200, { ...base, probe: { ok: r.ok && !!img, status: r.status, model: MODEL, ms: Date.now() - t0, imageBytes: img ? Math.round(img.data.length * 0.75) : 0, error: j?.error?.message || (img ? '' : 'no image'), usage: j?.usageMetadata || null } })
  } catch (e: any) { send(res, 200, { ...base, probe: { ok: false, error: String(e?.message || e) } }) }
}
