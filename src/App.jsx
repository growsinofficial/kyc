import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { 
  Box, 
  Chip, 
  Container, 
  Paper, 
  Stack, 
  Tab, 
  Tabs, 
  Typography, 
  Button, 
  Checkbox, 
  FormControlLabel,
  Fade
} from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { theme } from './theme/theme'
import { clearCurrentSession, loadCurrentSession, loadUserProgress, saveCurrentSession, saveUserProgress } from './utils/storage'
import { usePersist } from './hooks/usePersist'
import { getInitialState } from './rootState.js' 
import apiService from './services/api.js' 

// auth
import Signup from './components/auth/Signup'
import Login from './components/auth/Login'

// flows
import KycContainer from './components/kyc/KycContainer'
import Risk from './components/risk/Risk'
import Docs from './components/docs/Docs'
import Plans from './components/plan/Plans'
import SignAgreement from './components/agreement/SignAgreement'
import Payment from './components/payment/Payment'

// Assessment Component (moved outside)
function Assessment({ state, navigateTo }) {
  const [scrolled, setScrolled] = React.useState(false)
  const [ack, setAck] = React.useState(false)
  const scrollRef = useRef(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const noScrollNeeded = el.scrollHeight <= el.clientHeight + 1
    if (noScrollNeeded) setScrolled(true)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handle = () => {
      const noScrollNeeded = el.scrollHeight <= el.clientHeight + 1
      if (noScrollNeeded) setScrolled(true)
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const handleScroll = (e) => {
    const el = e.currentTarget
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setScrolled(true)
  }

  const canProceed = scrolled && ack

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" fontWeight={700} color="primary">
          Suitability Assessment
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label="ASSESSMENT" color="primary" variant="filled" />
        </Stack>
      </Stack>

      <Fade in timeout={800}>
        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 3, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'grey.100',
            overflow: 'hidden'
          }}
        >
          {/* Header Section */}
          <Box sx={{ 
            p: 4, 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
            borderBottom: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Investment Suitability Assessment
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Hello, <strong>{state.userData.name || 'Guest'}</strong>! Please read the following document carefully before proceeding. 
              This assessment helps ensure our recommendations align with your financial goals and risk tolerance.
            </Typography>
          </Box>

          {/* Scrollable Content */}
          <Box
            ref={scrollRef}
            sx={{
              maxHeight: { xs: 400, sm: 500 },
              overflow: 'auto',
              p: 4,
              bgcolor: 'grey.50',
            }}
            onScroll={handleScroll}
          >
            <Stack spacing={4}>
              {[1, 2, 3, 4, 5].map((p) => (
                <Box key={p} sx={{ 
                  p: 3, 
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                    Section {p}: Understanding Your Investment Profile
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
                    nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                    eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt 
                    in culpa qui officia deserunt mollit anim id est laborum.
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'primary.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'primary.100'
                  }}>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      Key Point: This section explains important aspects of investment suitability 
                      and risk assessment that are crucial for making informed decisions.
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Action Section */}
          <Box sx={{ 
            p: 3, 
            backgroundColor: 'white',
            borderTop: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={3}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={!scrolled}
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    sx={{ 
                      '&.Mui-disabled': {
                        color: 'grey.400'
                      }
                    }}
                  />
                }
                label={
                  <Typography variant="body1" color={scrolled ? 'text.primary' : 'text.disabled'}>
                    I have read and understood the complete document
                    {!scrolled && " (scroll to bottom to enable)"}
                  </Typography>
                }
              />

              <Button
                variant="contained"
                disabled={!canProceed}
                onClick={() => navigateTo('docs')}
                size="large"
                sx={{
                  minWidth: 140,
                  height: 48,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'grey.300',
                    transform: 'none',
                    boxShadow: 'none'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Continue
              </Button>
            </Stack>

            {/* Progress Indicator */}
            {!scrolled && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                {/* <Typography variant="caption" color="text.secondary">
                  📜 Scroll to the bottom to read the entire document
                </Typography> */}
              </Box>
            )}
          </Box>
        </Paper>
      </Fade>
    </Container>
  )
}

export default function App() {
  const [state, setState] = useState(getInitialState())
  const persist = usePersist(setState)
  const [authTab, setAuthTab] = useState(0) // 0 signup, 1 login
  const parentOriginRef = useRef('*')

  // Cache parent origin for secure postMessage communication when embedded in Next.js
  useEffect(() => {
    if (window.parent !== window) {
      try {
        if (document.referrer) {
          parentOriginRef.current = new URL(document.referrer).origin
        }
      } catch (error) {
        console.warn('Unable to determine parent origin:', error)
      }

      window.parent.postMessage({ type: 'KYC_LOADED' }, parentOriginRef.current)
    }
  }, [])

  // Handle OAuth callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthSuccess = urlParams.get('oauth') === 'success'
    const oauthError = urlParams.get('oauth') === 'error'
    const errorMessage = urlParams.get('error')

    if (oauthSuccess) {
      // Clear URL params and show success message
      window.history.replaceState({}, document.title, window.location.pathname)
      alert('Gmail OAuth connection successful! Email notifications are now enabled.')
    } else if (oauthError) {
      // Clear URL params and show error message
      window.history.replaceState({}, document.title, window.location.pathname)
      alert(`Gmail OAuth failed: ${errorMessage || 'Unknown error'}`)
    }
  }, [])

  // resume session
  useEffect(() => {
    let hasTriedRestore = false; // Prevent multiple restore attempts
    
    const logged = loadCurrentSession()
    const authToken = localStorage.getItem('authToken')
    
    if (logged && authToken) {
      const userState = loadUserProgress(logged)
      if (userState) {
        setState({ ...userState, currentUser: logged })
      }
    } else if (authToken && !logged && !hasTriedRestore) {
      hasTriedRestore = true;
      // If we have a token but no session, try to get user info from API
      const tryRestoreSession = async () => {
        try {
          const userInfo = await apiService.getCurrentUser()
          if (userInfo && userInfo.user) {
            const newState = {
              ...getInitialState(),
              currentUser: userInfo.user.email,
              currentStep: userInfo.user.kycStatus === 'completed' ? 'plans' : 'kyc',
              userData: {
                name: userInfo.user.name,
                email: userInfo.user.email,
                mobile: userInfo.user.mobile,
                userId: userInfo.user.id
              },
              emailVerified: userInfo.user.emailVerified,
              mobileVerified: userInfo.user.mobileVerified,
              kycCompleted: userInfo.user.kycStatus === 'completed',
              riskProfileCompleted: userInfo.user.riskProfile?.completed || false
            }
            setState(newState)
            saveCurrentSession(userInfo.user.email)
            saveUserProgress(userInfo.user.email, newState)
          }
        } catch (error) {
          console.log('Failed to restore session:', error)
          // Clear invalid token
          localStorage.removeItem('authToken')
          localStorage.removeItem('currentUser')
        }
      }
      
      // Add a small delay to prevent rapid successive calls
      setTimeout(tryRestoreSession, 100)
    }
  }, []) // Remove dependencies that could cause re-runs

  // Broadcast step changes and completion events to parent shell
  useEffect(() => {
    if (window.parent === window) return

    window.parent.postMessage(
      { type: 'KYC_STEP_CHANGE', data: { step: state.currentStep } },
      parentOriginRef.current
    )

    if (state.flags?.paymentDone) {
      window.parent.postMessage(
        { type: 'KYC_COMPLETE', data: { user: state.currentUser } },
        parentOriginRef.current
      )
    }
  }, [state.currentStep, state.flags?.paymentDone, state.currentUser])

  const navigateTo = (next) => persist(s => ({ ...s, currentStep: next }))
  const logout = () => { clearCurrentSession(); setState(getInitialState()) }

  const Auth = () => (
    <Container maxWidth="lg" sx={{ py: 2 }}>
<Stack 
  direction="row" 
  alignItems="center" 
  justifyContent="space-between" 
  sx={{ 
    mb: 1,
    p: 1.5,
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: 1.3,
    border: '1px solid',
    borderColor: 'grey.100'
  }}
>
  <Typography variant="h5" fontWeight={800}>Digital Onboarding</Typography>
  <Tabs value={authTab} onChange={(_,v)=>setAuthTab(v)} aria-label="auth tabs">
    <Tab label="Sign Up"/>
    <Tab label="Login"/>
  </Tabs>
</Stack>
      {authTab===0? <Signup state={state} persist={persist} setState={setState}/> : <Login setState={setState}/>}
    </Container>
  )

  const Screen = () => {
    switch (state.currentStep) {
      case 'auth': return <Auth/>
      case 'kyc': return <KycContainer state={state} persist={persist} onLogout={logout} navigateTo={navigateTo}/>
      case 'risk': return <Risk state={state} persist={persist} onLogout={logout} navigateTo={navigateTo}/>
      case 'assessment': return <Assessment state={state} navigateTo={navigateTo} onLogout={logout}/>
      case 'docs': return <Docs state={state} persist={persist} onLogout={logout} navigateTo={navigateTo}/>
      case 'plan': return <Plans state={state} persist={persist} onLogout={logout} navigateTo={navigateTo}/>
      case 'sign': return <SignAgreement state={state} onLogout={logout} navigateTo={navigateTo}/>
      case 'payment': return <Payment state={state} onLogout={logout}/>
      default: return <Auth/>
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ minHeight: '100dvh', bgcolor: '#f5f7fb' }}>
          <Screen/>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  )
}