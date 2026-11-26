import { put, list, del } from '@vercel/blob'
import { authed, send, dataUrlToBuffer, q, GALLERY, type Req, type Res } from './_lib.js'

// ארכיון הלקוחות: תצלומי המקור של כל לקוחה, לפי סשן, עם שם ומועד מחיקה.
// clients/<gallery>/<expiresMs>_<name-base64url>.jpg ; גישה רק עם מפתח הסטודיו.
const enc = (s: string) => Buffer.from(s.slice(0, 60), 'utf8').toString('base64url')
const dec = (s: string) => { try { return Buffer.from(s, 'base64url').toString('utf8') } catch { return '' } }

export default async function handler(req: Req, res: Res) {
  if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'clients/', limit: 1000 })
      const now = Date.now()
      const expired = blobs.filter(b => Number(b.pathname.split('/')[2]?.split('_')[0]) < now)
      if (expired.length) await del(expired.map(b => b.url))
      const by: Record<string, any> = {}
      for (const b of blobs) {
        if (expired.includes(b)) continue
        const [, g, file] = b.pathname.split('/')
        const base = file.replace(/-[A-Za-z0-9]+\.(jpg|png|webp)$/, ''); const cut = base.indexOf('_')
        const exp = base.slice(0, cut), nm = base.slice(cut + 1)
        by[g] ??= { gallery: g, name: dec(nm || ''), expires: Number(exp), createdAt: new Date(b.uploadedAt).getTime(), photos: [] }
        by[g].photos.push(b.url)
        by[g].createdAt = Math.min(by[g].createdAt, new Date(b.uploadedAt).getTime())
      }
      return send(res, 200, Object.values(by).sort((a: any, b: any) => b.createdAt - a.createdAt))
    }
    if (req.method === 'POST') {
      const { g, image, name, days } = req.body || {}
      if (!GALLERY.test(g || '')) return send(res, 400, { error: 'סשן לא תקין' })
      const img = dataUrlToBuffer(image)
      const expires = Date.now() + Math.min(30, Math.max(1, Number(days) || 7)) * 864e5
      const up = await put(`clients/${g}/${expires}_${enc(String(name || ''))}.${img.ext}`, img.buf, { access: 'public', contentType: img.type, addRandomSuffix: true })
      return send(res, 200, { url: up.url })
    }
    if (req.method === 'DELETE') {
      const g = q(req, 'g')
      if (!GALLERY.test(g)) return send(res, 400, { error: 'סשן לא תקין' })
      const { blobs } = await list({ prefix: `clients/${g}/` })
      if (blobs.length) await del(blobs.map(b => b.url))
      return send(res, 200, { deleted: blobs.length })
    }
    send(res, 405, { error: 'method' })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
