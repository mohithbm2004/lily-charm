import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { products as initialProducts, categories as initialCategories } from '../data/products'

import { API_URL } from '../config/api'
import { getSocket } from '../services/socket'

const StudioContext = createContext(null)

const initialOrders = []

// Purge any stale client-side entity caches from previous sessions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('lilycharm_products')
    localStorage.removeItem('lilycharm_collections')
    localStorage.removeItem('lilycharm_orders')
  } catch {}
}

export function StudioProvider({ children }) {
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const [marqueeText, setMarqueeText] = useState(() => {
    const saved = localStorage.getItem('lilycharm_marquee')
    return saved || 'FREE DELIVERY ON ORDERS ABOVE ₹2500 • HANDCRAFTED VELVET BOTANICAL FLORALS • USE CODE LILY10 FOR 10% OFF'
  })

  const [shippingSettings, setShippingSettings] = useState(() => {
    const saved = localStorage.getItem('lilycharm_shipping_settings')
    return saved !== null ? JSON.parse(saved) : {
      shippingFeeEnabled: true,
      standardShippingFee: 100,
      freeShippingThreshold: 2500,
    }
  })

  const refreshSettingsFromApi = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`)
      if (res.ok) {
        const data = await res.json()
        if (data?.marqueeText) setMarqueeText(data.marqueeText)
        if (data?.offerCode) {
          setActiveOffer((prev) => ({
            ...prev,
            code: data.offerCode,
            discountPercent: data.discountPercent ?? prev.discountPercent,
            bannerText: data.offerTitle || prev.bannerText,
            enabled: data.isOfferActive ?? prev.enabled,
          }))
        }
        const updated = {
          shippingFeeEnabled: data?.shippingFeeEnabled !== undefined ? Boolean(data.shippingFeeEnabled) : true,
          standardShippingFee: data?.standardShippingFee !== undefined ? Number(data.standardShippingFee) : 100,
          freeShippingThreshold: data?.freeShippingThreshold !== undefined ? Number(data.freeShippingThreshold) : 2500,
        }
        setShippingSettings(updated)
        localStorage.setItem('lilycharm_shipping_settings', JSON.stringify(updated))
      }
    } catch {}
  }

  const refreshProductsFromApi = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(`${API_URL}/products`, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data
            .filter((p) => p && !p.isArchived && !p.archived)
            .map((p) => ({
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
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(`${API_URL}/collections`, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped = data.filter(Boolean).map((c) => ({
            ...c,
            id: c.slug || c._id || c.id,
            mongoId: c._id,
          }))
          setCollections(mapped)
        }
      }
    } catch {
      // offline safe
    }
  }

  useEffect(() => {
    Promise.allSettled([
      refreshProductsFromApi(),
      refreshCollectionsFromApi(),
      refreshSettingsFromApi(),
    ]).finally(() => {
      setLoading(false)
    })

    const socket = getSocket()

    const handleProductCreated = (newProd) => {
      if (!newProd || newProd.isArchived || newProd.archived) return
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
      if (updatedProd.isArchived || updatedProd.archived) {
        setProducts((prev) => prev.filter((p) => p.id !== targetId && p._id !== targetId && p.slug !== updatedProd.slug))
        return
      }
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

    const handleSettingsUpdated = (data) => {
      if (!data) return
      if (data.marqueeText) setMarqueeText(data.marqueeText)
      if (data.offerCode) {
        setActiveOffer((prev) => ({
          ...prev,
          code: data.offerCode,
          discountPercent: data.discountPercent ?? prev.discountPercent,
          bannerText: data.offerTitle || prev.bannerText,
          enabled: data.isOfferActive ?? prev.enabled,
        }))
      }
      setShippingSettings({
        shippingFeeEnabled: data.shippingFeeEnabled ?? true,
        standardShippingFee: data.standardShippingFee ?? 100,
        freeShippingThreshold: data.freeShippingThreshold ?? 2500,
      })
    }

    socket.on('PRODUCT_CREATED', handleProductCreated)
    socket.on('PRODUCT_UPDATED', handleProductUpdated)
    socket.on('PRODUCT_DELETED', handleProductDeleted)
    socket.on('COLLECTION_CREATED', handleCollectionCreated)
    socket.on('COLLECTION_UPDATED', handleCollectionUpdated)
    socket.on('COLLECTION_DELETED', handleCollectionDeleted)
    socket.on('SETTINGS_UPDATED', handleSettingsUpdated)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProductsFromApi()
        refreshCollectionsFromApi()
        refreshSettingsFromApi()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('PRODUCT_CREATED', handleProductCreated)
      socket.off('PRODUCT_UPDATED', handleProductUpdated)
      socket.off('PRODUCT_DELETED', handleProductDeleted)
      socket.off('COLLECTION_CREATED', handleCollectionCreated)
      socket.off('COLLECTION_UPDATED', handleCollectionUpdated)
      socket.off('COLLECTION_DELETED', handleCollectionDeleted)
      socket.off('SETTINGS_UPDATED', handleSettingsUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('lilycharm_marquee', marqueeText)
  }, [marqueeText])

  useEffect(() => {
    if (shippingSettings) {
      localStorage.setItem('lilycharm_shipping_settings', JSON.stringify(shippingSettings))
    }
  }, [shippingSettings])

  const addProduct = async (newProduct) => {
    const payload = {
      ...newProduct,
      slug: newProduct.title ? newProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : `flower-${Date.now()}`,
      images: newProduct.image ? [{ url: newProduct.image }] : [],
    }

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const savedDoc = await res.json()
        const formattedDoc = { ...savedDoc, id: savedDoc._id, mongoId: savedDoc._id, image: savedDoc.image || savedDoc.images?.[0]?.url || payload.image }
        setProducts((prev) => [formattedDoc, ...prev.filter(p => p.id !== formattedDoc.id)])
      }
      refreshProductsFromApi()
    } catch (e) {
      console.error('Failed to post creation to MongoDB API:', e)
    }
  }

  const updateProduct = async (id, updatedFields) => {
    try {
      const targetId = updatedFields._id || updatedFields.mongoId || id
      const res = await fetch(`${API_URL}/products/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      })
      if (res.ok) {
        refreshProductsFromApi()
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
    const payload = { ...newCol, slug }

    setCollections((prev) => [payload, ...prev])
    try {
      const res = await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        refreshCollectionsFromApi()
      }
    } catch (e) {
      console.error('Failed to add collection:', e)
    }
  }

  const updateCollection = async (id, updatedFields) => {
    const targetId = updatedFields.mongoId || updatedFields._id || updatedFields.slug || id
    setCollections((prev) =>
      prev.map((c) => (c.id === id || c.slug === id || c._id === id || c.mongoId === id ? { ...c, ...updatedFields } : c))
    )
    try {
      await fetch(`${API_URL}/collections/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      })
      refreshCollectionsFromApi()
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

  const addOrder = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev])
  }

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
    )
  }

  const updateMarquee = (text) => {
    setMarqueeText(text)
  }

  const updateShippingSettings = async (newSettings) => {
    const updated = { ...shippingSettings, ...newSettings }
    setShippingSettings(updated)
    localStorage.setItem('lilycharm_shipping_settings', JSON.stringify(updated))
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      refreshSettingsFromApi()
    } catch (e) {
      console.error('Failed to update shipping settings:', e)
    }
  }

  const contextValue = useMemo(() => ({
    products,
    collections,
    orders,
    loading,
    marqueeText,
    shippingSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    addCollection,
    updateCollection,
    deleteCollection,
    addOrder,
    updateOrderStatus,
    updateMarquee,
    updateShippingSettings,
    refreshProductsFromApi,
    refreshCollectionsFromApi,
    refreshSettingsFromApi,
  }), [products, collections, orders, loading, marqueeText, shippingSettings])

  return (
    <StudioContext.Provider value={contextValue}>
      {children}
    </StudioContext.Provider>
  )
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used within StudioProvider')
  return ctx
}
