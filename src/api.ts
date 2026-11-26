// לקוח ה-API של הסטודיו. מפתח הסטודיו נשמר במכשיר של הסלון בלבד.
const KEY = 'sbs_studio_key'
export const getKey = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
export const setKey = (k: string) => { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY) } catch { /* ignore */ } }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', 'x-studio-key': getKey(), ...(init.headers || {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `שגיאה ${r.status}`)
  return j as T
}

export interface Health { storage: boolean; ai: boolean; keyOk: boolean }
export interface RemoteModel { id: string; name: string; collection: string; sizes: number[]; salons: string[]; retailPrice: number; aspect: number; cutout: boolean; rights: string; image: string; createdAt: number }
export interface Look { url: string; expires: number; modelId: string; engine: 'local' | 'ai'; uploadedAt: number }

export const api = {
  health: () => call<Health>('/api/health'),
  models: () => call<RemoteModel[]>('/api/models'),
  saveModel: (meta: Partial<RemoteModel>, image?: string) => call<RemoteModel>('/api/models', { method: 'POST', body: JSON.stringify({ meta, image }) }),
  deleteModel: (id: string) => call('/api/models?id=' + encodeURIComponent(id), { method: 'DELETE' }),
  looks: (g: string) => call<Look[]>('/api/looks?g=' + g),
  saveLook: (g: string, image: string, modelId: string, days: number, engine: 'local' | 'ai') => call<{ url: string; expires: number }>('/api/looks', { method: 'POST', body: JSON.stringify({ g, image, modelId, days, engine }) }),
  deleteLook: (g: string, url: string) => call('/api/looks?g=' + g + '&url=' + encodeURIComponent(url), { method: 'DELETE' }),
  deleteGallery: (g: string) => call('/api/looks?g=' + g + '&all=1', { method: 'DELETE' }),
  generate: (photo: string, dress: string, name: string) => call<{ image: string }>('/api/generate', { method: 'POST', body: JSON.stringify({ photo, dress, name }) }),
}

export const newGalleryId = () => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  const b = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(b, x => a[x % a.length]).join('')
}
export const galleryUrl = (g: string) => `${location.origin}/#/g/${g}`
