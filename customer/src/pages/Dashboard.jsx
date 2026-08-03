import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import { User, Package, MapPin, Sparkles, Upload, CheckCircle2, Search, Edit3, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const tabs = ['Profile Details', 'My Orders', 'Custom Price Quotes', 'Saved Addresses']

export default function Dashboard() {
  const { user, logout, updateUserProfile } = useAuth()
  const [tab, setTab] = useState('Profile Details')
  const [params] = useSearchParams()
  const justOrdered = params.get('order') === 'confirmed'

  // User profile state
  const [userProfile, setUserProfile] = useState(() => {
    return user || {
      name: 'Keerthana Bapu',
      email: 'keerthana@example.com',
      phone: '+91 98765 43210',
      address: '123 Atelier Studio Street',
      city: 'Bengaluru',
      pincode: '560001',
      profileImage: '',
    }
  })

  useEffect(() => {
    if (user) setUserProfile(user)
  }, [user])

  const [avatarPreview, setAvatarPreview] = useState(userProfile.profileImage || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Orders state from MongoDB
  const [userOrders, setUserOrders] = useState([])
  const [userCustomRequests, setUserCustomRequests] = useState([])

  const fetchProfileFromApi = async (email) => {
    if (!email) return
    try {
      const res = await fetch(`${API_URL}/auth/profile?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        setUserProfile(data)
        setAvatarPreview(data.profileImage || '')
        localStorage.setItem('lilycharm_user_profile', JSON.stringify(data))
      }
    } catch {
      // offline fallback
    }
  }

  const fetchUserOrdersAndRequests = async (email) => {
    if (!email) return
    try {
      const [ordRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/orders`),
        fetch(`${API_URL}/custom-requests`),
      ])
      if (ordRes.ok) {
        const ords = await ordRes.json()
        const myOrds = ords.filter(
          (o) => o.shippingAddress?.email?.toLowerCase().trim() === email.toLowerCase().trim()
        )
        setUserOrders(myOrds)
      }
      if (reqRes.ok) {
        const reqs = await reqRes.json()
        const myReqs = reqs.filter(
          (r) => r.email?.toLowerCase().trim() === email.toLowerCase().trim()
        )
        setUserCustomRequests(myReqs)
      }
    } catch {
      // offline safe
    }
  }

  useEffect(() => {
    fetchProfileFromApi(userProfile.email)
    fetchUserOrdersAndRequests(userProfile.email)
  }, [userProfile.email])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setSaveSuccessMsg('')

    try {
      const payload = {
        ...userProfile,
        image: avatarPreview,
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setUserProfile(data.user)
        updateUserProfile(data.user)
        setAvatarPreview(data.user.profileImage || '')
        localStorage.setItem('lilycharm_user_profile', JSON.stringify(data.user))
        setSaveSuccessMsg('✨ Profile created & updated successfully in MongoDB Atlas!')
        setTimeout(() => setSaveSuccessMsg(''), 4000)
      } else {
        alert('Failed to save profile. Please check details.')
      }
    } catch (err) {
      console.error('Failed to save user profile:', err)
      alert('Connection error. Please try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 pt-32 pb-24 text-[var(--color-ink)]">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--color-primary)] overflow-hidden bg-[var(--color-card-bg)] shrink-0 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-display)] uppercase">{userProfile.name}</h1>
              <p className="text-xs text-[var(--color-primary)] font-semibold font-mono">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-ink-soft)] bg-[var(--color-card-bg)] border border-[var(--color-line)] px-4 py-2 self-start">
            <span>Customer Profile:</span>
            <strong className="text-emerald-700">MongoDB Atlas Active</strong>
          </div>
        </div>

        {justOrdered && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 rounded">
            <CheckCircle2 size={16} /> Order confirmed — your order details have been saved to your profile and sent to our studio delivery team!
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 mt-8 items-start">
        {/* Tab Selector Sidebar */}
        <aside className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-left text-xs font-bold uppercase tracking-wider px-4 py-3 whitespace-nowrap transition-colors border-l-2 ${
                tab === t
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-card-bg)] border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </aside>

        {/* Tab Main Display Area */}
        <div className="space-y-6">
          {/* TAB 1: PROFILE DETAILS */}
          {tab === 'Profile Details' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl text-xs border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-8 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <User size={18} className="text-[var(--color-primary)]" /> User Profile Information
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Create and update your customer account profile in MongoDB Atlas database with Cloudinary avatar.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-100 text-emerald-900 font-bold text-xs rounded border border-emerald-300">
                  {saveSuccessMsg}
                </div>
              )}

              {/* Avatar Upload */}
              <div>
                <label className="block font-bold uppercase mb-2">Profile Avatar Photo (Cloudinary)</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border border-[var(--color-line)] overflow-hidden bg-[var(--color-bg)] shrink-0 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-[var(--color-ink-soft)]" />
                    )}
                  </div>
                  <label className="btn-outline text-[0.68rem] px-4 py-2 cursor-pointer flex items-center gap-1.5 font-bold uppercase">
                    <Upload size={14} /> Choose Avatar Photo
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-bold"
                    placeholder="e.g. Keerthana Bapu"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-semibold"
                    placeholder="e.g. keerthana@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={userProfile.city}
                    onChange={(e) => setUserProfile({ ...userProfile, city: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3"
                    placeholder="e.g. Bengaluru"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Street Address</label>
                <input
                  type="text"
                  value={userProfile.address}
                  onChange={(e) => setUserProfile({ ...userProfile, address: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3"
                  placeholder="e.g. 123 Atelier Studio Street"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">PIN Code</label>
                <input
                  type="text"
                  value={userProfile.pincode}
                  onChange={(e) => setUserProfile({ ...userProfile, pincode: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono"
                  placeholder="e.g. 560001"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary w-full py-3 text-xs uppercase font-bold tracking-widest disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving Profile to MongoDB Atlas...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* TAB 2: MY ORDERS */}
          {tab === 'My Orders' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[var(--color-line)] pb-3">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Package size={18} className="text-[var(--color-primary)]" /> My Placed Orders
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Live order status tracking fetched from MongoDB Atlas.
                </p>
              </div>

              {userOrders.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)]">
                  <p className="font-bold uppercase">No Orders Found for {userProfile.email}</p>
                  <p className="text-[0.7rem] mt-1">Place an order at checkout to track delivery status here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((o) => (
                    <div key={o._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-3">
                      <div className="flex justify-between items-start border-b border-[var(--color-line)] pb-3">
                        <div>
                          <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.orderNumber || o._id}</p>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">{new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="specimen-tag bg-emerald-800 text-white font-mono uppercase">{o.status || 'paid'}</span>
                      </div>

                      <div className="space-y-2">
                        {o.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {it.image && <img src={it.image} alt={it.title} className="w-10 h-12 object-cover border border-[var(--color-line)]" />}
                              <div>
                                <p className="font-bold">{it.title}</p>
                                <p className="text-[0.65rem] text-[var(--color-ink-soft)]">Qty: {it.qty || 1}</p>
                              </div>
                            </div>
                            <span className="font-bold text-[var(--color-primary)]">{formatPrice(it.price * (it.qty || 1))}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-[var(--color-line)] flex justify-between items-center text-xs font-bold">
                        <span>Total Paid</span>
                        <span className="text-emerald-800 text-sm font-mono">{formatPrice(o.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM PRICE QUOTES */}
          {tab === 'Custom Price Quotes' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[var(--color-line)] pb-3">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--color-primary)]" /> Custom Design Price Quotes
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Price quotes from lead artisan for your bespoke design requests.
                </p>
              </div>

              {userCustomRequests.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)]">
                  <p className="font-bold uppercase">No Custom Requests Found</p>
                  <p className="text-[0.7rem] mt-1">Submit a custom design request via the header button to receive price quotes!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userCustomRequests.map((req) => (
                    <div key={req._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-[var(--color-line)] pb-2">
                        <div>
                          <h4 className="font-bold text-sm font-[var(--font-display)]">{req.stylePreference}</h4>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="specimen-tag font-mono uppercase">{req.status}</span>
                      </div>
                      {req.quotedPrice > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 space-y-1">
                          <span className="eyebrow text-[0.65rem]">Quoted Price</span>
                          <p className="text-base font-bold text-emerald-800">{formatPrice(req.quotedPrice)}</p>
                          {req.adminNotes && <p className="text-[0.68rem] italic text-amber-900">{req.adminNotes}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED ADDRESSES */}
          {tab === 'Saved Addresses' && (
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-2 max-w-md text-xs">
              <div className="flex items-center gap-2 font-bold uppercase text-sm border-b border-[var(--color-line)] pb-2">
                <MapPin size={16} className="text-[var(--color-primary)]" /> Primary Shipping Address
              </div>
              <p className="font-bold text-sm">{userProfile.name}</p>
              <p className="text-[var(--color-ink-soft)]">{userProfile.address}</p>
              <p className="text-[var(--color-ink-soft)]">{userProfile.city} - {userProfile.pincode}</p>
              <p className="text-[var(--color-primary)] font-mono">{userProfile.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
