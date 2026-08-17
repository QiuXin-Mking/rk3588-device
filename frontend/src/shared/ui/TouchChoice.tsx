import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '../lib/cn'

export function TouchChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="grid min-h-0 grid-cols-[210px_1fr_44px] items-center gap-5 border-0 border-b border-border bg-transparent px-7 text-left text-foreground last:border-b-0" onClick={() => setOpen(true)}>
        <span className="text-[length:var(--device-text-sm)] text-muted-foreground">{label}</span>
        <strong className="truncate text-[length:var(--device-text-md)]">{value}</strong>
        <ChevronDown className="size-9 text-muted-foreground" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-10 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={label}>
          <Card className="flex max-h-[820px] w-[min(1120px,92vw)] flex-col overflow-hidden rounded-3xl border-blue-500/25 shadow-2xl">
            <header className="flex min-h-[120px] items-center justify-between gap-6 border-b border-border px-[34px] py-[18px]">
              <div>
                <span className="text-[length:var(--device-text-xs)] text-muted-foreground">选择项目</span>
                <h2 className="mt-1 text-[length:var(--device-text-xl)] font-bold">{label}</h2>
              </div>
              <Button className="size-20" size="icon-touch" variant="outline" onClick={() => setOpen(false)} aria-label="关闭选择器">
                <X />
              </Button>
            </header>
            <div className="min-h-0 overflow-y-auto p-[18px]">
              {options.map((option) => (
                <button
                  key={option}
                  className={cn('flex min-h-[118px] w-full items-center justify-between gap-5 rounded-[22px] border border-transparent bg-transparent px-[30px] text-left text-[length:var(--device-text-md)] text-muted-foreground', option === value && 'border-blue-500/35 bg-blue-500/10 text-foreground')}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                >
                  <span>{option}</span>
                  {option === value && <Check className="size-10 text-blue-500" />}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
