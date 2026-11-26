// הלבשה על הכלה דרך Leffa (חינמי). קודם מהטאבלט עצמו, כדי שלכל מכשיר תהיה מכסה משלו,
// ואם הדפדפן נחסם או נכשל, דרך השרת. עד שלושה ניסיונות, עם המתנה קצרה ביניהם.
import { api } from './api'

const SPACE = 'https://franciszzj-leffa.hf.space'
const toDataUrl = (b: Blob) => new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(b) })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function viaBrowser(person: string, garment: string) {
  const blob = await (await fetch(person)).blob()
  const fd = new FormData(); fd.append('files', blob, 'bride.jpg')
  const up = await fetch(`${SPACE}/gradio_api/upload`, { method: 'POST', body: fd })
  const paths = await up.json()
  const data = [{ path: paths[0], orig_name: 'bride.jpg', meta: { _type: 'gradio.FileData' } }, { path: garment, url: garment, meta: { _type: 'gradio.FileData' } }, false, 30, 2.5, 42, 'dress_code', 'dresses', false]
  const r1 = await fetch(`${SPACE}/gradio_api/call/leffa_predict_vt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })
  const { event_id } = await r1.json()
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 90000)
  const txt = await (await fetch(`${SPACE}/gradio_api/call/leffa_predict_vt/${event_id}`, { signal: ctl.signal })).text()
  clearTimeout(t)
  const m = /event: complete\s*data: (\[.*\])/s.exec(txt)
  if (!m) throw new Error('busy')
  return toDataUrl(await (await fetch(JSON.parse(m[1])[0].url)).blob())
}

export async function dressBride(person: string, garment: string, onTry?: (n: number) => void): Promise<string> {
  let last = ''
  for (let i = 0; i < 3; i++) {
    onTry?.(i + 1)
    try { return await viaBrowser(person, garment) } catch (e: any) { last = String(e?.message || e) }
    try { return (await api.tryon(person, garment)).image } catch (e: any) { last = e.message }
    await sleep(2500 * (i + 1))
  }
  throw new Error(last === 'busy' || /busy|503/.test(last) ? 'שירות ההלבשה החינמי עמוס כרגע או שהמכסה היומית נגמרה. נסי שוב בעוד כמה דקות.' : last)
}
