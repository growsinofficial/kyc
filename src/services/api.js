// API Service for KYC Backend Integration
// Use Next.js proxy when embedded, fallback to direct backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     (window.location.hostname === 'localhost' && window.location.port === '3000' 
                       ? 'http://localhost:3000/api' 
                       : 'http://localhost:5000/api')

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
    this.token = localStorage.getItem('authToken')
  }

  // Helper method to make HTTP requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for httpOnly auth
      ...options,
    }

    // Add auth token if available
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, config)
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      let data
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // For non-JSON responses (like 404 HTML pages)
        const text = await response.text()
        data = { 
          message: `HTTP error! status: ${response.status}`,
          details: text.substring(0, 100) + '...' // Truncate for debugging
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API Request failed:', error)
      throw error
    }
  }

  // Auth methods
  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    
    if (response.token) {
      this.token = response.token
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('currentUser', response.user.email)
    }
    
    return response
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    
    if (response.token) {
      this.token = response.token
      localStorage.setItem('authToken', response.token)
      localStorage.setItem('currentUser', response.user.email)
    }
    
    return response
  }

  async logout() {
    this.token = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
    // Could also call backend logout endpoint if implemented
  }

  async sendEmailOTP(email) {
    return await this.request('/auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async sendMobileOTP(mobile) {
    return await this.request('/auth/send-mobile-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    })
  }

  async verifyEmailOTP(email, otp) {
    return await this.request('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
  }

  async verifyMobileOTP(mobile, otp) {
    return await this.request('/auth/verify-mobile-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    })
  }

  async forgotPassword(email) {
    return await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(token, newPassword) {
    return await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
  }

  // KYC methods
  async submitPersonalInfo(data) {
    console.log('🔍 API submitPersonalInfo called with:', data)
    return await this.request('/kyc/personal', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitAddressInfo(data) {
    return await this.request('/kyc/address', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async submitProfessionalInfo(data) {
    return await this.request('/kyc/professional', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getKYCData() {
    return await this.request('/kyc/data')
  }

  async submitKYCForReview() {
    return await this.request('/kyc/submit', {
      method: 'POST',
    })
  }

  // Document methods
  async uploadDocument(documentType, file) {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('documentType', documentType)

    return await this.request('/documents/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        Authorization: this.token ? `Bearer ${this.token}` : undefined,
      },
      body: formData,
    })
  }

  async getDocuments() {
    return await this.request('/documents')
  }

  async deleteDocument(documentId) {
    return await this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    })
  }

  // Risk Profile methods
  async submitRiskProfile(answers) {
    return await this.request('/risk/submit', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
  }

  async getRiskProfile() {
    return await this.request('/risk/profile')
  }

  // Plans methods
  async getPlans() {
    return await this.request('/plans')
  }

  async getPlanDetails(planId) {
    return await this.request(`/plans/${planId}`)
  }

  // Payment methods
  async initiatePayment(planId, paymentMethod = 'zoho') {
    return await this.request('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethod }),
    })
  }

  async verifyPayment(paymentId, signature) {
    return await this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ paymentId, signature }),
    })
  }

  async getPaymentHistory() {
    return await this.request('/payments/history')
  }

  // User methods
  async getCurrentUser() {
    return await this.request('/auth/me')
  }

  async updateProfile(profileData) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  // Health check
  async healthCheck() {
    return await this.request('/health')
  }
}

// Create and export a singleton instance
const apiService = new ApiService()
export default apiService

// Export individual methods for easier imports
export const {
  register,
  login,
  logout,
  sendEmailOTP,
  sendMobileOTP,
  verifyEmailOTP,
  verifyMobileOTP,
  forgotPassword,
  resetPassword,
  submitPersonalInfo,
  submitAddressInfo,
  submitProfessionalInfo,
  getKYCData,
  submitKYCForReview,
  uploadDocument,
  getDocuments,
  deleteDocument,
  submitRiskProfile,
  getRiskProfile,
  getPlans,
  getPlanDetails,
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  getCurrentUser,
  updateProfile,
  healthCheck,
} = apiService

// Export aliases for better naming
export const fetchKycData = apiService.getKYCData.bind(apiService)