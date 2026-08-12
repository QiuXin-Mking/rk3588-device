import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadSelectedProduct,
  saveSelectedProduct,
  SELECTED_PRODUCT_KEY,
} from './product'

describe('selected product persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('stores and restores Banana or Mango', () => {
    saveSelectedProduct('Mango')
    expect(window.localStorage.getItem(SELECTED_PRODUCT_KEY)).toBe('Mango')
    expect(loadSelectedProduct()).toBe('Mango')

    saveSelectedProduct('Banana')
    expect(loadSelectedProduct()).toBe('Banana')
  })

  it('ignores unsupported stored values', () => {
    window.localStorage.setItem(SELECTED_PRODUCT_KEY, 'Cherry')
    expect(loadSelectedProduct()).toBeNull()
  })
})
