import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TouchKeyboard } from './TouchKeyboard'

describe('TouchKeyboard button coverage', () => {
  it('clicks every character and control button on every keyboard layer', () => {
    const onKey = vi.fn()
    const onDone = vi.fn()
    render(<TouchKeyboard onKey={onKey} onDone={onDone} />)

    const clickEveryCharacterKey = () => {
      for (const button of screen.getAllByRole('button')) {
        const label = button.textContent || ''
        if (label && !['?123', 'ABC', '完成'].includes(label)) fireEvent.click(button)
      }
    }

    clickEveryCharacterKey()
    fireEvent.click(screen.getByRole('button', { name: '大小写' }))
    clickEveryCharacterKey()
    fireEvent.click(screen.getByRole('button', { name: '?123' }))
    clickEveryCharacterKey()
    fireEvent.click(screen.getByRole('button', { name: '退格' }))
    fireEvent.click(screen.getByRole('button', { name: '空格' }))
    fireEvent.click(screen.getByRole('button', { name: 'ABC' }))
    fireEvent.click(screen.getByRole('button', { name: '完成' }))

    expect(onKey).toHaveBeenCalledWith('1')
    expect(onKey).toHaveBeenCalledWith('q')
    expect(onKey).toHaveBeenCalledWith('Q')
    expect(onKey).toHaveBeenCalledWith('!')
    expect(onKey).toHaveBeenCalledWith('~')
    expect(onKey).toHaveBeenCalledWith('backspace')
    expect(onKey).toHaveBeenCalledWith(' ')
    expect(onDone).toHaveBeenCalledOnce()
  })
})
