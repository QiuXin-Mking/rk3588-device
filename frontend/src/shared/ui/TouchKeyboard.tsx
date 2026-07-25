import { useState } from 'react'
import { ArrowUp, Delete, Space } from 'lucide-react'

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
    <div className="touch-keyboard" aria-label="触屏键盘">
      {rows.map((row, rowIndex) => (
        <div className="key-row" key={row.join('')}>
          {rowIndex === 3 && layer === 'abc' && (
            <button
              className={upper ? 'active key-wide' : 'key-wide'}
              onClick={() => setUpper((value) => !value)}
              aria-label="大小写"
            >
              <ArrowUp />
            </button>
          )}
          {row.map((key) => (
            <button key={key} onClick={() => onKey(upper && layer === 'abc' ? key.toUpperCase() : key)}>
              {upper && layer === 'abc' ? key.toUpperCase() : key}
            </button>
          ))}
          {rowIndex === 3 && (
            <button className="key-wide" onClick={() => onKey('backspace')} aria-label="退格">
              <Delete />
            </button>
          )}
        </div>
      ))}
      <div className="key-row key-actions">
        <button
          className="key-layer"
          onClick={() => {
            setLayer((current) => current === 'abc' ? 'symbols' : 'abc')
            setUpper(false)
          }}
        >
          {layer === 'abc' ? '?123' : 'ABC'}
        </button>
        <button className="key-space" onClick={() => onKey(' ')} aria-label="空格"><Space /></button>
        <button className="key-done" onClick={onDone}>完成</button>
      </div>
    </div>
  )
}
