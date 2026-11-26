import { put, list, del } from '@vercel/blob'
import { authed, send, dataUrlToBuffer, safeId, q, type Req, type Res } from './_lib.js'

// דגמים שהועלו: תמונה (בדרך כלל PNG שקוף) וקובץ נתונים לכל דגם
const META = 'models/meta/'

async function readAll() {
  const { blobs } = await list({ prefix: META, limit: 1000 })
  const items = await Promise.all(blobs.map(async b => {
    try { const r = await fetch(b.url, { cache: 'no-store' }); const m = await r.json(); return { ...m, metaUrl: b.url } } catch { return null }
  }))
  return items.filter(Boolean).sort((a: any, b: any) => (a.collection || '').localeCompare(b.collection || '', 'he') || b.createdAt - a.createdAt)
}

function clean(m: any) {
  const sizes = Array.isArray(m.sizes) ? m.sizes.map(Number).filter((n: number) => n > 20 && n < 70).slice(0, 20) : []
  return {
    id: safeId(m.id) || `m-${Date.now().toString(36)}`,
    name: String(m.name || 'דגם').slice(0, 60),
    collection: String(m.collection || 'ללא קולקציה').slice(0, 60),
    sizes: sizes.length ? sizes : [34, 36, 38, 40, 42, 44, 46],
    salons: Array.isArray(m.salons) ? m.salons.map(String).slice(0, 20) : [],
    retailPrice: Number(m.retailPrice) || 0,
    aspect: Math.min(3, Math.max(0.2, Number(m.aspect) || 0.6)),
    cutout: !!m.cutout,
    rights: String(m.rights || 'צילום הקולקציה, לשימוש בעסק').slice(0, 120),
    image: String(m.image || ''),
    kind: m.kind === 'background' ? 'background' : m.kind === 'pose' ? 'pose' : 'model',
    cover: /^https:\/\//.test(m.cover || '') ? String(m.cover) : '',
    createdAt: Number(m.createdAt) || Date.now(),
  }
}

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method === 'GET') return send(res, 200, await readAll())
    if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })

    if (req.method === 'POST') {
      const body = req.body || {}
      const meta = clean(body.meta || {})
      if (body.image) {
        const img = dataUrlToBuffer(body.image)
        const up = await put(`models/img/${meta.id}.${img.ext}`, img.buf, { access: 'public', contentType: img.type, addRandomSuffix: true })
        meta.image = up.url
      }
      if (body.cover) {
        const cv = dataUrlToBuffer(body.cover)
        const up = await put(`models/img/${meta.id}-cover.${cv.ext}`, cv.buf, { access: 'public', contentType: cv.type, addRandomSuffix: true })
        meta.cover = up.url
      }
      if (!meta.image) return send(res, 400, { error: 'חסרה תמונה' })
      const old = (await readAll()).filter((m: any) => m.id === meta.id)
      await put(`${META}${meta.id}.json`, JSON.stringify(meta), { access: 'public', contentType: 'application/json', addRandomSuffix: true })
      if (old.length) await del(old.map((m: any) => m.metaUrl))
      return send(res, 200, meta)
    }

    if (req.method === 'DELETE') {
      const id = safeId(q(req, 'id'))
      const hits = (await readAll()).filter((m: any) => m.id === id)
      if (!hits.length) return send(res, 404, { error: 'לא נמצא' })
      await del(hits.flatMap((m: any) => [m.metaUrl, m.image]).filter(Boolean))
      return send(res, 200, { ok: true })
    }
    send(res, 405, { error: 'method' })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
