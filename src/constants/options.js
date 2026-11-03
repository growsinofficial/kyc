// Values accepted by POST /api/kyc/details (see backend/routes/kyc.js)
export const GENDERS = ['Male', 'Female', 'Other']
export const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed']
export const OCCUPATIONS = ['Salaried Employee', 'Self Employed', 'Business Owner', 'Professional', 'Student', 'Retired', 'Homemaker', 'Others']
export const INDUSTRIES = ['Information Technology', 'Banking & Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Real Estate', 'Government', 'Agriculture', 'Others']
export const EXPERIENCE = ['0-2 years', '2-5 years', '5-10 years', '10+ years']
export const INCOME = ['Below 3 Lakhs', '3-5 Lakhs', '5-10 Lakhs', '10-25 Lakhs', '25-50 Lakhs', 'Above 50 Lakhs']

export const TENURE = { 'one-time': 'One time', monthly: 'Monthly', quarterly: 'Quarterly', yearly: '12 months' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`
}
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
export const digitsOnly = (s) => String(s || '').replace(/\D/g, '')
export function normalizeMobile(s) {
  let d = digitsOnly(s)
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}
export const isPAN = (s) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(s || '').toUpperCase().replace(/\s/g, ''))
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())
export const isMobile = (s) => /^[6-9]\d{9}$/.test(normalizeMobile(s))
