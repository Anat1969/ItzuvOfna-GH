import { timingSafeEqual } from 'node:crypto'
import { send, q, type Req, type Res } from './_lib.js'

// בדיקה זמנית: אילו מנועי מדידה וירטואלית חינמיים ב-Hugging Face פעילים, ומה הממשק שלהם.
const same = (a: string, b: string) => !!a && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const SPACES = ['zhengchong/CatVTON', 'Kwai-Kolors/Kolors-Virtual-Try-On', 'yisol/IDM-VTON', 'Nymbo/Virtual-Try-On', 'franciszzj/Leffa']

async function get(url: string) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); const t = await r.text(); return { status: r.status, body: t.slice(0, 3500) } }
  catch (e: any) { return { status: 0, body: String(e?.message || e) } }
}

export default async function handler(req: Req, res: Res) {
  if (!same(q(req, 'probe'), process.env.STUDIO_KEY || '')) return send(res, 404, {})
  const only = q(req, 'space')
  const list = only ? [only] : SPACES
  const out: any[] = []
  for (const s of list) {
    const meta = await get(`https://huggingface.co/api/spaces/${s}`)
    let stage = '', host = '', hw = ''
    try { const j = JSON.parse(meta.body); stage = j?.runtime?.stage; hw = j?.runtime?.hardware?.current; host = j?.host || '' } catch { /* */ }
    const sub = host || `https://${s.toLowerCase().replace(/[/_.]/g, '-')}.hf.space`
    const info = only ? (await get(`${sub}/gradio_api/info`)).status === 200 ? await get(`${sub}/gradio_api/info`) : await get(`${sub}/info`) : null
    out.push({ space: s, metaStatus: meta.status, stage, hw, host: sub, info })
  }
  send(res, 200, out)
}
