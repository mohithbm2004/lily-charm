import { createContext, useContext, useEffect, useMemo, useReducer, useState, useRef } from 'react'
import { API_URL } from '../config/api'
import { getSocket } from '../services/socket'
import { useAuth } from './AuthContext'

export const MAX_QTY_PER_PRODUCT = 4

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'lilycharm_cart'

function loadInitialCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.items)) {
        return {
          items: parsed.items.map((i) => ({
            ...i,
            qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(i.qty) || 1)),
          })),
          coupon: typeof parsed.coupon === 'string' ? parsed.coupon : null,
        }
      }
    }
  } catch (e) {
    console.warn('[CART INIT STORAGE NOTICE]:', e)
  }
  return { items: [], coupon: null }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_CART': {
      const safeItems = Array.isArray(action.items)
        ? action.items.map((i) => ({
            ...i,
            qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(i.qty) || 1)),
          }))
        : []
      return {
        ...state,
        items: safeItems,
        coupon: action.coupon !== undefined ? action.coupon : state.coupon,
        isInitialized: true,
      }
    }
    case 'VALIDATE_PRICES': {
      if (!action.productMap) return state
      let changed = false
      const updatedItems = state.items.map((item) => {
        const dbProd =
          action.productMap.get(String(item.id)) ||
          action.productMap.get(String(item._id)) ||
          action.productMap.get(item.slug)
        if (dbProd) {
          const freshPrice = Number(dbProd.price) || item.price
          const freshTitle = dbProd.title || item.title
          const freshImage =
            dbProd.image || (Array.isArray(dbProd.images) ? dbProd.images[0] : item.image)
          if (
            item.price !== freshPrice ||
            item.title !== freshTitle ||
            item.image !== freshImage
          ) {
            changed = true
            return {
              ...item,
              price: freshPrice,
              title: freshTitle,
              image: freshImage,
              qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, item.qty)),
            }
          }
        }
        return item
      })
      return changed ? { ...state, items: updatedItems } : state
    }
    case 'ADD': {
      const pId = String(action.product?.id || action.product?._id || action.product?.slug || '')
      const existingIndex = state.items.findIndex(
        (i) => String(i.id) === pId || String(i._id) === pId || (i.slug && i.slug === pId)
      )
      if (existingIndex > -1) {
        const existing = state.items[existingIndex]
        const newQty = Math.min(MAX_QTY_PER_PRODUCT, existing.qty + (Number(action.qty) || 1))
        return {
          ...state,
          items: state.items.map((i, idx) =>
            idx === existingIndex ? { ...i, qty: newQty } : i
          ),
        }
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            ...action.product,
            id: pId || action.product.id,
            qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(action.qty) || 1)),
          },
        ],
      }
    }
    case 'REMOVE': {
      const targetId = String(action.id)
      return {
        ...state,
        items: state.items.filter(
          (i) => String(i.id) !== targetId && String(i._id) !== targetId && (i.slug ? i.slug !== targetId : true)
        ),
      }
    }
    case 'SET_QTY': {
      const targetId = String(action.id)
      const newQty = Number(action.qty)
      if (newQty <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => String(i.id) !== targetId && String(i._id) !== targetId && (i.slug ? i.slug !== targetId : true)
          ),
        }
      }
      return {
        ...state,
        items: state.items.map((i) =>
          String(i.id) === targetId || String(i._id) === targetId || (i.slug && i.slug === targetId)
            ? { ...i, qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, newQty)) }
            : i
        ),
      }
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
  const initialData = useMemo(() => loadInitialCart(), [])
  const [state, dispatch] = useReducer(reducer, {
    items: initialData.items,
    open: false,
    coupon: initialData.coupon,
    isInitialized: true,
  })
  const [dbCoupons, setDbCoupons] = useState([])
  const { user, token } = useAuth()
  const isInitialSyncDone = useRef(false)
  const isRemoteUpdate = useRef(false)

  // 1. Synchronously persist to localStorage on every items or coupon change
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          items: state.items,
          coupon: state.coupon,
        })
      )
    } catch (e) {
      console.warn('[CART SAVE LOCAL NOTICE]:', e)
    }
  }, [state.items, state.coupon])

  // 2. Multi-Tab Synchronization via Window Storage Events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === CART_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            if (Array.isArray(parsed.items)) {
              isRemoteUpdate.current = true
              dispatch({
                type: 'SET_CART',
                items: parsed.items,
                coupon: parsed.coupon || null,
              })
            }
          } catch {}
        } else {
          isRemoteUpdate.current = true
          dispatch({ type: 'CLEAR' })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // 3. Logged-In Server Cart Sync
  useEffect(() => {
    if (!token || !user) {
      isInitialSyncDone.current = false
      return
    }

    let isMounted = true

    const fetchServerCart = async () => {
      try {
        const res = await fetch(`${API_URL}/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && isMounted) {
          const data = await res.json()
          if (Array.isArray(data.items)) {
            isRemoteUpdate.current = true
            dispatch({ type: 'SET_CART', items: data.items, coupon: data.coupon })
          }
          isInitialSyncDone.current = true
        }
      } catch (err) {
        console.warn('[CART SERVER SYNC NOTICE]:', err.message || err)
        isInitialSyncDone.current = true
      }
    }

    fetchServerCart()

    return () => {
      isMounted = false
    }
  }, [user, token])

  // 4. Debounced Server-Side Save for Logged-In User (only on local user modifications!)
  useEffect(() => {
    if (!token || !user || !isInitialSyncDone.current) return

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }

    const timeout = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/cart`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: state.items,
            coupon: state.coupon,
          }),
        })
      } catch (err) {
        // offline safe
      }
    }, 600)

    return () => clearTimeout(timeout)
  }, [state.items, state.coupon, user, token])

  // 5. Real-Time Socket.IO Listener for Multi-Device/Tab sync
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleCartUpdated = (payload) => {
      if (payload && Array.isArray(payload.items)) {
        isRemoteUpdate.current = true
        dispatch({
          type: 'SET_CART',
          items: payload.items,
          coupon: payload.coupon || null,
        })
      }
    }

    socket.on('CART_UPDATED', handleCartUpdated)
    return () => {
      socket.off('CART_UPDATED', handleCartUpdated)
    }
  }, [])

  // 6. Product Price Verification with Live Catalog
  useEffect(() => {
    const validatePrices = async () => {
      try {
        const res = await fetch(`${API_URL}/products`)
        if (res.ok) {
          const prods = await res.json()
          if (Array.isArray(prods) && prods.length > 0) {
            const pMap = new Map()
            prods.forEach((p) => {
              pMap.set(String(p._id), p)
              if (p.slug) pMap.set(p.slug, p)
              if (p.id) pMap.set(String(p.id), p)
              if (p.specimen) pMap.set(p.specimen, p)
            })
            dispatch({ type: 'VALIDATE_PRICES', productMap: pMap })
          }
        }
      } catch (e) {}
    }
    validatePrices()
  }, [])

  // 7. Active Promo Coupons Fetch & Socket Listeners
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch(`${API_URL}/coupons/active`)
        if (res.ok) {
          const data = await res.json()
          setDbCoupons(data)
        }
      } catch (e) {}
    }
    fetchCoupons()

    const socket = getSocket()

    const handleCouponCreated = (newCoupon) => {
      if (newCoupon && newCoupon.isActive !== false) {
        setDbCoupons((prev) => [newCoupon, ...prev.filter((c) => c.code !== newCoupon.code)])
      }
    }

    const handleCouponUpdated = (updatedCoupon) => {
      if (!updatedCoupon) return
      setDbCoupons((prev) => {
        if (updatedCoupon.isActive === false) {
          return prev.filter((c) => c.code !== updatedCoupon.code && c._id !== updatedCoupon._id)
        }
        return [updatedCoupon, ...prev.filter((c) => c.code !== updatedCoupon.code && c._id !== updatedCoupon._id)]
      })
    }

    const handleCouponDeleted = ({ couponId }) => {
      if (!couponId) return
      setDbCoupons((prev) => prev.filter((c) => c._id !== couponId && c.code !== couponId))
    }

    socket.on('COUPON_CREATED', handleCouponCreated)
    socket.on('COUPON_UPDATED', handleCouponUpdated)
    socket.on('COUPON_DELETED', handleCouponDeleted)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCoupons()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('COUPON_CREATED', handleCouponCreated)
      socket.off('COUPON_UPDATED', handleCouponUpdated)
      socket.off('COUPON_DELETED', handleCouponDeleted)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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

      if (rule) {
        let eligibleSubtotal = 0
        const targetSeg = (rule.targetSegment || 'All Products').toLowerCase().trim()

        if (targetSeg === 'all products' || targetSeg === 'all') {
          eligibleSubtotal = subtotal
        } else {
          state.items.forEach((item) => {
            const cat = (item.specimen || item.category || '').toLowerCase()
            const title = (item.title || '').toLowerCase()
            if (cat.includes(targetSeg) || title.includes(targetSeg)) {
              eligibleSubtotal += (Number(item.price) || 0) * (Number(item.qty) || 1)
            }
          })
        }

        if (eligibleSubtotal > 0 && (!rule.minOrderAmount || eligibleSubtotal >= rule.minOrderAmount)) {
          let rawDiscount = 0
          if (rule.type === 'percentage' || rule.type === 'percent') {
            rawDiscount = Math.round((eligibleSubtotal * rule.value) / 100)
            if (rule.maxDiscountCap > 0 && rawDiscount > rule.maxDiscountCap) {
              rawDiscount = rule.maxDiscountCap
            }
          } else if (rule.type === 'flat') {
            rawDiscount = Math.min(eligibleSubtotal, rule.value)
          }
          discountAmount = Math.max(0, Math.min(rawDiscount, eligibleSubtotal))
          couponInfo = {
            code: codeKey,
            label: rule.label,
            discountAmount,
            eligibleSubtotal,
            minOrderAmount: rule.minOrderAmount,
            maxDiscountCap: rule.maxDiscountCap,
            targetSegment: rule.targetSegment,
          }
        }
      }
    }

    const applyCoupon = async (rawCode) => {
      const codeKey = (rawCode || '').toUpperCase().trim()
      if (!codeKey) {
        return { success: false, message: 'Please enter a promo code' }
      }

      try {
        const authToken = token || localStorage.getItem('lilycharm_token') || ''
        const res = await fetch(`${API_URL}/coupons/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            code: codeKey,
            items: state.items,
          }),
        })

        const data = await res.json()
        if (res.ok && data.success) {
          dispatch({ type: 'APPLY_COUPON', coupon: codeKey })
          return {
            success: true,
            message: data.message || `Promo code "${codeKey}" applied successfully!`,
          }
        } else {
          return {
            success: false,
            message: data.message || `Invalid promo code "${codeKey}".`,
          }
        }
      } catch (err) {
        const rule = availableCoupons[codeKey]
        if (!rule) {
          return { success: false, message: `Invalid promo code "${codeKey}".` }
        }
        if (rule.minOrderAmount > 0 && subtotal < rule.minOrderAmount) {
          return {
            success: false,
            message: `Code "${codeKey}" requires a minimum order spend of ₹${rule.minOrderAmount.toLocaleString('en-IN')}.`,
          }
        }
        dispatch({ type: 'APPLY_COUPON', coupon: codeKey })
        return { success: true, message: `Promo code "${codeKey}" applied successfully!` }
      }
    }

    const removeCoupon = () => {
      dispatch({ type: 'REMOVE_COUPON' })
    }

    const addItemAsync = async (product, qty = 1) => {
      if (!product) return { success: false, message: 'Invalid product details.' }

      const pId = String(product.id || product._id || product.slug || '')
      const existingIndex = state.items.findIndex(
        (i) => String(i.id) === pId || String(i._id) === pId || (i.slug && i.slug === pId)
      )

      let updatedItems = []
      if (existingIndex > -1) {
        const existing = state.items[existingIndex]
        const newQty = Math.min(MAX_QTY_PER_PRODUCT, existing.qty + (Number(qty) || 1))
        updatedItems = state.items.map((i, idx) =>
          idx === existingIndex ? { ...i, qty: newQty } : i
        )
      } else {
        updatedItems = [
          ...state.items,
          {
            ...product,
            id: pId || product.id,
            qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(qty) || 1)),
          },
        ]
      }

      if (token && user) {
        // 1. Optimistically update local state immediately
        try {
          isRemoteUpdate.current = true
          dispatch({
            type: 'SET_CART',
            items: updatedItems,
            coupon: state.coupon,
          })
          localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify({
              items: updatedItems,
              coupon: state.coupon,
            })
          )
        } catch {}

        // 2. Perform the background API sync without awaiting it, returning success immediately
        const authToken = token || localStorage.getItem('lilycharm_token') || ''
        fetch(`${API_URL}/cart`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            items: updatedItems,
            coupon: state.coupon,
          }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error('Server cart update failed')
            const data = await res.json()
            if (data && Array.isArray(data.items)) {
              isRemoteUpdate.current = true
              dispatch({
                type: 'SET_CART',
                items: data.items,
                coupon: data.coupon,
              })
              try {
                localStorage.setItem(
                  CART_STORAGE_KEY,
                  JSON.stringify({
                    items: data.items,
                    coupon: data.coupon,
                  })
                )
              } catch {}
            }
          })
          .catch((err) => {
            console.error('[CART BACKGROUND SYNC ERROR]:', err)
          })

        return { success: true }
      } else {
        // Guest flow - already instant
        try {
          isRemoteUpdate.current = true
          dispatch({
            type: 'SET_CART',
            items: updatedItems,
            coupon: state.coupon,
          })
          localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify({
              items: updatedItems,
              coupon: state.coupon,
            })
          )
          return { success: true }
        } catch (err) {
          console.error('[CART GUEST UPDATE ERROR]:', err)
          return { success: false, message: 'Unable to add this item. Please try again.' }
        }
      }
    }

    return {
      items: state.items,
      open: state.open,
      subtotal,
      count,
      coupon: couponInfo,
      discountAmount,
      maxQtyPerProduct: MAX_QTY_PER_PRODUCT,
      addItem: (product, qty = 1) => dispatch({ type: 'ADD', product, qty }),
      addItemAsync,
      removeItem: (id) => dispatch({ type: 'REMOVE', id }),
      setQty: (id, qty) => dispatch({ type: 'SET_QTY', id, qty }),
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
      clearCart: () => {
        dispatch({ type: 'CLEAR' })
        try {
          localStorage.removeItem(CART_STORAGE_KEY)
        } catch (e) {}
      },
      applyCoupon,
      removeCoupon,
    }
  }, [state, availableCoupons, user, token])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
