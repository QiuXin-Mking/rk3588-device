export type SelectableProduct = 'Banana' | 'Mango'

export const SELECTED_PRODUCT_KEY = 'sensorhub-product'

export function loadSelectedProduct(): SelectableProduct | null {
  const saved = window.localStorage.getItem(SELECTED_PRODUCT_KEY)
  return saved === 'Banana' || saved === 'Mango' ? saved : null
}

export function saveSelectedProduct(product: SelectableProduct) {
  window.localStorage.setItem(SELECTED_PRODUCT_KEY, product)
}
