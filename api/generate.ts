import { authed, send, type Req, type Res } from './_lib'

// מנוע AI אופציונלי. פעיל רק אם הוגדר GEMINI_API_KEY בפרויקט ב-Vercel.
// מקבל את תצלום הכלה ואת תמונת הדגם, ומחזיר תמונה אחת שלה בשמלה.
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'

const strip = (d: string) => { const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(d || ''); return m ? { mime_type: m[1], data: m[2] } : null }

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' })
  if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
  const key = process.env.GEMINI_API_KEY
  if (!key) return send(res, 501, { error: 'מנוע AI לא מחובר' })
  const { photo, dress, name } = req.body || {}
  const p = strip(photo), d = strip(dress)
  if (!p || !d) return send(res, 400, { error: 'חסרות תמונות' })
  const prompt = `Dress the woman in the first image in the exact wedding dress shown in the second image (${String(name || '').slice(0, 40)}). Keep her face, body, pose, skin tone, hair and the original background unchanged. Reproduce the dress faithfully: silhouette, neckline, sleeves, lace and fabric texture, color. Photorealistic, natural light, full body, no text.`
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: p }, { inline_data: d }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
    })
    const j: any = await r.json()
    if (!r.ok) return send(res, 502, { error: j?.error?.message || 'שגיאת מנוע' })
    const part = j?.candidates?.[0]?.content?.parts?.find((x: any) => x.inline_data || x.inlineData)
    const img = part?.inline_data || part?.inlineData
    if (!img) return send(res, 502, { error: 'המנוע לא החזיר תמונה' })
    send(res, 200, { image: `data:${img.mime_type || img.mimeType || 'image/png'};base64,${img.data}` })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
