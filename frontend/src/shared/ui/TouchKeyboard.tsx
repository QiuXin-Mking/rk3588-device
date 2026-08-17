import { useState } from 'react'
import { ArrowUp, Delete, Space } from 'lucide-react'
import { cn } from '../lib/cn'

const LETTER_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
]

const SYMBOL_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-'],
  ['_', '=', '+', '/', ':', ';', ',', '.', '?'],
  ['~', "'", '"', '|', '\\', '<', '>'],
]

export function TouchKeyboard({
  onKey,
  onDone,
}: {
  onKey: (key: string) => void
  onDone: () => void
}) {
  const [upper, setUpper] = useState(false)
  const [layer, setLayer] = useState<'abc' | 'symbols'>('abc')
  const rows = layer === 'abc' ? LETTER_ROWS : SYMBOL_ROWS

  return (
		<div className="grid gap-2 px-[26px] pb-[18px]" aria-label="触屏键盘">
			{rows.map((row, rowIndex) => (
				<div className="flex justify-center gap-2" key={row.join('')}>
          {rowIndex === 3 && layer === 'abc' && (
            <button
						className={cn(keyClass, 'w-[120px]', upper && 'border-blue-500 bg-blue-500/20')}
              onClick={() => setUpper((value) => !value)}
              aria-label="大小写"
            >
              <ArrowUp />
            </button>
          )}
          {row.map((key) => (
					<button className={keyClass} key={key} onClick={() => onKey(upper && layer === 'abc' ? key.toUpperCase() : key)}>
              {upper && layer === 'abc' ? key.toUpperCase() : key}
            </button>
          ))}
          {rowIndex === 3 && (
					<button className={cn(keyClass, 'w-[120px]')} onClick={() => onKey('backspace')} aria-label="退格">
              <Delete />
            </button>
          )}
        </div>
      ))}
			<div className="flex justify-center gap-2">
				<button
					className={cn(keyClass, 'w-[150px]')}
          onClick={() => {
            setLayer((current) => current === 'abc' ? 'symbols' : 'abc')
            setUpper(false)
          }}
        >
          {layer === 'abc' ? '?123' : 'ABC'}
        </button>
				<button className={cn(keyClass, 'w-[360px]')} onClick={() => onKey(' ')} aria-label="空格"><Space /></button>
				<button className={cn(keyClass, 'w-[150px] border-blue-600 bg-blue-600 text-white')} onClick={onDone}>完成</button>
			</div>
		</div>
	)
}

const keyClass = 'grid h-[74px] w-[92px] place-items-center rounded-xl border border-border bg-secondary text-[length:var(--device-text-xs)] font-bold text-foreground active:border-blue-500 active:bg-blue-500/20 [&>svg]:size-7'
