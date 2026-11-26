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

export interface Order { id: string; g: string; client: string; source: 'gallery' | 'studio'; items: { modelId: string; name: string; price: number; image: string }[]; total: number; status: 'new' | 'approved' | 'paid' | 'delivered' | 'cancelled'; note: string; createdAt: number; updatedAt?: number }
export interface Biz { business?: string; whatsapp?: string; payUrl?: string; retentionDays?: number }
export interface Health { storage: boolean; ai: boolean; keyOk: boolean }
export interface RemoteModel { kind?: 'model' | 'background' | 'pose'; cover?: string; id: string; name: string; collection: string; sizes: number[]; salons: string[]; retailPrice: number; aspect: number; cutout: boolean; rights: string; image: string; createdAt: number }
export interface Look { url: string; expires: number; modelId: string; engine: 'local' | 'ai'; uploadedAt: number }

export const api = {
  health: () => call<Health>('/api/health'),
  models: () => call<RemoteModel[]>('/api/models'),
  saveModel: (meta: Partial<RemoteModel>, image?: string, cover?: string) => call<RemoteModel>('/api/models', { method: 'POST', body: JSON.stringify({ meta, image, cover }) }),
  deleteModel: (id: string) => call('/api/models?id=' + encodeURIComponent(id), { method: 'DELETE' }),
  galleryWho: (g: string) => call<{ photo: string; name: string }>('/api/looks?who=1&g=' + g),
  looks: (g: string) => call<Look[]>('/api/looks?g=' + g),
  saveLook: (g: string, image: string, modelId: string, days: number, engine: 'local' | 'ai') => call<{ url: string; expires: number }>('/api/looks', { method: 'POST', body: JSON.stringify({ g, image, modelId, days, engine }) }),
  deleteLook: (g: string, url: string) => call('/api/looks?g=' + g + '&url=' + encodeURIComponent(url), { method: 'DELETE' }),
  deleteGallery: (g: string) => call('/api/looks?g=' + g + '&all=1', { method: 'DELETE' }),
  settings: () => call<Biz>('/api/settings'),
  saveSettings: (s: Biz) => call('/api/settings', { method: 'POST', body: JSON.stringify(s) }),
  orders: () => call<Order[]>('/api/orders'),
  createOrder: (o: { g: string; client?: string; source: 'gallery' | 'studio'; items: { modelId: string; name: string; price: number; image: string }[] }) => call<Order>('/api/orders', { method: 'POST', body: JSON.stringify(o) }),
  updateOrder: (id: string, patch: Partial<Pick<Order, 'status' | 'note' | 'total' | 'client'>>) => call<Order>('/api/orders', { method: 'POST', body: JSON.stringify({ id, patch }) }),
  deleteOrder: (id: string) => call('/api/orders?id=' + id, { method: 'DELETE' }),
  clients: () => call<{ gallery: string; name: string; expires: number; createdAt: number; photos: string[] }[]>('/api/clients'),
  saveClient: (g: string, image: string, name: string, days: number) => call('/api/clients', { method: 'POST', body: JSON.stringify({ g, image, name, days }) }),
  renameClient: (g: string, name: string) => call('/api/clients', { method: 'POST', body: JSON.stringify({ g, name, rename: true }) }),
  deleteClient: (g: string) => call('/api/clients?g=' + g, { method: 'DELETE' }),
  tryon: (person: string, garment: string, pose = false) => call<{ image: string; ms: number }>('/api/tryon', { method: 'POST', body: JSON.stringify({ person, garment, pose }) }),
  generate: (photo: string, dress: string, name: string) => call<{ image: string }>('/api/generate', { method: 'POST', body: JSON.stringify({ photo, dress, name }) }),
}

export const newGalleryId = () => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789'
  const b = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(b, x => a[x % a.length]).join('')
}
export const galleryUrl = (g: string) => `${location.origin}/#/g/${g}`
