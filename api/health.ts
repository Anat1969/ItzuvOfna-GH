import { authed, send, type Req, type Res } from './_lib.js'

// מצב השירותים, ובדיקת מפתח הסטודיו בלי לחשוף אותו
export default function handler(req: Req, res: Res) {
  send(res, 200, {
    storage: !!process.env.BLOB_READ_WRITE_TOKEN,
    ai: !!process.env.GEMINI_API_KEY,
    keyOk: authed(req),
  })
}
