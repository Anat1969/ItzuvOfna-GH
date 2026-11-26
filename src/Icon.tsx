// סט אייקוני קו אחד, בעובי אחד: פעולות משניות כאייקון קטן עם תווית ריחוף, לא כפתור גדול
const P: Record<string, string> = {
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  folder: 'M3 7h6l2 2h10v10H3z',
  wand: 'M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  print: 'M7 9V4h10v5M6 18H4v-7h16v7h-2M7 14h10v6H7z',
  share: 'M16 6l-4-3-4 3M12 3v12M6 10H4v10h16V10h-2',
  check: 'M5 12l4 4 10-10',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  open: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
}
export function Icon({ name, size = 18 }: { name: keyof typeof P | string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] || P.x} /></svg>
}
/** כפתור אייקון: מרובע, שקט, עם תווית בריחוף ובקורא מסך */
export function IconBtn({ icon, label, onClick, danger, disabled, className = '' }: { icon: string; label: string; onClick?: (e: React.MouseEvent) => void; danger?: boolean; disabled?: boolean; className?: string }) {
  return <button type="button" className={`ib${danger ? ' danger-ib' : ''} ${className}`} aria-label={label} data-tip={label} disabled={disabled} onClick={onClick}><Icon name={icon} /></button>
}
