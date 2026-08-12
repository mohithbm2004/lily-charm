import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'

import { API_URL } from '../config/api'

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
    case 'APPLY_COUPON':
      return { ...state, coupon: action.coupon }
    case 'REMOVE_COUPON':
      return { ...state, coupon: null }
    case 'CLEAR':
      return { ...state, items: [], coupon: null }
    default:
      return state
  }
}

const DEFAULT_COUPONS = {
  LILY10: { type: 'percentage', value: 10, label: '10% OFF Studio Discount', minOrderAmount: 0, maxDiscountCap: 0, targetSegment: 'All Products' },
  VELVET20: { type: 'percentage', value: 20, label: '20% OFF Velvet Special', minOrderAmount: 0, maxDiscountCap: 0, targetSegment: 'All Products' },
  FLOWER100: { type: 'flat', value: 100, label: '₹100 Flat Discount', minOrderAmount: 0, maxDiscountCap: 0, targetSegment: 'All Products' },
  WELCOME100: { type: 'flat', value: 100, label: '₹100 Welcome Discount', minOrderAmount: 0, maxDiscountCap: 0, targetSegment: 'All Products' },
  LILYCHARM500: { type: 'flat', value: 500, label: '₹500 VIP Studio Discount', minOrderAmount: 1500, maxDiscountCap: 0, targetSegment: 'All Products' },
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [], open: false, coupon: null })
  const [dbCoupons, setDbCoupons] = useState([])

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch(`${API_URL}/coupons/active`)
        if (res.ok) {
          const data = await res.json()
          setDbCoupons(data)
        }
      } catch (e) {
        console.error('Failed to fetch segment coupons:', e)
      }
    }
    fetchCoupons()
    const interval = setInterval(fetchCoupons, 5000)
    return () => clearInterval(interval)
  }, [])

  const availableCoupons = useMemo(() => {
    const coupons = { ...DEFAULT_COUPONS }
    if (Array.isArray(dbCoupons)) {
      dbCoupons.forEach((c) => {
        if (c.code && c.isActive !== false) {
          coupons[c.code.toUpperCase().trim()] = {
            type: c.discountType || 'percentage',
            value: Number(c.discountValue) || 10,
            label: c.title || `${c.discountValue}${c.discountType === 'percentage' ? '%' : '₹'} OFF Offer`,
            minOrderAmount: Number(c.minOrderAmount || 0),
            maxDiscountCap: Number(c.maxDiscountCap || 0),
            targetSegment: c.targetSegment || 'All Products',
          }
        }
      })
    }
    return coupons
  }, [dbCoupons])

  const value = useMemo(() => {
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
    const count = state.items.reduce((sum, i) => sum + i.qty, 0)

    let discountAmount = 0
    let couponInfo = null

    if (state.coupon && subtotal > 0) {
      const codeKey = state.coupon.toUpperCase().trim()
      const rule = availableCoupons[codeKey]

      if (rule && subtotal >= rule.minOrderAmount) {
        let rawDiscount = 0
        if (rule.type === 'percentage' || rule.type === 'percent') {
          rawDiscount = Math.round((subtotal * rule.value) / 100)
          if (rule.maxDiscountCap > 0 && rawDiscount > rule.maxDiscountCap) {
            rawDiscount = rule.maxDiscountCap
          }
        } else if (rule.type === 'flat') {
          rawDiscount = Math.min(subtotal, rule.value)
        }
        discountAmount = rawDiscount
        couponInfo = {
          code: codeKey,
          label: rule.label,
          discountAmount,
          minOrderAmount: rule.minOrderAmount,
          maxDiscountCap: rule.maxDiscountCap,
          targetSegment: rule.targetSegment,
        }
      }
    }

    const applyCoupon = (rawCode) => {
      const codeKey = (rawCode || '').toUpperCase().trim()
      if (!codeKey) {
        return { success: false, message: 'Please enter a promo code' }
      }

      const rule = availableCoupons[codeKey]
      if (!rule) {
        return { success: false, message: `Invalid promo code "${codeKey}". Try LILY10 or VELVET20!` }
      }

      // Check minimum order amount requirement
      if (rule.minOrderAmount > 0 && subtotal < rule.minOrderAmount) {
        return {
          success: false,
          message: `⚠️ Code "${codeKey}" requires a minimum order spend of ₹${rule.minOrderAmount.toLocaleString('en-IN')}. Add ₹${(rule.minOrderAmount - subtotal).toLocaleString('en-IN')} more to unlock!`,
        }
      }

      dispatch({ type: 'APPLY_COUPON', coupon: codeKey })
      
      let capNotice = ''
      if (rule.maxDiscountCap > 0) {
        capNotice = ` (Capped at max ₹${rule.maxDiscountCap.toLocaleString('en-IN')} OFF)`
      }

      return {
        success: true,
        message: `✨ Promo code "${codeKey}" applied successfully!${capNotice}`,
      }
    }

    const removeCoupon = () => {
      dispatch({ type: 'REMOVE_COUPON' })
    }

    return {
      items: state.items,
      open: state.open,
      subtotal,
      count,
      coupon: couponInfo,
      discountAmount,
      addItem: (product, qty = 1) => dispatch({ type: 'ADD', product, qty }),
      removeItem: (id) => dispatch({ type: 'REMOVE', id }),
      setQty: (id, qty) => dispatch({ type: 'SET_QTY', id, qty }),
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      applyCoupon,
      removeCoupon,
    }
  }, [state, availableCoupons])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
