import { put, list, del } from '@vercel/blob'
import { authed, send, q, GALLERY, type Req, type Res } from './_lib.js'

// רשימת ההזמנות: נוצרת מהגלריה של הלקוחה או מהסטודיו, מנוהלת רק עם מפתח הסטודיו.
// orders/<id>-<suffix>.json
const STATUS = ['new', 'approved', 'paid', 'delivered', 'cancelled']

async function all() {
  const { blobs } = await list({ prefix: 'orders/', limit: 1000 })
  const rows = await Promise.all(blobs.map(async b => { try { return { ...(await (await fetch(b.url, { cache: 'no-store' })).json()), _url: b.url } } catch { return null } }))
  return rows.filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt)
}

export default async function handler(req: Req, res: Res) {
  try {
    const body = req.body || {}
    // יצירה: פתוחה למחזיקת קישור הגלריה (הלקוחה), עם גבולות
    if (req.method === 'POST' && !body.id) {
      if (!GALLERY.test(body.g || '')) return send(res, 400, { error: 'גלריה לא תקינה' })
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((x: any) => ({
        modelId: String(x.modelId || '').slice(0, 40), name: String(x.name || '').slice(0, 60),
        price: Math.max(0, Math.min(1e6, Number(x.price) || 0)), image: /^https:\/\//.test(x.image || '') ? String(x.image) : '',
      }))
      if (!items.length) return send(res, 400, { error: 'אין פריטים' })
      const id = `ord-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
      const o = { id, g: body.g, client: String(body.client || '').slice(0, 60), source: body.source === 'studio' ? 'studio' : 'gallery', items, total: items.reduce((s: number, x: any) => s + x.price, 0), status: 'new', note: '', createdAt: Date.now() }
      await put(`orders/${id}.json`, JSON.stringify(o), { access: 'public', contentType: 'application/json', addRandomSuffix: true })
      return send(res, 200, o)
    }
    if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
    if (req.method === 'GET') return send(res, 200, (await all()).map(({ _url, ...o }: any) => o))
    if (req.method === 'POST') {
      const cur: any = (await all()).find((o: any) => o.id === body.id)
      if (!cur) return send(res, 404, { error: 'לא נמצא' })
      const p = body.patch || {}
      const next = { ...cur, status: STATUS.includes(p.status) ? p.status : cur.status, note: p.note !== undefined ? String(p.note).slice(0, 1000) : cur.note, total: p.total !== undefined ? Math.max(0, Number(p.total) || 0) : cur.total, client: p.client !== undefined ? String(p.client).slice(0, 60) : cur.client, updatedAt: Date.now() }
      delete next._url
      await put(`orders/${cur.id}.json`, JSON.stringify(next), { access: 'public', contentType: 'application/json', addRandomSuffix: true })
      await del(cur._url)
      return send(res, 200, next)
    }
    if (req.method === 'DELETE') {
      const cur: any = (await all()).find((o: any) => o.id === q(req, 'id'))
      if (cur) await del(cur._url)
      return send(res, 200, { ok: !!cur })
    }
    send(res, 405, { error: 'method' })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
