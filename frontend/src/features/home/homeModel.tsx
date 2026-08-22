export function deviceTone(id: string) {
  if (id.startsWith('UMI_Fingers')) return 'bg-amber-500/15 text-amber-500'
  if (id.startsWith('UMI_Grippers')) return 'bg-rose-500/15 text-rose-500'
  if (id.startsWith('Ego_W')) return 'bg-violet-500/15 text-violet-500'
  if (id === 'Suits') return 'bg-emerald-500/15 text-emerald-500'
  return 'bg-sky-500/15 text-sky-500'
}
