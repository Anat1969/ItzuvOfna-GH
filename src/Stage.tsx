import type { Silhouette, Model } from './data'
import type { Transform } from './engine'

// איורי קו של צלליות, בתיבת 200x300: y=0 קו הכתפיים, y=300 שולי השמלה.
const BODY: Record<Silhouette, string> = {
  aline: 'M70 0 L84 0 Q100 20 116 0 L130 0 L128 40 Q125 64 123 82 L176 296 Q100 308 24 296 L77 82 Q75 64 72 40 Z',
  mermaid: 'M70 0 L84 0 Q100 22 116 0 L130 0 L128 40 Q125 64 122 82 Q130 112 127 142 Q123 178 118 208 Q140 258 172 296 Q100 308 28 296 Q60 258 82 208 Q77 178 73 142 Q70 112 78 82 Q75 64 72 40 Z',
  ballgown: 'M70 0 L84 0 Q100 18 116 0 L130 0 L128 40 Q125 66 122 86 Q170 130 192 296 Q100 312 8 296 Q30 130 78 86 Q75 66 72 40 Z',
  sheath: 'M70 0 L84 0 Q100 24 116 0 L130 0 L128 40 Q125 64 122 82 Q130 120 128 160 Q126 230 132 296 Q100 302 68 296 Q74 230 72 160 Q70 120 78 82 Q75 64 72 40 Z',
  empire: 'M72 0 L86 0 Q100 16 114 0 L128 0 L127 30 Q126 40 124 48 Q150 150 162 296 Q100 306 38 296 Q50 150 76 48 Q74 40 73 30 Z',
  offshoulder: 'M46 6 Q72 -2 100 14 Q128 -2 154 6 L150 18 Q130 22 128 44 Q125 66 122 84 L172 296 Q100 308 28 296 L78 84 Q75 66 72 44 Q70 22 50 18 Z',
}
const WAIST: Record<Silhouette, number> = { aline: 82, mermaid: 82, ballgown: 86, sheath: 82, empire: 48, offshoulder: 84 }
const FOLDS: Record<Silhouette, string> = {
  aline: 'M100 90 L100 300 M88 92 L66 298 M112 92 L134 298 M80 96 L44 296 M120 96 L156 296',
  mermaid: 'M100 214 L100 302 M92 214 L70 298 M108 214 L130 298 M86 212 L48 296 M114 212 L152 296',
  ballgown: 'M100 94 L100 304 M88 96 L60 302 M112 96 L140 302 M80 100 L30 298 M120 100 L170 298',
  sheath: 'M100 92 L100 300 M90 120 L86 298 M110 120 L114 298',
  empire: 'M100 54 L100 302 M90 56 L70 300 M110 56 L130 300 M82 60 L50 298 M118 60 L150 298',
  offshoulder: 'M100 92 L100 300 M88 94 L64 298 M112 94 L136 298 M80 98 L42 296 M120 98 L158 296',
}

// מחרוזת SVG אחת משמשת גם למסך וגם להרכבת התמונה הסופית
export function dressSvg(model: Model, fill: string, uid: string) {
  const s = model.silhouette ?? 'aline'
  const w = WAIST[s]
  const sleeves = model.sleeves ? `<g fill="${fill}" fill-opacity=".55" stroke="#2a2a2a" stroke-width=".7">
      <path d="${s === 'offshoulder' ? 'M46 6 L30 150 L42 152 L54 18 Z' : 'M70 0 L50 6 L40 150 L52 152 L66 34 Z'}"/>
      <path d="${s === 'offshoulder' ? 'M154 6 L170 150 L158 152 L146 18 Z' : 'M130 0 L150 6 L160 150 L148 152 L134 34 Z'}"/></g>` : ''
  const wx = s === 'empire' ? [76, 124] : [77, 123]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 220 320" class="dress" direction="ltr" width="220" height="320">
    <defs><linearGradient id="vol-${uid}" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".35" stop-color="#000" stop-opacity="0"/>
      <stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>
    ${sleeves}
    <path d="${BODY[s]}" fill="${fill}" stroke="#2a2a2a" stroke-width=".9" stroke-linejoin="round"/>
    <path d="${BODY[s]}" fill="url(#vol-${uid})"/>
    <path d="${FOLDS[s]}" fill="none" stroke="#2a2a2a" stroke-opacity=".28" stroke-width=".6"/>
    <path d="M${wx[0]} ${w} Q100 ${w + 5} ${wx[1]} ${w}" fill="none" stroke="#2a2a2a" stroke-width=".7"/></svg>`
}

export const dressAspect = (m: Model) => m.image ? (m.aspect ?? 0.6) : 220 / 320

export function Dress({ model, fill, uid }: { model: Model; fill: string; uid: string }) {
  if (model.image) return <img className="dress dress-img" src={model.image} alt={`${model.id} ${model.name}`} draggable={false} />
  return <span className="dress-svg" aria-label={`${model.id} ${model.name}`} dangerouslySetInnerHTML={{ __html: dressSvg(model, fill, uid) }} />
}

export const FIGURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 520" width="300" height="520"><g fill="#E6E4E1" stroke="#5a5a5a" stroke-width="1.2" stroke-linejoin="round"><ellipse cx="150" cy="62" rx="27" ry="34"/><path d="M138 92 L138 110 Q120 116 104 120 Q94 124 92 140 L82 270 Q80 282 90 284 L96 282 L108 160 L112 230 Q108 300 116 380 L120 506 L142 506 L146 330 L150 300 L154 330 L158 506 L180 506 L184 380 Q192 300 188 230 L192 160 L204 282 L210 284 Q220 282 218 270 L208 140 Q206 124 196 120 Q180 116 162 110 L162 92 Z"/></g></svg>`

// דמות הדגמה ניטרלית: לא אדם אמיתי, כדי שאפשר יהיה לנסות בלי צילום.
export function DemoFigure() {
  return (
    <svg viewBox="0 0 300 520" className="figure" aria-label="דמות הדגמה">
      <g fill="#E6E4E1" stroke="#5a5a5a" strokeWidth="1.2" strokeLinejoin="round">
        <ellipse cx="150" cy="62" rx="27" ry="34" />
        <path d="M138 92 L138 110 Q120 116 104 120 Q94 124 92 140 L82 270 Q80 282 90 284 L96 282 L108 160 L112 230 Q108 300 116 380 L120 506 L142 506 L146 330 L150 300 L154 330 L158 506 L180 506 L184 380 Q192 300 188 230 L192 160 L204 282 L210 284 Q220 282 218 270 L208 140 Q206 124 196 120 Q180 116 162 110 L162 92 Z" />
      </g>
    </svg>
  )
}

interface StageProps {
  photo: string | null
  model: Model | null
  fill: string
  transform: Transform
  watermark: string
  uid: string
  small?: boolean
}

export function Stage({ photo, model, fill, transform, watermark, uid, small }: StageProps) {
  return (
    <div className={`stage${small ? ' small' : ''}`}>
      {photo ? <img src={photo} alt="" className="photo" /> : <DemoFigure />}
      {model && (
        <div className="dress-wrap" style={{ top: `${transform.y}%`, height: `${transform.scale}%`, aspectRatio: String(dressAspect(model)), transform: `translateX(-50%) scaleX(${transform.width})` }}>
          <Dress model={model} fill={fill} uid={uid} />
        </div>
      )}
      <div className="wm" aria-hidden="true">
        {Array.from({ length: small ? 3 : 6 }).map((_, i) => <span key={i}>{watermark}</span>)}
      </div>
      <div className="badge">{watermark}</div>
    </div>
  )
}
