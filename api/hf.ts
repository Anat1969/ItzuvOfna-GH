import { timingSafeEqual } from 'node:crypto'
import { send, q, type Req, type Res } from './_lib.js'

// בדיקה זמנית: מנועי מדידה וירטואלית חינמיים ב-Hugging Face.
const same = (a: string, b: string) => !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const LEFFA = 'https://franciszzj-leffa.hf.space'

async function get(url: string) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); return { status: r.status, text: await r.text() } }
  catch (e: any) { return { status: 0, text: String(e?.message || e) } }
}
const img = (url: string) => ({ path: url, url, meta: { _type: 'gradio.FileData' } })

export default async function handler(req: Req, res: Res) {
  if (!same(q(req, 'probe'), process.env.STUDIO_KEY || '')) return send(res, 404, {})
  const mode = q(req, 'mode')
  if (mode === 'params') {
    const r = await get(`${LEFFA}/gradio_api/info`)
    try {
      const j = JSON.parse(r.text)
      const eps = Object.entries(j.named_endpoints || {}).map(([k, v]: any) => ({ endpoint: k, params: v.parameters.map((p: any) => ({ name: p.parameter_name, label: p.label, default: p.parameter_default, choices: p.type?.enum, component: p.component })), returns: v.returns?.map((x: any) => x.component) }))
      return send(res, 200, eps)
    } catch { return send(res, 200, r) }
  }
  if (mode === 'run') {
    const person = q(req, 'person'), garment = q(req, 'garment')
    const t0 = Date.now()
    const data = [img(person), img(garment), false, Number(q(req, 'steps') || 30), 2.5, 42, q(req, 'model') || 'dress_code', q(req, 'type') || 'dresses', false]
    try {
      const r1 = await fetch(`${LEFFA}/gradio_api/call/leffa_predict_vt`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}) }, body: JSON.stringify({ data }) })
      const j1: any = await r1.json().catch(() => ({}))
      if (!j1.event_id) return send(res, 200, { step: 'submit', status: r1.status, j1 })
      const r2 = await fetch(`${LEFFA}/gradio_api/call/leffa_predict_vt/${j1.event_id}`, { signal: AbortSignal.timeout(55000) })
      const txt = await r2.text()
      return send(res, 200, { ms: Date.now() - t0, stream: txt.slice(0, 3000) })
    } catch (e: any) { return send(res, 200, { ms: Date.now() - t0, error: String(e?.message || e) }) }
  }
  send(res, 400, { error: 'mode' })
}
