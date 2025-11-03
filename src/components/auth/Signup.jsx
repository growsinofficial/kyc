import { useEffect, useRef, useState } from 'react'
import {
  Alert, Avatar, Button, Card, CardActions, CardContent, CardHeader, InputAdornment,
  Paper, Stack, TextField, Typography, Box, LinearProgress, Fade,
  useTheme, useMediaQuery, CircularProgress
} from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/PhoneIphone'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import { userExists, saveCurrentSession, saveUserProgress } from '../../utils/storage'
import { isEmail, isPhone } from '../../utils/validation'
import { getInitialState } from '../../rootState.js'

const DRAFT_KEY = 'signupDraft_v1'

export default function Signup({ state, persist, setState }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' })
  const [sending, setSending] = useState({ email: false, mobile: false })
  const [verifying, setVerifying] = useState({ email: false, mobile: false })
  const [otp, setOtp] = useState({ email: '', mobile: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [verified, setVerified] = useState({ email: false, mobile: false })
  const [progress, setProgress] = useState(0)
  const mounted = useRef(false)

  // Calculate form completion progress
  useEffect(() => {
    let completed = 0
    const total = 5 
    if (form.name.trim()) completed++
    if (isEmail(form.email)) completed++
    if (isPhone(form.mobile)) completed++
    if (form.password.length >= 8) completed++
    if (form.confirm && form.password === form.confirm) completed++
    setProgress((completed / total) * 100)
  }, [form])

  // ---- draft persistence helpers ----
  const saveDraft = (next = {}) => {
    const payload = { form, otp, verified, ...next }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)) } catch { }
  }

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data?.form) setForm(prev => ({ ...prev, ...data.form }))
      if (data?.otp) setOtp(prev => ({ ...prev, ...data.otp }))
      if (data?.verified) setVerified(prev => ({ ...prev, ...data.verified }))
    } catch { }
  }

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { } }

  // Rehydrate once on mount
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    loadDraft()
  }, [])

  // Keep local verified flags in sync with parent state
  useEffect(() => {
    if (state?.emailVerified && !verified.email) setVerified(v => ({ ...v, email: true }))
    if (state?.mobileVerified && !verified.mobile) setVerified(v => ({ ...v, mobile: true }))
  }, [state?.emailVerified, state?.mobileVerified])

  // Save draft whenever anything important changes
  useEffect(() => { saveDraft() }, [form, otp, verified])

  // ---- Field handlers ----
  const handleBlur = (field) => () => setTouched(prev => ({ ...prev, [field]: true }))

  const handleFormChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, mobile: value }))
    if (errors.mobile) setErrors(prev => ({ ...prev, mobile: '' }))
  }

  // ---- OTP send/verify ----
  const sendEmailOtp = async () => {
    setSending(p => ({ ...p, email: true }))
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSending(p => ({ ...p, email: false }))
  }

  const sendMobileOtp = async () => {
    setSending(p => ({ ...p, mobile: true }))
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSending(p => ({ ...p, mobile: false }))
  }

  const verifyEmailOtp = async () => {
    setVerifying(p => ({ ...p, email: true }))
    await new Promise(resolve => setTimeout(resolve, 800))
    if (otp.email === '123456') {
      persist(s => ({ ...s, emailVerified: true }))
      setVerified(v => ({ ...v, email: true }))
      setErrors(e => ({ ...e, emailOtp: undefined }))
      saveDraft({ verified: { ...verified, email: true } })
    } else {
      setErrors(e => ({ ...e, emailOtp: 'Invalid OTP. Try 123456' }))
    }
    setVerifying(p => ({ ...p, email: false }))
  }

  const verifyMobileOtp = async () => {
    setVerifying(p => ({ ...p, mobile: true }))
    await new Promise(resolve => setTimeout(resolve, 800))
    if (otp.mobile === '654321') {
      persist(s => ({ ...s, mobileVerified: true }))
      setVerified(v => ({ ...v, mobile: true }))
      setErrors(e => ({ ...e, mobileOtp: undefined }))
      saveDraft({ verified: { ...verified, mobile: true } })
    } else {
      setErrors(e => ({ ...e, mobileOtp: 'Invalid OTP. Try 654321' }))
    }
    setVerifying(p => ({ ...p, mobile: false }))
  }

  const canContinue = (state?.emailVerified || verified.email) &&
    (state?.mobileVerified || verified.mobile) &&
    form.name &&
    isEmail(form.email) &&
    isPhone(form.mobile) &&
    form.password.length >= 8 &&
    form.password === form.confirm

  // ---- Continue ----
  const handleContinue = async () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!isEmail(form.email)) errs.email = 'Valid email address is required'
    if (!isPhone(form.mobile)) errs.mobile = 'Valid 10-digit mobile number is required'
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (userExists(form.email)) errs.email = 'An account with this email already exists'
    if (userExists(form.mobile)) errs.mobile = 'An account with this phone number already exists'

    setTouched({ name: true, email: true, mobile: true, password: true, confirm: true })
    setErrors(errs)
    if (Object.keys(errs).length) return

    await new Promise(resolve => setTimeout(resolve, 500))

    const fresh = getInitialState()
    const merged = {
      ...fresh,
      userData: {
        ...fresh.userData,
        name: form.name.trim(),
        email: form.email.toLowerCase(),
        mobile: form.mobile,
        password: form.password
      },
      currentUser: form.email.toLowerCase(),
      currentStep: 'kyc',
      emailVerified: true,
      mobileVerified: true,
    }
    saveCurrentSession(form.email.toLowerCase())
    saveUserProgress(form.email.toLowerCase(), merged)
    saveUserProgress(form.mobile, merged)
    clearDraft()
    setState(merged)
  }

  const getFieldColor = (field) => {
    if (errors[field]) return 'error'
    if (touched[field] && form[field]) return 'success'
    return 'primary'
  }

  return (
    <Box sx={{
      minHeight: 'auto',
      py: { xs: 2, sm: 3, md: 2 },
      px: { xs: 1, sm: 2 }
    }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, sm: 3, md: 0 }}
          alignItems="stretch"
          sx={{ width: '100%' }}
        >
          {/* Hero Section */}
          <Paper
            elevation={8}
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              bgcolor: 'primary.main',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              color: '#fff',
              flex: { xs: 1, md: 0.45 },
              borderTopRightRadius: { xs: 2, sm: 3, md: 0 },
              borderBottomRightRadius: { xs: 2, sm: 3, md: 0 },
              borderTopLeftRadius: { xs: 2, sm: 3, md: 15 },
              borderBottomLeftRadius: { xs: 2, sm: 3, md: 15 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              minHeight: { xs: 300, md: 'auto' },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -50,
                right: -50,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack alignItems="center" spacing={{ xs: 2, md: 3 }} textAlign="center" sx={{ width: '100%' }}>
                <Avatar sx={{
                  width: { xs: 60, md: 80 },
                  height: { xs: 60, md: 80 },
                  bgcolor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <VerifiedIcon sx={{ fontSize: { xs: 30, md: 40 } }} />
                </Avatar>
                <Typography
                  variant={isMobile ? 'h5' : 'h4'}
                  fontWeight={800}
                  gutterBottom
                  sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}
                >
                  Secure Digital Onboarding
                </Typography>
                <Typography
                  variant={isMobile ? 'body1' : 'h6'}
                  sx={{ opacity: 0.9, fontWeight: 300, fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}
                >
                  Join thousands of users in our secure platform
                </Typography>
                <Box sx={{ mt: { xs: 1, md: 2 } }}>
                  {[1, 2, 3].map((item) => (
                    <Stack key={item} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: { xs: 18, md: 20 }, opacity: 0.9 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {['Bank-level security', 'Instant verification', '24/7 Support'][item - 1]}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Stack>
            </Box>
          </Paper>

          {/* Form Section */}
          <Fade in timeout={1000}>
            <Card
              sx={{
                flex: 1,
                borderTopLeftRadius: { xs: 8, sm: 12, md: 0 },
                borderBottomLeftRadius: { xs: 8, sm: 12, md: 0 },
                borderTopRightRadius: 15,
                borderBottomRightRadius: 15,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderLeft: { md: 'none' }, 
                backdropFilter: 'blur(10px)',
                minWidth: 0
              }}
            >
              <CardHeader
                title={
                  <Typography
                    variant={isMobile ? 'h5' : 'h4'}
                    fontWeight={700}
                    color="primary"
                    sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
                  >
                    Create Your Account
                  </Typography>
                }
                subheader={
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Complete your profile to begin the verification process
                  </Typography>
                }
                sx={{
                  px: { xs: 2, sm: 3 },
                  pt: { xs: 2, sm: 3 },
                  '& .MuiCardHeader-content': { width: '100%' }
                }}
              />

              {/* Progress Bar */}
              <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 0, sm: 1 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Profile Completion
                  </Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    {Math.round(progress)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: { xs: 4, sm: 6 },
                    borderRadius: 3,
                    backgroundColor: 'grey.100',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)'
                    }
                  }}
                />
              </Box>

              <CardContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
                <Stack spacing={{ xs: 2, sm: 3 }}>
                  {/* Name Field */}
                  <TextField
                    label="Full Name"
                    value={form.name}
                    error={!!errors.name && touched.name}
                    helperText={errors.name || (touched.name && 'Your legal name as per official documents')}
                    onChange={handleFormChange('name')}
                    onBlur={handleBlur('name')}
                    fullWidth
                    color={getFieldColor('name')}
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize={isMobile ? 'small' : 'medium'} color={getFieldColor('name')} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Email Field with OTP */}
                  <Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                      <TextField
                        label="Email Address"
                        type="email"
                        value={form.email}
                        error={!!errors.email && touched.email}
                        helperText={errors.email || (touched.email && "We'll send verification code to this email")}
                        onChange={handleFormChange('email')}
                        onBlur={handleBlur('email')}
                        fullWidth
                        color={verified.email ? 'success' : getFieldColor('email')}
                        size={isMobile ? 'small' : 'medium'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon fontSize={isMobile ? 'small' : 'medium'} color={verified.email ? 'success' : getFieldColor('email')} />
                            </InputAdornment>
                          ),
                        }}
                        disabled={verified.email}
                        sx={{
                          '& .MuiFormHelperText-root': {
                            position: 'absolute',
                            bottom: -20,
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                      <Button
                        onClick={sendEmailOtp}
                        disabled={!isEmail(form.email) || verified.email || sending.email}
                        color={verified.email ? 'success' : 'primary'}
                        variant={verified.email ? 'contained' : 'outlined'}
                        sx={{
                          minWidth: { xs: '100%', sm: 140 },
                          height: { xs: 48, sm: 56 },
                          borderRadius: 1.1,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          mt: { xs: (errors.email || touched.email) ? 2.5 : 0, sm: 0 }
                        }}
                        startIcon={verified.email ? <CheckCircleIcon /> : sending.email ? <CircularProgress size={20} /> : null}
                      >
                        {sending.email ? 'Sending' : verified.email ? 'Verified' : 'Send OTP'}
                      </Button>
                    </Stack>
                  </Box>

                  {/* Email OTP Field */}
                  {!verified.email && isEmail(form.email) && (
                    <Fade in>
                      <Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                          <TextField
                            label="Email Verification Code"
                            placeholder="Enter 123456"
                            value={otp.email}
                            onChange={(e) => setOtp({ ...otp, email: e.target.value })}
                            error={!!errors.emailOtp}
                            fullWidth
                            size={isMobile ? 'small' : 'medium'}
                            sx={{
                              flex: 1,
                              '& .MuiFormHelperText-root': {
                                position: 'absolute',
                                bottom: -20,
                                whiteSpace: 'nowrap'
                              }
                            }}
                          />
                          <Button
                            onClick={verifyEmailOtp}
                            disabled={!otp.email || verifying.email}
                            variant="contained"
                            sx={{
                              minWidth: { xs: '100%', sm: 120 },
                              height: { xs: 48, sm: 56 },
                              borderRadius: 1.1,
                              fontSize: { xs: '0.8rem', sm: '0.875rem' },
                              mt: { xs: errors.emailOtp ? 2.5 : 0, sm: 0 }
                            }}
                            startIcon={verifying.email ? <CircularProgress size={20} /> : null}
                          >
                            {verifying.email ? 'Verifying' : 'Verify'}
                          </Button>
                        </Stack>
                      </Box>
                    </Fade>
                  )}

                  {/* Mobile Field with OTP */}
                  <Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                      <TextField
                        label="Mobile Number"
                        value={form.mobile}
                        error={!!errors.mobile && touched.mobile}
                        onChange={handleMobileChange}
                        onBlur={handleBlur('mobile')}
                        fullWidth
                        color={verified.mobile ? 'success' : getFieldColor('mobile')}
                        size={isMobile ? 'small' : 'medium'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon fontSize={isMobile ? 'small' : 'medium'} color={verified.mobile ? 'success' : getFieldColor('mobile')} />
                            </InputAdornment>
                          ),
                        }}
                        disabled={verified.mobile}
                        sx={{
                          '& .MuiFormHelperText-root': {
                            position: 'absolute',
                            bottom: -20,
                            whiteSpace: 'nowrap'
                          }
                        }}
                      />
                      <Button
                        onClick={sendMobileOtp}
                        disabled={!isPhone(form.mobile) || verified.mobile || sending.mobile}
                        color={verified.mobile ? 'success' : 'primary'}
                        variant={verified.mobile ? 'contained' : 'outlined'}
                        sx={{
                          minWidth: { xs: '100%', sm: 140 },
                          height: { xs: 48, sm: 56 },
                          borderRadius: 1.1,
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          mt: { xs: (errors.mobile || touched.mobile) ? 2.5 : 0, sm: 0 }
                        }}
                        startIcon={verified.mobile ? <CheckCircleIcon /> : sending.mobile ? <CircularProgress size={20} /> : null}
                      >
                        {sending.mobile ? 'Sending' : verified.mobile ? 'Verified' : 'Send OTP'}
                      </Button>
                    </Stack>
                  </Box>

                  {/* Mobile OTP Field */}
                  {!verified.mobile && isPhone(form.mobile) && (
                    <Fade in>
                      <Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                          <TextField
                            label="Mobile Verification Code"
                            placeholder="Enter 654321"
                            value={otp.mobile}
                            onChange={(e) => setOtp({ ...otp, mobile: e.target.value })}
                            error={!!errors.mobileOtp}
                            helperText={errors.mobileOtp || 'Enter the code sent to your phone'}
                            fullWidth
                            size={isMobile ? 'small' : 'medium'}
                            sx={{
                              flex: 1,
                              '& .MuiFormHelperText-root': {
                                position: 'absolute',
                                bottom: -20,
                                whiteSpace: 'nowrap'
                              }
                            }}
                          />
                          <Button
                            onClick={verifyMobileOtp}
                            disabled={!otp.mobile || verifying.mobile}
                            variant="contained"
                            sx={{
                              minWidth: { xs: '100%', sm: 120 },
                              height: { xs: 48, sm: 56 },
                              borderRadius: 1.1,
                              fontSize: { xs: '0.8rem', sm: '0.875rem' },
                              mt: { xs: errors.mobileOtp ? 2.5 : 0, sm: 0 }
                            }}
                            startIcon={verifying.mobile ? <CircularProgress size={20} /> : null}
                          >
                            {verifying.mobile ? 'Verifying' : 'Verify'}
                          </Button>
                        </Stack>
                      </Box>
                    </Fade>
                  )}

                  {/* Password Fields */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <TextField
                      type="password"
                      label="Password"
                      value={form.password}
                      error={!!errors.password && touched.password}
                      helperText={errors.password || 'Minimum 8 characters with letters and numbers'}
                      onChange={handleFormChange('password')}
                      onBlur={handleBlur('password')}
                      fullWidth
                      color={getFieldColor('password')}
                      size={isMobile ? 'small' : 'medium'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon fontSize={isMobile ? 'small' : 'medium'} color={getFieldColor('password')} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <TextField
                      type="password"
                      label="Confirm Password"
                      value={form.confirm}
                      error={!!errors.confirm && touched.confirm}
                      helperText={errors.confirm || 'Re-enter your password to confirm'}
                      onChange={handleFormChange('confirm')}
                      onBlur={handleBlur('confirm')}
                      fullWidth
                      color={getFieldColor('confirm')}
                      size={isMobile ? 'small' : 'medium'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon fontSize={isMobile ? 'small' : 'medium'} color={getFieldColor('confirm')} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  {/* Status Alert */}
                  <Fade in>
                    <Alert
                      severity={canContinue ? 'success' : 'info'}
                      variant="outlined"
                      sx={{
                        borderRadius: 1.1,
                        border: '1px solid',
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'stretch', sm: 'center' },
                        gap: 1
                      }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          {canContinue
                            ? 'All set! Your account is ready to be created.'
                            : 'Complete all fields and verify your email & mobile to continue.'}
                        </Typography>
                        {!canContinue && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                              {verified.email ? '✓ Email' : '✗ Email'} • {verified.mobile ? '✓ Mobile' : '✗ Mobile'}
                            </Typography>
                            <RefreshIcon
                              fontSize="small"
                              sx={{ cursor: 'pointer', fontSize: { xs: '0.8rem', sm: '1rem' } }}
                              onClick={loadDraft}
                              title="Reload saved draft"
                            />
                          </Box>
                        )}
                      </Box>
                    </Alert>
                  </Fade>
                </Stack>
              </CardContent>

              <CardActions sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
                <Button
                  fullWidth
                  disabled={!canContinue}
                  onClick={handleContinue}
                  variant="contained"
                  size="large"
                  sx={{
                    height: { xs: 48, sm: 56 },
                    borderRadius: 1.1,
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-1px)'
                    },
                    '&:disabled': { background: 'grey.300' },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Create Account & Continue
                </Button>
              </CardActions>
            </Card>
          </Fade>
        </Stack>
      </Box>
    </Box>
  )
}
