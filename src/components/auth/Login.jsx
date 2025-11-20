import { useState } from 'react'
import {
  Alert, Avatar, Button, Card, CardActions, CardContent, CardHeader,
  InputAdornment, Paper, Stack, TextField, Typography, Box,
  Fade, useTheme, useMediaQuery, CircularProgress, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Link
} from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/PhoneIphone'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import PersonIcon from '@mui/icons-material/Person'
import { isPhone, isEmail } from '../../utils/validation'
import { saveCurrentSession, saveUserProgress } from '../../utils/storage'
import { getInitialState } from '../../rootState.js'
import apiService from '../../services/api.js'

export default function Login({ setState }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [id, setId] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ id: false, pwd: false })

  // Forgot Password State
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async () => {
    setErr('')
    setTouched({ id: true, pwd: true })

    // Validation
    if (!isEmail(id) && !isPhone(id)) {
      return setErr('Enter valid email or 10-digit phone number')
    }
    if (!pwd) {
      return setErr('Please enter your password')
    }

    setLoading(true)

    try {
      // Login with backend API
      const credentials = {
        identifier: id, // Can be email or mobile
        password: pwd
      }

      const response = await apiService.login(credentials)
      
      // On successful login, update state while preserving structure
      setState(prevState => {
        const newState = {
          ...prevState, // Preserve existing state structure (including kycSubStepStatus)
          currentUser: response.user.email,
          currentStep: response.user.kycStatus === 'completed' ? 'plans' : 'kyc',
          userData: {
            ...prevState.userData, // Preserve existing userData structure
            name: response.user.name,
            email: response.user.email,
            mobile: response.user.mobile,
            userId: response.user.id
          },
          emailVerified: response.user.emailVerified,
          mobileVerified: response.user.mobileVerified,
          kycCompleted: response.user.kycStatus === 'completed',
          riskProfileCompleted: response.user.riskProfile?.completed || false
        }
        
        // Save session for persistence across page refreshes
        saveCurrentSession(response.user.email)
        saveUserProgress(response.user.email, newState)
        
        return newState
      })
      
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('No account')) {
        setErr('No account found with this email or phone. Please sign up.')
      } else if (error.message.includes('password') || error.message.includes('Invalid')) {
        setErr('Incorrect password. Please try again.')
      } else if (error.message.includes('locked')) {
        setErr('Account temporarily locked due to too many failed attempts. Please try again later.')
      } else {
        setErr(error.message || 'Login failed. Please try again.')
      }
    }
    
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setErr('Please enter your email address')
      return
    }

    if (!isEmail(resetEmail)) {
      setErr('Please enter a valid email address')
      return
    }

    setResetLoading(true)

    try {
      await apiService.forgotPassword(resetEmail)
      setResetSent(true)
      setErr('')
      
      // Auto close after success
      setTimeout(() => {
        setForgotPasswordOpen(false)
        setResetSent(false)
        setResetEmail('')
      }, 3000)
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('No account')) {
        setErr('No account found with this email address')
      } else {
        setErr(error.message || 'Failed to send reset email. Please try again.')
      }
    }

    setResetLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  const handleIdChange = (e) => {
    setId(e.target.value)
    if (err) setErr('')
  }

  const handlePwdChange = (e) => {
    setPwd(e.target.value)
    if (err === 'Please enter your password' || err === 'Incorrect password') setErr('')
  }

  const getFieldColor = (field) => {
    if (
      err &&
      (
        (field === 'id' && !isEmail(id) && !isPhone(id)) ||
        (field === 'pwd' && (err === 'Please enter your password' || err === 'Incorrect password'))
      )
    ) {
      return 'error'
    }
    if (touched[field] && (field === 'id' ? id : pwd)) return 'success'
    return 'primary'
  }

  return (
    <>
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
                <Stack
                  alignItems="center"
                  spacing={{ xs: 2, md: 3 }}
                  textAlign="center"
                  sx={{ width: '100%' }}
                >
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
                    Welcome Back!
                  </Typography>
                  <Typography
                    variant={isMobile ? 'body1' : 'h6'}
                    sx={{ opacity: 0.9, fontWeight: 300, fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}
                  >
                    Continue your journey with us
                  </Typography>
                  <Box sx={{ mt: { xs: 1, md: 2 } }}>
                    {[1, 2, 3].map((item) => (
                      <Stack key={item} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <VerifiedIcon sx={{ fontSize: { xs: 18, md: 20 }, opacity: 0.9 }} />
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          {['Secure authentication', 'Quick access', '24/7 Support'][item - 1]}
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
                      Welcome Back
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      Sign in to continue your application
                    </Typography>
                  }
                />

                <CardContent>
                  <Stack spacing={{ xs: 2, sm: 3 }}>
                    {/* Email/Phone Field */}
                    <TextField
                      label="Email or Phone Number"
                      value={id}
                      onChange={handleIdChange}
                      onBlur={() => setTouched(prev => ({ ...prev, id: true }))}
                      onKeyPress={handleKeyPress}
                      fullWidth
                      color={getFieldColor('id')}
                      error={!!err && (!isEmail(id) && !isPhone(id))}
                      helperText={
                        touched.id && !id
                          ? 'Enter your registered email or phone number'
                          : err && (!isEmail(id) && !isPhone(id))
                            ? err
                            : "We'll find your account using this information"
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {isPhone(id) ? 
                              <PhoneIcon color={getFieldColor('id')} /> : 
                              <EmailIcon color={getFieldColor('id')} />
                            }
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                    />

                    {/* Password Field */}
                    <TextField
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={pwd}
                      onChange={handlePwdChange}
                      onBlur={() => setTouched(prev => ({ ...prev, pwd: true }))}
                      onKeyPress={handleKeyPress}
                      fullWidth
                      color={getFieldColor('pwd')}
                      error={!!err && (err === 'Please enter your password' || err === 'Incorrect password')}
                      helperText={
                        touched.pwd && !pwd
                          ? 'Enter your password to continue'
                          : err && (err === 'Please enter your password' || err === 'Incorrect password')
                            ? err
                            : 'Enter the password you set during registration'
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color={getFieldColor('pwd')} />
                          </InputAdornment>
                        ),
                        endAdornment: pwd && (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                    />

                    {/* Forgot Password */}
                    <Box sx={{ textAlign: 'right', mt: -2 }}>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => setForgotPasswordOpen(true)}
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        Forgot your password?
                      </Link>
                    </Box>

                    {/* Alerts */}
                    {err && (
                      <Fade in>
                        <Alert severity="error" variant="outlined" sx={{ borderRadius: 1.1 }}>
                          <Typography variant="body2">{err}</Typography>
                        </Alert>
                      </Fade>
                    )}
                    {!err && isEmail(id) && pwd && (
                      <Fade in>
                        <Alert severity="success" variant="outlined" sx={{ borderRadius: 1.1 }}>
                          <Typography variant="body2">
                            All fields look good! Ready to sign in.
                          </Typography>
                        </Alert>
                      </Fade>
                    )}
                  </Stack>
                </CardContent>

                <CardActions sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
                  <Button
                    fullWidth
                    onClick={handleLogin}
                    disabled={loading || !id || !pwd}
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
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </CardActions>

                <Box sx={{ px: 3, pb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    align="center"
                    display="block"
                  >
                    Trouble signing in? Contact support or reset your password
                  </Typography>
                </Box>
              </Card>
            </Fade>
          </Stack>
        </Box>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={() => !resetLoading && setForgotPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Reset Your Password
          </Typography>
        </DialogTitle>

        <DialogContent>
          {!resetSent ? (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
              <TextField
                label="Email Address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                fullWidth
                disabled={resetLoading}
                error={!!err && err.includes('email')}
                helperText={err && err.includes('email') ? err : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color={resetEmail && isEmail(resetEmail) ? 'success' : 'primary'} />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                <VerifiedIcon />
              </Avatar>
              <Typography variant="h6" gutterBottom color="success.main">
                Reset Link Sent!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We've sent a password reset link to <strong>{resetEmail}</strong>. Please check your
                email and follow the instructions.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          {!resetSent ? (
            <>
              <Button onClick={() => setForgotPasswordOpen(false)} disabled={resetLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleForgotPassword}
                variant="contained"
                disabled={!resetEmail || !isEmail(resetEmail) || resetLoading}
                startIcon={resetLoading ? <CircularProgress size={20} /> : null}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setForgotPasswordOpen(false)
                setResetSent(false)
                setResetEmail('')
              }}
              variant="contained"
              fullWidth
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
