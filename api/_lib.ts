import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

export type Req = IncomingMessage & { body?: any; query: Record<string, string | string[]> }
export type Res = ServerResponse

export function send(res: Res, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function authed(req: Req) {
  const want = process.env.STUDIO_KEY || ''
  const got = String(req.headers['x-studio-key'] || '')
  if (!want || got.length !== want.length) return false
  return timingSafeEqual(Buffer.from(got), Buffer.from(want))
}

export const q = (req: Req, k: string) => { const v = req.query?.[k]; return Array.isArray(v) ? v[0] : (v ?? '') }

export function dataUrlToBuffer(d: string) {
  const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(d || '')
  if (!m) throw new Error('bad image')
  return { type: m[1], ext: m[2] === 'jpeg' ? 'jpg' : m[2], buf: Buffer.from(m[3], 'base64') }
}

export const safeId = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
export const GALLERY = /^[a-z0-9]{20,40}$/
