import { createContext, useContext, useState, useEffect } from 'react'
import { products as initialProducts, categories as initialCategories } from '../data/products'
import { getSocket } from '../services/socket'
import { API_URL } from '../config/api'

const StudioContext = createContext(null)

const getAdminHeaders = (extraHeaders = {}) => {
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('lilycharm_admin_session_id') : null
  const headers = { ...extraHeaders }
  if (sessionId) {
    headers['x-admin-session-id'] = sessionId
  }
  return headers
}

// Purge any stale client-side entity caches from previous sessions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('lilycharm_products')
    localStorage.removeItem('lilycharm_collections')
    localStorage.removeItem('lilycharm_orders')
    localStorage.removeItem('lilycharm_users')
  } catch {}
}

const initialOrders = []

export function StudioProvider({ children }) {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [orders, setOrders] = useState([])
  const [customRequests, setCustomRequests] = useState([])
  const [users, setUsers] = useState([])

  const refreshUsersFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(`${API_URL}/auth/users`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setUsers(data)
        }
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    }
  }

  const [marqueeText, setMarqueeText] = useState(() => {
    const saved = localStorage.getItem('lilycharm_marquee')
    return saved || 'FREE DELIVERY ON ORDERS ABOVE ₹2500 • HANDCRAFTED VELVET BOTANICAL FLORALS • USE CODE LILY10 FOR 10% OFF'
  })

  const [shippingSettings, setShippingSettings] = useState({
    shippingFeeEnabled: true,
    standardShippingFee: 100,
    freeShippingThreshold: 2500,
  })

  const refreshSettingsFromApi = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (res.ok) {
        const data = await res.json()
        if (data?.marqueeText) setMarqueeText(data.marqueeText)
        setShippingSettings({
          shippingFeeEnabled: data?.shippingFeeEnabled !== undefined ? Boolean(data.shippingFeeEnabled) : true,
          standardShippingFee: data?.standardShippingFee !== undefined ? Number(data.standardShippingFee) : 100,
          freeShippingThreshold: data?.freeShippingThreshold !== undefined ? Number(data.freeShippingThreshold) : 2500,
        })
      }
    } catch (e) {
      console.error('Failed to fetch settings in admin:', e)
    }
  }

  const updateShippingSettings = async (newSettings) => {
    const updated = { ...shippingSettings, ...newSettings }
    setShippingSettings(updated)
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(updated),
      })
      if (res.ok) {
        refreshSettingsFromApi()
      }
    } catch (e) {
      console.error('Failed to update shipping settings on server:', e)
    }
  }

  const refreshProductsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(`${API_URL}/products?includeArchived=true`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data.map((p) => ({
            ...p,
            id: p._id || p.id,
            mongoId: p._id,
            image:
              p.image ||
              (Array.isArray(p.images)
                ? typeof p.images[0] === 'object'
                  ? p.images[0]?.url
                  : p.images[0]
                : '') ||
              '',
          }))
          setProducts(mapped)
        }
      }
    } catch {
      // offline safe
    }
  }

  const refreshCollectionsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${API_URL}/collections`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data.map((c) => ({
            ...c,
            id: c.slug || c._id || c.id,
            mongoId: c._id,
          }))
          setCollections(mapped)
          localStorage.setItem('lilycharm_collections', JSON.stringify(mapped))
        }
      }
    } catch {
      // offline safe
    }
  }

  const refreshCustomRequestsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${API_URL}/custom-requests`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCustomRequests(data)
        }
      }
    } catch {
      // offline safe
    }
  }

  const refreshOrdersFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`${API_URL}/orders`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        const rawList = Array.isArray(data) ? data : (data.orders || [])
        const mapped = rawList.map((o) => ({
          ...o,
          id: o.orderNumber || o._id || o.id,
          mongoId: o._id,
          customerName: o.shippingAddress?.name || 'Customer',
          email: o.shippingAddress?.email || '',
          phone: o.shippingAddress?.phone || '',
          address: o.shippingAddress?.address || o.shippingAddress?.line1 || '',
          city: o.shippingAddress?.city || '',
          pincode: o.shippingAddress?.pincode || '',
          paymentStatus: o.paymentStatus || 'Paid',
          orderStatus: o.status || 'Confirmed',
          date: new Date(o.createdAt || Date.now()).toLocaleDateString(),
        }))
        setOrders(mapped)
        localStorage.setItem('lilycharm_orders', JSON.stringify(mapped))
      }
    } catch (e) {
      console.error('Failed to fetch orders from API:', e)
    }
  }



  useEffect(() => {
    refreshProductsFromApi()
    refreshCollectionsFromApi()
    refreshCustomRequestsFromApi()
    refreshOrdersFromApi()
    refreshUsersFromApi()
    refreshSettingsFromApi()
    refreshReviewsFromApi()
    refreshCouponsFromApi()

    const socket = getSocket()

    const handleOrderCreated = (newOrder) => {
      if (!newOrder) return
      const mapped = {
        ...newOrder,
        id: newOrder.orderNumber || newOrder._id || newOrder.id,
        mongoId: newOrder._id,
        customerName: newOrder.shippingAddress?.name || 'Customer',
        email: newOrder.shippingAddress?.email || '',
        phone: newOrder.shippingAddress?.phone || '',
        address: newOrder.shippingAddress?.address || newOrder.shippingAddress?.line1 || '',
        city: newOrder.shippingAddress?.city || '',
        pincode: newOrder.shippingAddress?.pincode || '',
        paymentStatus: newOrder.paymentStatus || 'Paid',
        orderStatus: newOrder.status || 'Confirmed',
        date: new Date(newOrder.createdAt || Date.now()).toLocaleDateString(),
      }
      setOrders((prev) => [mapped, ...prev.filter((o) => (o.mongoId || o._id || o.id) !== mapped.mongoId)])
    }

    const handleOrderUpdated = (updatedOrder) => {
      if (!updatedOrder) return
      const targetId = String(updatedOrder._id || updatedOrder.id || '')
      const targetOrderNum = String(updatedOrder.orderNumber || '')
      setOrders((prev) =>
        prev.map((o) => {
          const oMongoId = String(o.mongoId || o._id || '')
          const oId = String(o.id || '')
          const oOrderNum = String(o.orderNumber || '')
          if (
            (targetId && (oMongoId === targetId || oId === targetId)) ||
            (targetOrderNum && (oId === targetOrderNum || oOrderNum === targetOrderNum))
          ) {
            return {
              ...o,
              ...updatedOrder,
              id: updatedOrder.orderNumber || o.id,
              mongoId: updatedOrder._id || o.mongoId,
              orderStatus: updatedOrder.status || o.orderStatus,
              status: updatedOrder.status || o.status,
              paymentStatus: updatedOrder.paymentStatus || o.paymentStatus,
              customerName: updatedOrder.shippingAddress?.name || o.customerName,
              email: updatedOrder.shippingAddress?.email || o.email,
              phone: updatedOrder.shippingAddress?.phone || o.phone,
              address: updatedOrder.shippingAddress?.address || o.address,
              city: updatedOrder.shippingAddress?.city || o.city,
              pincode: updatedOrder.shippingAddress?.pincode || o.pincode,
            }
          }
          return o
        })
      )
    }

    const handleOrderCancelled = ({ orderId }) => {
      if (!orderId) return
      if (orderId === 'ALL') {
        setOrders([])
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            (o.mongoId === orderId || o._id === orderId || o.id === orderId)
              ? { ...o, orderStatus: 'Cancelled & Refunded', status: 'Cancelled & Refunded' }
              : o
          )
        )
      }
    }

    const handleProductCreated = (newProd) => {
      if (!newProd) return
      const formatted = {
        ...newProd,
        id: newProd._id || newProd.id,
        mongoId: newProd._id,
        image: newProd.image || (Array.isArray(newProd.images) ? (typeof newProd.images[0] === 'object' ? newProd.images[0].url : newProd.images[0]) : ''),
      }
      setProducts((prev) => [formatted, ...prev.filter((p) => (p.id || p._id) !== formatted.id)])
    }

    const handleProductUpdated = (updatedProd) => {
      if (!updatedProd) return
      const targetId = updatedProd._id || updatedProd.id
      const formatted = {
        ...updatedProd,
        id: targetId,
        mongoId: updatedProd._id,
        image: updatedProd.image || (Array.isArray(updatedProd.images) ? (typeof updatedProd.images[0] === 'object' ? updatedProd.images[0].url : updatedProd.images[0]) : ''),
      }
      setProducts((prev) => prev.map((p) => ((p.id === targetId || p._id === targetId || p.slug === updatedProd.slug) ? formatted : p)))
    }

    const handleProductDeleted = ({ productId }) => {
      if (!productId) return
      if (productId === 'ALL') {
        setProducts([])
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== productId && p._id !== productId && p.slug !== productId))
      }
    }

    const handleCollectionCreated = (newCol) => {
      if (!newCol) return
      const formatted = { ...newCol, id: newCol.slug || newCol._id || newCol.id, mongoId: newCol._id }
      setCollections((prev) => [...prev.filter((c) => (c.id || c._id) !== formatted.id), formatted])
    }

    const handleCollectionUpdated = (updatedCol) => {
      if (!updatedCol) return
      const targetId = updatedCol._id || updatedCol.id || updatedCol.slug
      const formatted = { ...updatedCol, id: updatedCol.slug || updatedCol._id, mongoId: updatedCol._id }
      setCollections((prev) => prev.map((c) => ((c.id === targetId || c._id === targetId || c.slug === updatedCol.slug) ? formatted : c)))
    }

    const handleCollectionDeleted = ({ collectionId }) => {
      if (!collectionId) return
      if (collectionId === 'ALL') {
        setCollections([])
      } else {
        setCollections((prev) => prev.filter((c) => c.id !== collectionId && c._id !== collectionId && c.slug !== collectionId))
      }
    }

    const handleCustomRequestCreated = (req) => {
      if (!req) return
      setCustomRequests((prev) => [req, ...prev.filter((r) => r._id !== req._id)])
    }

    const handleCustomRequestUpdated = (req) => {
      if (!req) return
      setCustomRequests((prev) => prev.map((r) => (r._id === req._id ? req : r)))
    }

    const handleCustomRequestDeleted = ({ requestId }) => {
      if (!requestId) return
      setCustomRequests((prev) => prev.filter((r) => r._id !== requestId))
    }

    const handleReviewCreated = (review) => {
      if (!review) return
      setReviews((prev) => [review, ...prev.filter((r) => r._id !== review._id)])
    }

    const handleReviewUpdated = (review) => {
      if (!review) return
      setReviews((prev) => prev.map((r) => (r._id === review._id ? review : r)))
    }

    const handleReviewDeleted = ({ reviewId }) => {
      if (!reviewId) return
      setReviews((prev) => prev.filter((r) => r._id !== reviewId))
    }

    const handleCouponCreated = (coupon) => {
      if (!coupon) return
      setCoupons((prev) => [coupon, ...prev.filter((c) => c.code !== coupon.code)])
    }

    const handleCouponUpdated = (coupon) => {
      if (!coupon) return
      setCoupons((prev) => prev.map((c) => (c._id === coupon._id || c.code === coupon.code ? coupon : c)))
    }

    const handleCouponDeleted = ({ couponId }) => {
      if (!couponId) return
      setCoupons((prev) => prev.filter((c) => c._id !== couponId && c.code !== couponId))
    }

    const handleSettingsUpdated = (data) => {
      if (!data) return
      if (data.marqueeText) setMarqueeText(data.marqueeText)
      setShippingSettings({
        shippingFeeEnabled: data.shippingFeeEnabled ?? true,
        standardShippingFee: data.standardShippingFee ?? 100,
        freeShippingThreshold: data.freeShippingThreshold ?? 2500,
      })
    }

    socket.on('ORDER_CREATED', handleOrderCreated)
    socket.on('ORDER_UPDATED', handleOrderUpdated)
    socket.on('ORDER_STATUS_UPDATED', handleOrderUpdated)
    socket.on('ORDER_CANCELLED', handleOrderCancelled)
    socket.on('PRODUCT_CREATED', handleProductCreated)
    socket.on('PRODUCT_UPDATED', handleProductUpdated)
    socket.on('PRODUCT_DELETED', handleProductDeleted)
    socket.on('COLLECTION_CREATED', handleCollectionCreated)
    socket.on('COLLECTION_UPDATED', handleCollectionUpdated)
    socket.on('COLLECTION_DELETED', handleCollectionDeleted)
    socket.on('CUSTOM_REQUEST_CREATED', handleCustomRequestCreated)
    socket.on('CUSTOM_REQUEST_UPDATED', handleCustomRequestUpdated)
    socket.on('CUSTOM_REQUEST_DELETED', handleCustomRequestDeleted)
    socket.on('REVIEW_CREATED', handleReviewCreated)
    socket.on('REVIEW_UPDATED', handleReviewUpdated)
    socket.on('REVIEW_DELETED', handleReviewDeleted)
    socket.on('COUPON_CREATED', handleCouponCreated)
    socket.on('COUPON_UPDATED', handleCouponUpdated)
    socket.on('COUPON_DELETED', handleCouponDeleted)
    socket.on('SETTINGS_UPDATED', handleSettingsUpdated)

    // Fallback sync interval
    const interval = setInterval(() => {
      refreshProductsFromApi()
      refreshCollectionsFromApi()
      refreshCustomRequestsFromApi()
      refreshOrdersFromApi()
      refreshUsersFromApi()
      refreshSettingsFromApi()
    }, 15000)

    return () => {
      socket.off('ORDER_CREATED', handleOrderCreated)
      socket.off('ORDER_UPDATED', handleOrderUpdated)
      socket.off('ORDER_STATUS_UPDATED', handleOrderUpdated)
      socket.off('ORDER_CANCELLED', handleOrderCancelled)
      socket.off('PRODUCT_CREATED', handleProductCreated)
      socket.off('PRODUCT_UPDATED', handleProductUpdated)
      socket.off('PRODUCT_DELETED', handleProductDeleted)
      socket.off('COLLECTION_CREATED', handleCollectionCreated)
      socket.off('COLLECTION_UPDATED', handleCollectionUpdated)
      socket.off('COLLECTION_DELETED', handleCollectionDeleted)
      socket.off('CUSTOM_REQUEST_CREATED', handleCustomRequestCreated)
      socket.off('CUSTOM_REQUEST_UPDATED', handleCustomRequestUpdated)
      socket.off('CUSTOM_REQUEST_DELETED', handleCustomRequestDeleted)
      socket.off('REVIEW_CREATED', handleReviewCreated)
      socket.off('REVIEW_UPDATED', handleReviewUpdated)
      socket.off('REVIEW_DELETED', handleReviewDeleted)
      socket.off('COUPON_CREATED', handleCouponCreated)
      socket.off('COUPON_UPDATED', handleCouponUpdated)
      socket.off('COUPON_DELETED', handleCouponDeleted)
      socket.off('SETTINGS_UPDATED', handleSettingsUpdated)
      clearInterval(interval)
    }
  }, [])



  useEffect(() => {
    localStorage.setItem('lilycharm_marquee', marqueeText)
  }, [marqueeText])

  const addProduct = async (newProduct) => {
    const rawImages = Array.isArray(newProduct.images) && newProduct.images.length > 0
      ? newProduct.images.map(img => typeof img === 'object' ? img.url : img)
      : (newProduct.image ? [newProduct.image] : [])

    const payload = {
      ...newProduct,
      slug: newProduct.title ? newProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : `flower-${Date.now()}`,
      image: newProduct.image || rawImages[0] || '',
      images: rawImages,
    }

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const savedDoc = await res.json()
        const formattedDoc = { ...savedDoc, id: savedDoc._id, mongoId: savedDoc._id, image: savedDoc.image || savedDoc.images?.[0] || payload.image }
        setProducts((prev) => [formattedDoc, ...prev.filter(p => p.id !== formattedDoc.id)])
      } else {
        const errText = await res.text()
        console.error('Failed to post creation to API:', res.status, errText)
      }
      refreshProductsFromApi()
    } catch (e) {
      console.error('Failed to post creation to MongoDB API:', e)
    }
  }

  const updateProduct = async (id, updatedFields) => {
    try {
      const targetId = updatedFields._id || updatedFields.mongoId || id
      const rawImages = Array.isArray(updatedFields.images) && updatedFields.images.length > 0
        ? updatedFields.images.map(img => typeof img === 'object' ? img.url : img)
        : (updatedFields.image ? [updatedFields.image] : [])

      const payload = {
        ...updatedFields,
        image: updatedFields.image || rawImages[0] || '',
        images: rawImages,
      }

      const res = await fetch(`${API_URL}/products/${targetId}`, {
        method: 'PUT',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        refreshProductsFromApi()
      } else {
        const errText = await res.text()
        console.error('Failed to update product in API:', res.status, errText)
      }
    } catch (e) {
      console.error('Failed to update creation in MongoDB API:', e)
    }
  }

  const deleteProduct = async (productOrId) => {
    const id = typeof productOrId === 'object' ? (productOrId.mongoId || productOrId._id || productOrId.id) : productOrId
    const specimen = typeof productOrId === 'object' ? productOrId.specimen : null

    setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id && p.mongoId !== id && p.specimen !== specimen))

    try {
      if (id) await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      else if (specimen) await fetch(`${API_URL}/products/${specimen}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshProductsFromApi()
    } catch (e) {
      console.error('Failed to delete creation in MongoDB API:', e)
    }
  }

  const deleteAllProducts = async () => {
    setProducts([])
    localStorage.setItem('lilycharm_products', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/products`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshProductsFromApi()
    } catch (e) {
      console.error('Failed to delete all products in MongoDB API:', e)
    }
  }

  const addCollection = async (newCol) => {
    const slug = newCol.slug || (newCol.title ? newCol.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : `col-${Date.now()}`)
    const rawImages = Array.isArray(newCol.images) && newCol.images.length > 0
      ? newCol.images.map(img => typeof img === 'object' ? img.url : img)
      : (newCol.image ? [newCol.image] : [])

    const payload = {
      ...newCol,
      slug,
      image: newCol.image || rawImages[0] || '',
      images: rawImages,
    }

    try {
      const res = await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        refreshCollectionsFromApi()
      } else {
        const errText = await res.text()
        console.error('Failed to add collection to API:', res.status, errText)
      }
    } catch (e) {
      console.error('Failed to add collection:', e)
    }
  }

  const updateCollection = async (id, updatedFields) => {
    const targetId = updatedFields.mongoId || updatedFields._id || updatedFields.slug || id
    const rawImages = Array.isArray(updatedFields.images) && updatedFields.images.length > 0
      ? updatedFields.images.map(img => typeof img === 'object' ? img.url : img)
      : (updatedFields.image ? [updatedFields.image] : [])

    const payload = {
      ...updatedFields,
      image: updatedFields.image || rawImages[0] || '',
      images: rawImages,
    }

    try {
      const res = await fetch(`${API_URL}/collections/${targetId}`, {
        method: 'PUT',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        refreshCollectionsFromApi()
      } else {
        const errText = await res.text()
        console.error('Failed to update collection in API:', res.status, errText)
      }
    } catch (e) {
      console.error('Failed to update collection:', e)
    }
  }

  const deleteCollection = async (colOrId) => {
    const id = typeof colOrId === 'object' ? (colOrId.mongoId || colOrId._id || colOrId.slug || colOrId.id) : colOrId
    const slug = typeof colOrId === 'object' ? colOrId.slug : id

    setCollections((prev) => prev.filter((c) => c.id !== id && c._id !== id && c.mongoId !== id && c.slug !== slug && c.slug !== id))

    try {
      if (id) await fetch(`${API_URL}/collections/${id}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      else if (slug) await fetch(`${API_URL}/collections/${slug}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshCollectionsFromApi()
    } catch (e) {
      console.error('Failed to delete collection:', e)
    }
  }

  const deleteAllCollections = async () => {
    setCollections([])
    localStorage.setItem('lilycharm_collections', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/collections`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshCollectionsFromApi()
    } catch (e) {
      console.error('Failed to delete all collections in MongoDB API:', e)
    }
  }

  const updateOrderStatus = async (orderOrId, newStatus, trackingNumber, carrier, note) => {
    const id = typeof orderOrId === 'object' ? (orderOrId.mongoId || orderOrId._id || orderOrId.orderNumber || orderOrId.id) : orderOrId
    setOrders((prev) =>
      prev.map((o) =>
        (o.id === id || o.mongoId === id || o._id === id || o.orderNumber === id)
          ? {
              ...o,
              orderStatus: newStatus || o.orderStatus,
              status: newStatus || o.status,
              ...(trackingNumber !== undefined ? { trackingNumber } : {}),
              ...(carrier !== undefined ? { carrier } : {}),
            }
          : o
      )
    )
    try {
      const payload = {}
      if (newStatus) payload.status = newStatus
      if (trackingNumber !== undefined) payload.trackingNumber = trackingNumber
      if (carrier !== undefined) payload.carrier = carrier
      if (note !== undefined) payload.note = note

      const res = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('Failed to update status in API:', res.status, await res.text())
      }
      refreshOrdersFromApi()
    } catch (e) {
      console.error('Failed to update order status:', e)
    }
  }

  const deleteOrder = async (orderOrId) => {
    const id = typeof orderOrId === 'object' ? (orderOrId.mongoId || orderOrId._id || orderOrId.orderNumber || orderOrId.id) : orderOrId
    setOrders((prev) => prev.filter((o) => o.id !== id && o.mongoId !== id && o._id !== id && o.orderNumber !== id))
    try {
      await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshOrdersFromApi()
    } catch (e) {
      console.error('Failed to delete order:', e)
    }
  }

  const deleteAllOrders = async () => {
    setOrders([])
    localStorage.setItem('lilycharm_orders', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/orders`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshOrdersFromApi()
    } catch (e) {
      console.error('Failed to delete all orders:', e)
    }
  }

  const updateMarquee = async (text) => {
    setMarqueeText(text)
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ marqueeText: text }),
      })
    } catch (e) {
      console.error('Failed to update marquee text on server:', e)
    }
  }

  const updateCustomRequestStatus = async (id, status, reason = '') => {
    setCustomRequests((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status, ...(reason ? { adminNotes: reason } : {}) } : r))
    )
    try {
      await fetch(`${API_URL}/custom-requests/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status, reason, adminNotes: reason }),
      })
      refreshCustomRequestsFromApi()
    } catch (e) {
      console.error('Failed to update custom request status:', e)
    }
  }

  const quoteCustomPrice = async (id, quotedPrice, adminNotes) => {
    setCustomRequests((prev) =>
      prev.map((r) => (r._id === id ? { ...r, quotedPrice: Number(quotedPrice), adminNotes, status: 'Quoted' } : r))
    )
    try {
      await fetch(`${API_URL}/custom-requests/${id}/quote`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quotedPrice, adminNotes }),
      })
      refreshCustomRequestsFromApi()
    } catch (e) {
      console.error('Failed to quote price:', e)
    }
  }

  const deleteCustomRequest = async (id) => {
    setCustomRequests((prev) => prev.filter((r) => r._id !== id))
    try {
      await fetch(`${API_URL}/custom-requests/${id}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshCustomRequestsFromApi()
    } catch (e) {
      console.error('Failed to delete custom request:', e)
    }
  }



  const [reviews, setReviews] = useState([])

  const refreshReviewsFromApi = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews?admin=true`, {
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setReviews(data)
        }
      }
    } catch (e) {
      console.error('Failed to fetch reviews:', e)
    }
  }

  useEffect(() => {
    refreshReviewsFromApi()
  }, [])

  const toggleReviewDisplay = async (id, isDisplayed) => {
    setReviews((prev) =>
      prev.map((r) => (r._id === id ? { ...r, isDisplayed } : r))
    )
    try {
      await fetch(`${API_URL}/reviews/${id}/display`, {
        method: 'PATCH',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ isDisplayed }),
      })
      refreshReviewsFromApi()
    } catch (e) {
      console.error('Failed to toggle review display:', e)
    }
  }

  const deleteReview = async (id) => {
    setReviews((prev) => prev.filter((r) => r._id !== id))
    try {
      await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE', headers: getAdminHeaders(), credentials: 'include' })
      refreshReviewsFromApi()
    } catch (e) {
      console.error('Failed to delete review:', e)
    }
  }

  const [coupons, setCoupons] = useState(() => {
    const saved = localStorage.getItem('lilycharm_coupons')
    return saved ? JSON.parse(saved) : []
  })

  const refreshCouponsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`${API_URL}/coupons`, {
        signal: controller.signal,
        headers: getAdminHeaders(),
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCoupons(data)
          localStorage.setItem('lilycharm_coupons', JSON.stringify(data))
        }
      }
    } catch (e) {
      // offline safe
    }
  }

  const addCoupon = async (newCoupon) => {
    try {
      const res = await fetch(`${API_URL}/coupons`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(newCoupon),
      })
      if (res.ok) {
        const saved = await res.json()
        setCoupons((prev) => [saved, ...prev.filter((c) => c.code !== saved.code)])
        refreshCouponsFromApi()
        return { success: true, coupon: saved }
      } else {
        const err = await res.json()
        return { success: false, message: err.message || 'Failed to create coupon' }
      }
    } catch (e) {
      console.error('Failed to create coupon:', e)
      return { success: false, message: 'Server error creating coupon' }
    }
  }

  const toggleCoupon = async (coupon) => {
    const couponId = coupon._id || coupon.id || coupon.code
    const newStatus = !coupon.isActive
    setCoupons((prev) =>
      prev.map((c) => (c._id === couponId || c.code === coupon.code ? { ...c, isActive: newStatus } : c))
    )
    try {
      await fetch(`${API_URL}/coupons/${couponId}`, {
        method: 'PUT',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ isActive: newStatus }),
      })
      refreshCouponsFromApi()
    } catch (e) {
      console.error('Failed to toggle coupon status:', e)
    }
  }

  const deleteCoupon = async (couponOrId) => {
    const id = typeof couponOrId === 'object' ? (couponOrId._id || couponOrId.id || couponOrId.code) : couponOrId
    const code = typeof couponOrId === 'object' ? couponOrId.code : null

    // Immediately remove from UI and localStorage
    setCoupons((prev) => prev.filter((c) => c._id !== id && c.id !== id && c.code !== code && c.code !== id))
    const current = JSON.parse(localStorage.getItem('lilycharm_coupons') || '[]')
    const filtered = current.filter((c) => c._id !== id && c.id !== id && c.code !== code && c.code !== id)
    localStorage.setItem('lilycharm_coupons', JSON.stringify(filtered))

    try {
      if (id) {
        await fetch(`${API_URL}/coupons/${id}`, {
          method: 'DELETE',
          headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
        })
      }
      refreshCouponsFromApi()
    } catch (e) {
      console.error('Failed to delete coupon in MongoDB API:', e)
    }
  }

  useEffect(() => {
    refreshCouponsFromApi()
    refreshSettingsFromApi()
  }, [])

  return (
    <StudioContext.Provider
      value={{
        products,
        collections,
        orders,
        customRequests,
        users,
        reviews,
        marqueeText,
        shippingSettings,
        updateShippingSettings,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteAllProducts,
        addCollection,
        updateCollection,
        deleteCollection,
        deleteAllCollections,
        updateOrderStatus,
        deleteOrder,
        deleteAllOrders,
        quoteCustomPrice,
        updateCustomRequestStatus,
        deleteCustomRequest,
        toggleReviewDisplay,
        deleteReview,
        refreshReviewsFromApi,
        updateMarquee,
        coupons,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
        refreshCouponsFromApi,
        refreshProductsFromApi,
        refreshCollectionsFromApi,
        refreshCustomRequestsFromApi,
        refreshOrdersFromApi,
        refreshUsersFromApi,
        refreshSettingsFromApi,
      }}
    >
      {children}
    </StudioContext.Provider>
  )
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}
