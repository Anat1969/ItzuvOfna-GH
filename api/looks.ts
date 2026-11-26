import { put, list, del } from '@vercel/blob'
import { authed, send, dataUrlToBuffer, safeId, q, GALLERY, type Req, type Res } from './_lib.js'

// הגלריה האישית של כלה: תמונות מוכנות (כלה ודגם), בלי התצלום המקורי.
// שם הקובץ נושא את מועד המחיקה, ותמונה שפג תוקפה נמחקת בקריאה הבאה.
// looks/<gallery>/<expiresMs>_<modelId>_<engine>.jpg

function parse(b: { url: string; pathname: string; uploadedAt: Date }) {
  const name = b.pathname.split('/').pop() || ''
  const [exp, modelId, engine] = name.replace(/-[A-Za-z0-9]+\.(jpg|png)$/, '').split('_')
  return { url: b.url, expires: Number(exp) || 0, modelId: modelId || '', engine: engine || 'local', uploadedAt: new Date(b.uploadedAt).getTime() }
}

export default async function handler(req: Req, res: Res) {
  try {
    const g = q(req, 'g') || req.body?.g || ''
    if (!GALLERY.test(g)) return send(res, 400, { error: 'קישור גלריה לא תקין' })
    const prefix = `looks/${g}/`

    // פרטי הלקוחה לגלריה שלה: התצלום והשם. מחזיקת הקישור היא הלקוחה עצמה.
    if (req.method === 'GET' && q(req, 'who') === '1') {
      const { blobs } = await list({ prefix: `clients/${g}/`, limit: 100 })
      const photo = blobs.find(b => !/\/name-/.test(b.pathname))?.url || ''
      const meta = blobs.filter(b => /\/name-/.test(b.pathname)).pop()
      let name = ''
      if (meta) { try { name = (await (await fetch(meta.url, { cache: 'no-store' })).json()).name } catch { /* */ } }
      else if (photo) { const f = photo.split('/').pop() || ''; const nm = f.replace(/-[A-Za-z0-9]+\.(jpg|png|webp)$/, '').split('_').slice(1).join('_'); try { name = Buffer.from(nm, 'base64url').toString('utf8') } catch { /* */ } }
      return send(res, 200, { photo, name })
    }
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix, limit: 1000 })
      const now = Date.now()
      const items = blobs.map(parse)
      const expired = items.filter(i => i.expires && i.expires < now)
      if (expired.length) await del(expired.map(i => i.url))
      return send(res, 200, items.filter(i => !i.expires || i.expires >= now).sort((a, b) => a.uploadedAt - b.uploadedAt))
    }

    if (req.method === 'POST') {
      if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
      const { image, modelId, days, engine } = req.body || {}
      const d = Math.min(365, Math.max(1, Number(days) || 180))
      const img = dataUrlToBuffer(image)
      const expires = Date.now() + d * 864e5
      const up = await put(`${prefix}${expires}_${safeId(modelId) || 'model'}_${engine === 'ai' ? 'ai' : 'local'}.${img.ext}`, img.buf, { access: 'public', contentType: img.type, addRandomSuffix: true })
      return send(res, 200, { url: up.url, expires })
    }

    // מחיקה פתוחה למחזיקת הקישור: הכלה מוחקת בעצמה
    if (req.method === 'DELETE') {
      const { blobs } = await list({ prefix, limit: 1000 })
      const url = q(req, 'url')
      const targets = q(req, 'all') === '1' ? blobs.map(b => b.url) : blobs.filter(b => b.url === url).map(b => b.url)
      if (targets.length) await del(targets)
      return send(res, 200, { deleted: targets.length })
    }
    send(res, 405, { error: 'method' })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
