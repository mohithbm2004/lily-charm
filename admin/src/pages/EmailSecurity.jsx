import { useState, useEffect } from 'react'
import { Shield, RefreshCw, AlertOctagon, CheckCircle, Search, Trash2, Mail, AlertTriangle } from 'lucide-react'
import { API_URL } from '../config/api'

export default function EmailSecurity() {
  const [stats, setStats] = useState(null)
  const [suppressedEmails, setSuppressedEmails] = useState([])
  const [bounceLogs, setBounceLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const fetchSecurityData = async () => {
    setIsLoading(true)
    setActionMessage('')
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/admin/email-security/stats`, {
        credentials: 'include',
      })
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      // Fetch suppressed emails
      const suppRes = await fetch(`${API_URL}/admin/email-security/suppressed?search=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      })
      if (suppRes.ok) {
        const data = await suppRes.json()
        setSuppressedEmails(data.suppressedEmails || [])
      }

      // Fetch bounce logs
      const bounceRes = await fetch(`${API_URL}/admin/email-security/bounces`, {
        credentials: 'include',
      })
      if (bounceRes.ok) {
        const data = await bounceRes.json()
        setBounceLogs(data.bounceLogs || [])
      }
    } catch (err) {
      console.error('Failed to load email security data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()
  }, [searchQuery])

  const handleResetCircuitBreaker = async () => {
    if (!window.confirm('Are you sure you want to reset the Email Circuit Breaker to CLOSED?')) return
    try {
      const res = await fetch(`${API_URL}/admin/email-security/circuit-breaker/reset`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setActionMessage('✅ Email circuit breaker has been reset to CLOSED.')
        fetchSecurityData()
      }
    } catch (err) {
      console.error('Reset circuit breaker error:', err)
    }
  }

  const handleUnsuppress = async (email) => {
    if (!window.confirm(`Remove ${email} from suppression list? This will allow future OTPs to be sent to this email.`)) return
    try {
      const res = await fetch(`${API_URL}/admin/email-security/suppressed/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setActionMessage(`✅ Email address ${email} removed from suppression list.`)
        fetchSecurityData()
      }
    } catch (err) {
      console.error('Unsuppress email error:', err)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#FAF8F5] min-h-screen text-[#1C1B18]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-widest mb-1">
            <Shield size={14} /> ZeptoMail Reputation & Bounce Safeguard
          </div>
          <h1 className="text-2xl font-bold font-serif">Email Security & Hard Bounce Protection</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor OTP dispatch health, hard bounce suppression lists, and circuit breaker status.
          </p>
        </div>

        <button
          onClick={fetchSecurityData}
          disabled={isLoading}
          className="px-4 py-2 bg-[#2B3925] text-white text-xs font-bold rounded-xl hover:bg-[#1E281A] transition-colors flex items-center gap-2 shadow-sm shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Status
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
          <CheckCircle size={16} /> {actionMessage}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Circuit Breaker Status Card */}
        <div className="bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
            <span>Circuit Breaker</span>
            <AlertOctagon size={16} className={stats?.circuitBreaker?.isOpen ? 'text-rose-600' : 'text-emerald-600'} />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold uppercase px-3 py-1 rounded-full text-xs font-mono ${
              stats?.circuitBreaker?.isOpen ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {stats?.circuitBreaker?.state || 'CLOSED'}
            </span>

            {stats?.circuitBreaker?.isOpen && (
              <button
                onClick={handleResetCircuitBreaker}
                className="text-[0.68rem] bg-rose-600 text-white px-2.5 py-1 rounded font-bold hover:bg-rose-700 transition-colors"
              >
                Reset Circuit
              </button>
            )}
          </div>
          <p className="text-[0.7rem] text-slate-500">
            {stats?.circuitBreaker?.isOpen
              ? '🚨 OTP dispatch temporarily paused due to spike'
              : '✅ Normal OTP dispatch operating smoothly'}
          </p>
        </div>

        {/* Suppressed Emails Count */}
        <div className="bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
            <span>Suppressed Addresses</span>
            <Mail size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono">{stats?.stats?.totalSuppressed || 0}</div>
          <p className="text-[0.7rem] text-slate-500">Blocked addresses with recorded hard bounces</p>
        </div>

        {/* Hard Bounces 24h */}
        <div className="bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
            <span>Hard Bounces (24h)</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700">{stats?.stats?.hardBounces24h || 0}</div>
          <p className="text-[0.7rem] text-slate-500">Permanent delivery failures in last 24 hours</p>
        </div>

        {/* Security Events 24h */}
        <div className="bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
            <span>Security Incidents</span>
            <Shield size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-800">{stats?.stats?.securityIncidents24h || 0}</div>
          <p className="text-[0.7rem] text-slate-500">Rate limit & burst blocks in last 24 hours</p>
        </div>
      </div>

      {/* Suppressed Email Addresses Table */}
      <div className="bg-white border border-[#E8E2D8] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#E8E2D8] pb-4">
          <div>
            <h2 className="text-lg font-bold font-serif">Suppressed Undeliverable Addresses</h2>
            <p className="text-xs text-slate-500">These email addresses will not receive automatic OTP emails until un-suppressed.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search suppressed email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#E8E2D8] pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:border-[#2B3925]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D8] text-slate-500 uppercase font-bold text-[0.68rem] bg-[#FAF8F5]">
                <th className="p-3">Email Address</th>
                <th className="p-3">Bounce Reason</th>
                <th className="p-3">Code</th>
                <th className="p-3">Source</th>
                <th className="p-3">Suppressed Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8]">
              {suppressedEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic font-mono text-xs">
                    No suppressed email addresses recorded.
                  </td>
                </tr>
              ) : (
                suppressedEmails.map((item) => (
                  <tr key={item._id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#2B3925]">
                      {item.email}
                      <div className="text-[0.65rem] text-slate-400 font-sans font-normal">
                        Masked: {item.maskedEmail}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{item.reason || 'Hard bounce'}</td>
                    <td className="p-3 font-mono font-bold text-rose-700">{item.bounceCode || '550'}</td>
                    <td className="p-3 font-mono text-slate-500">{item.source || 'zeptomail-smtp'}</td>
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleUnsuppress(item.email)}
                        className="px-2.5 py-1 bg-rose-50 border border-rose-300 text-rose-800 text-[0.68rem] font-bold rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1 ml-auto"
                        title="Remove from suppression list"
                      >
                        <Trash2 size={12} /> Un-suppress
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bounce Logs */}
      <div className="bg-white border border-[#E8E2D8] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="border-b border-[#E8E2D8] pb-3">
          <h2 className="text-lg font-bold font-serif">Recent Email Bounce Activity Logs</h2>
          <p className="text-xs text-slate-500">Live stream of hard/soft bounce notifications caught from SMTP and Webhooks.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D8] text-slate-500 uppercase font-bold text-[0.68rem] bg-[#FAF8F5]">
                <th className="p-3">Time</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Type</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8]">
              {bounceLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 italic font-mono text-xs">
                    No bounce log events recorded.
                  </td>
                </tr>
              ) : (
                bounceLogs.slice(0, 15).map((log) => (
                  <tr key={log._id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="p-3 font-mono text-slate-500">{new Date(log.createdAt).toLocaleTimeString('en-IN')}</td>
                    <td className="p-3 font-mono text-slate-800">{log.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold font-mono uppercase ${
                        log.bounceType === 'hard' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {log.bounceType}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{log.channel || 'OTP'}</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate">{log.reason || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
