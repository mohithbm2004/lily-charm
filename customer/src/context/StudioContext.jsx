import { createContext, useContext, useState, useEffect } from 'react'
import { products as initialProducts, categories as initialCategories } from '../data/products'

const StudioContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

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

  useEffect(() => {
    refreshProductsFromApi()
    refreshCollectionsFromApi()
    const interval = setInterval(() => {
      refreshProductsFromApi()
      refreshCollectionsFromApi()
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

  const updateOffer = (offerObj) => {
    setActiveOffer(offerObj)
  }

  return (
    <StudioContext.Provider
      value={{
        products,
        collections,
        orders,
        marqueeText,
        activeOffer,
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
        updateOffer,
        refreshProductsFromApi,
        refreshCollectionsFromApi,
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
