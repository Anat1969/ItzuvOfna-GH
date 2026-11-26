import { put, list, del } from '@vercel/blob'
import { authed, send, type Req, type Res } from './_lib.js'

// הגדרות העסק: שם, WhatsApp להזמנות וקישור תשלום (Bit, PayBox וכדומה). קריאה פתוחה, כתיבה במפתח.
async function current() {
  const { blobs } = await list({ prefix: 'settings/' })
  const last = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0]
  if (!last) return { blobs, data: {} }
  try { return { blobs, data: await (await fetch(last.url, { cache: 'no-store' })).json() } } catch { return { blobs, data: {} } }
}

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method === 'GET') return send(res, 200, (await current()).data)
    if (!authed(req)) return send(res, 401, { error: 'מפתח סטודיו שגוי' })
    if (req.method === 'POST') {
      const b = req.body || {}
      const data = {
        business: String(b.business || '').slice(0, 60),
        whatsapp: String(b.whatsapp || '').replace(/[^\d]/g, '').slice(0, 15),
        payUrl: /^https:\/\//.test(b.payUrl || '') ? String(b.payUrl).slice(0, 300) : '',
      }
      const { blobs } = await current()
      await put('settings/business.json', JSON.stringify(data), { access: 'public', contentType: 'application/json', addRandomSuffix: true })
      if (blobs.length) await del(blobs.map(x => x.url))
      return send(res, 200, data)
    }
    send(res, 405, { error: 'method' })
  } catch (e: any) { send(res, 500, { error: String(e?.message || e) }) }
}
