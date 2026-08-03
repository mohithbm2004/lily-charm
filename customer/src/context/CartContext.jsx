import { createContext, useContext, useMemo, useReducer } from 'react'

const CartContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find((i) => i.id === action.product.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.product.id ? { ...i, qty: i.qty + action.qty } : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.product, qty: action.qty }] }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }
    case 'SET_QTY':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, qty: Math.max(1, action.qty) } : i)),
      }
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    case 'CLEAR':
      return { ...state, items: [] }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [], open: false })

  const value = useMemo(() => {
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const count = state.items.reduce((sum, i) => sum + i.qty, 0)
    return {
      items: state.items,
      open: state.open,
      subtotal,
      count,
      addItem: (product, qty = 1) => dispatch({ type: 'ADD', product, qty }),
      removeItem: (id) => dispatch({ type: 'REMOVE', id }),
      setQty: (id, qty) => dispatch({ type: 'SET_QTY', id, qty }),
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    }
  }, [state])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
