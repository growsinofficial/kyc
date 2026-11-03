// API client for the KYC backend.
// VITE_API_URL can point at the backend (e.g. https://api.example.com/api).
// By default requests go to /api, which Vite proxies to the backend in development.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const TOKEN_KEY = 'authToken'

class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
    try { this.token = localStorage.getItem(TOKEN_KEY) } catch { this.token = null }
  }

  setToken(token) {
    this.token = token || null
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch { /* storage unavailable */ }
  }

  async request(endpoint, { method = 'GET', body, raw = false } = {}) {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (this.token) headers.Authorization = `Bearer ${this.token}`
    let response
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers,
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
    }
    if (raw) {
      if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status)
      return response
    }
    const isJson = (response.headers.get('content-type') || '').includes('application/json')
    const data = isJson ? await response.json() : {}
    if (!response.ok) {
      if (response.status === 401 && this.token) this.setToken(null)
      throw new ApiError(data.error || data.message || `Request failed (${response.status})`, response.status, data.details)
    }
    return data
  }

  // ---- Auth ----
  sendEmailOTP(email) { return this.request('/auth/send-email-otp', { method: 'POST', body: { email } }) }
  verifyEmailOTP(email, otp) { return this.request('/auth/verify-email-otp', { method: 'POST', body: { email, otp } }) }
  sendMobileOTP(mobile) { return this.request('/auth/send-mobile-otp', { method: 'POST', body: { mobile } }) }
  verifyMobileOTP(mobile, otp) { return this.request('/auth/verify-mobile-otp', { method: 'POST', body: { mobile, otp } }) }
  async register(data) {
    const res = await this.request('/auth/register', { method: 'POST', body: data })
    this.setToken(res.token)
    return res
  }
  async login(identifier, password) {
    const res = await this.request('/auth/login', { method: 'POST', body: { identifier, password } })
    this.setToken(res.token)
    return res
  }
  async logout() {
    try { await this.request('/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    this.setToken(null)
  }
  me() { return this.request('/auth/me') }
  forgotPassword(email) { return this.request('/auth/forgot-password', { method: 'POST', body: { email } }) }
  resetPassword(token, password) { return this.request(`/auth/reset-password/${encodeURIComponent(token)}`, { method: 'PUT', body: { password } }) }

  // ---- Client details ----
  getKYC() { return this.request('/kyc/data') }
  saveDetails(details) { return this.request('/kyc/details', { method: 'POST', body: details }) }

  // ---- Risk profile ----
  getRiskProfile() { return this.request('/risk/profile') }
  saveRisk(answers) { return this.request('/risk/assessment', { method: 'POST', body: { answers } }) }

  // ---- Plans ----
  getPlans() { return this.request('/plans') }

  // ---- Agreement + eSign ----
  currentAgreement() { return this.request('/agreements/current') }
  generateAgreement(planId) { return this.request('/agreements/generate', { method: 'POST', body: { planId } }) }
  async agreementPdf(id) {
    const res = await this.request(`/agreements/${id}/pdf`, { raw: true })
    return new Uint8Array(await res.arrayBuffer())
  }
  startEsign(id) { return this.request(`/agreements/${id}/esign`, { method: 'POST' }) }
  completeEsign(id, payload = {}) { return this.request(`/agreements/${id}/esign/complete`, { method: 'POST', body: payload }) }
  esignReturn(digioDocId) { return this.request('/agreements/esign/return', { method: 'POST', body: { digio_doc_id: digioDocId } }) }

  // ---- Payment ----
  initiatePayment(planId) { return this.request('/payments/initiate', { method: 'POST', body: { planId, paymentMethod: 'zoho' } }) }
  verifyPayment(transactionId, paymentId) { return this.request('/payments/verify', { method: 'POST', body: { transactionId, paymentId } }) }
}

export { ApiError }
export default new ApiService()
