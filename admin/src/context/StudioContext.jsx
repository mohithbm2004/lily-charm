import { createContext, useContext, useState, useEffect } from 'react'
import { products as initialProducts, categories as initialCategories } from '../data/products'

const StudioContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const initialOrders = [
  {
    id: 'LC-2026-101',
    customerName: 'Ananya Sharma',
    email: 'ananya@gmail.com',
    phone: '+91 98765 43210',
    address: 'Flat 402, Lotus Apartments, MG Road',
    city: 'Bengaluru',
    pincode: '560001',
    items: [],
    total: 3499,
    paymentMethod: 'Razorpay Prepaid',
    paymentStatus: 'Paid',
    orderStatus: 'Handcrafting',
    date: '02 Aug 2026',
  },
]

export function StudioProvider({ children }) {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('lilycharm_products')
    return saved !== null ? JSON.parse(saved) : initialProducts
  })

  const [collections, setCollections] = useState(() => {
    const saved = localStorage.getItem('lilycharm_collections')
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      } catch {}
    }
    return []
  })

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('lilycharm_orders')
    return saved !== null ? JSON.parse(saved) : initialOrders
  })

  const [customRequests, setCustomRequests] = useState([])
  const [users, setUsers] = useState([])

  const refreshUsersFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${API_URL}/auth/users`, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setUsers(data)
      }
    } catch {
      // offline safe
    }
  }

  const [marqueeText, setMarqueeText] = useState(() => {
    const saved = localStorage.getItem('lilycharm_marquee')
    return saved || 'FREE DELIVERY ON ORDERS ABOVE ₹2500 • HANDCRAFTED VELVET FLORALS BY KEERTHANA BAPU • USE CODE LILY10 FOR 10% OFF'
  })

  const [activeOffer, setActiveOffer] = useState(() => {
    const saved = localStorage.getItem('lilycharm_offer')
    return saved !== null ? JSON.parse(saved) : {
      code: 'LILY10',
      discountPercent: 10,
      bannerText: 'SPECIAL OFFER: 10% OFF ON ALL HANDCRAFTED VELVET BOUQUETS',
      enabled: true,
    }
  })

  const refreshProductsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${API_URL}/products`, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data.map((p) => ({
            ...p,
            id: p._id || p.id,
            mongoId: p._id,
            image: p.image || p.images?.[0]?.url || '',
          }))
          setProducts(mapped)
          localStorage.setItem('lilycharm_products', JSON.stringify(mapped))
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
      const res = await fetch(`${API_URL}/collections`, { signal: controller.signal })
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
      const res = await fetch(`${API_URL}/custom-requests`, { signal: controller.signal })
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
      const res = await fetch(`${API_URL}/orders`, { signal: controller.signal })
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

  const refreshSettingsFromApi = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (res.ok) {
        const data = await res.json()
        if (data.offerCode) {
          setActiveOffer({
            code: data.offerCode,
            discountPercent: data.discountPercent,
            title: data.offerTitle || `${data.discountPercent}% OFF Studio Discount`,
            isActive: data.isOfferActive !== false,
          })
        }
        if (data.marqueeText) {
          setMarqueeText(data.marqueeText)
        }
      }
    } catch {
      // offline safe
    }
  }

  useEffect(() => {
    refreshProductsFromApi()
    refreshCollectionsFromApi()
    refreshCustomRequestsFromApi()
    refreshOrdersFromApi()
    refreshUsersFromApi()
    refreshSettingsFromApi()
    const interval = setInterval(() => {
      refreshProductsFromApi()
      refreshCollectionsFromApi()
      refreshCustomRequestsFromApi()
      refreshOrdersFromApi()
      refreshUsersFromApi()
      refreshSettingsFromApi()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('lilycharm_products', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem('lilycharm_collections', JSON.stringify(collections))
  }, [collections])

  useEffect(() => {
    localStorage.setItem('lilycharm_orders', JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    localStorage.setItem('lilycharm_marquee', marqueeText)
  }, [marqueeText])

  useEffect(() => {
    localStorage.setItem('lilycharm_offer', JSON.stringify(activeOffer))
  }, [activeOffer])

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
    const id = typeof productOrId === 'object' ? (productOrId._id || productOrId.mongoId || productOrId.id) : productOrId
    const specimen = typeof productOrId === 'object' ? productOrId.specimen : null

    setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id && p.specimen !== specimen))

    try {
      if (id) await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' })
      if (specimen) await fetch(`${API_URL}/products/${specimen}`, { method: 'DELETE' })
      refreshProductsFromApi()
    } catch (e) {
      console.error('Failed to delete creation in MongoDB API:', e)
    }
  }

  const deleteAllProducts = async () => {
    setProducts([])
    localStorage.setItem('lilycharm_products', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/products`, { method: 'DELETE' })
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      if (id) await fetch(`${API_URL}/collections/${id}`, { method: 'DELETE' })
      if (slug && slug !== id) await fetch(`${API_URL}/collections/${slug}`, { method: 'DELETE' })
      refreshCollectionsFromApi()
    } catch (e) {
      console.error('Failed to delete collection:', e)
    }
  }

  const deleteAllCollections = async () => {
    setCollections([])
    localStorage.setItem('lilycharm_collections', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/collections`, { method: 'DELETE' })
      refreshCollectionsFromApi()
    } catch (e) {
      console.error('Failed to delete all collections in MongoDB API:', e)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId || o.mongoId === orderId || o._id === orderId ? { ...o, orderStatus: newStatus, status: newStatus } : o))
    )
    try {
      const targetId = orderId
      await fetch(`${API_URL}/orders/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      refreshOrdersFromApi()
    } catch (e) {
      console.error('Failed to update order status:', e)
    }
  }

  const deleteOrder = async (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId && o.mongoId !== orderId && o._id !== orderId))
    try {
      await fetch(`${API_URL}/orders/${orderId}`, { method: 'DELETE' })
      refreshOrdersFromApi()
    } catch (e) {
      console.error('Failed to delete order:', e)
    }
  }

  const deleteAllOrders = async () => {
    setOrders([])
    localStorage.setItem('lilycharm_orders', JSON.stringify([]))
    try {
      await fetch(`${API_URL}/orders`, { method: 'DELETE' })
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marqueeText: text }),
      })
    } catch (e) {
      console.error('Failed to update marquee text on server:', e)
    }
  }

  const updateOffer = async (offerObj) => {
    setActiveOffer(offerObj)
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerCode: offerObj.code,
          discountPercent: offerObj.discountPercent,
          offerTitle: offerObj.title || `${offerObj.discountPercent}% OFF Studio Discount`,
          isOfferActive: offerObj.isActive !== false,
        }),
      })
    } catch (e) {
      console.error('Failed to update offer settings on server:', e)
    }
  }

  const updateCustomRequestStatus = async (id, status) => {
    setCustomRequests((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status } : r))
    )
    try {
      await fetch(`${API_URL}/custom-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_URL}/custom-requests/${id}`, { method: 'DELETE' })
      refreshCustomRequestsFromApi()
    } catch (e) {
      console.error('Failed to delete custom request:', e)
    }
  }

  return (
    <StudioContext.Provider
      value={{
        products,
        collections,
        orders,
        customRequests,
        users,
        marqueeText,
        activeOffer,
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
        updateMarquee,
        updateOffer,
        refreshProductsFromApi,
        refreshCollectionsFromApi,
        refreshCustomRequestsFromApi,
        refreshOrdersFromApi,
        refreshUsersFromApi,
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
