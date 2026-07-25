import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'

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
      <button className="touch-choice" onClick={() => setOpen(true)}>
        <span>{label}</span>
        <strong>{value}</strong>
        <ChevronDown />
      </button>
      {open && (
        <div className="choice-overlay" role="dialog" aria-modal="true" aria-label={label}>
          <section className="choice-panel">
            <header>
              <div>
                <span>选择项目</span>
                <h2>{label}</h2>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="关闭选择器">
                <X />
              </button>
            </header>
            <div className="choice-options">
              {options.map((option) => (
                <button
                  key={option}
                  className={option === value ? 'selected' : ''}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                >
                  <span>{option}</span>
                  {option === value && <Check />}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
