import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  Typography,
  Box,
  Paper,
  Fade,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material'
import ActiveHeader from '../layout/ActiveHeader'
import StepRail from '../layout/StepRail'
import PaymentIcon from '@mui/icons-material/Payment'
import PersonIcon from '@mui/icons-material/Person'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SecurityIcon from '@mui/icons-material/Security'

export default function Payment({ state, onLogout }) {
  const theme = useTheme()
  const isDownMd = useMediaQuery(theme.breakpoints.down('md'))
  const [processing, setProcessing] = useState(false)

  const md = state.userData.kyc || {}
  const u = state.userData
  const p = state.userData.selectedPlan || { title: 'No Plan Selected', price: '₹0.00' }

  const handlePayment = async () => {
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 2000))
    alert('Payment flow stubbed. Integrate Razorpay/Stripe as needed.')
    setProcessing(false)
  }

  const getPriceAmount = (priceString) => {
    if (!priceString) return '₹0.00'
    const firstPrice = priceString.split('/')[0].trim()
    return firstPrice
  }

  const memberDetails = [
    { label: 'Full Name', value: md.name || u.name, icon: <PersonIcon /> },
    { label: 'Email Address', value: u.email, icon: <EmailIcon /> },
    { label: 'Phone Number', value: u.mobile, icon: <PhoneIcon /> },
    { label: 'City', value: md.city, icon: <LocationOnIcon /> },
    { label: 'State', value: md.state, icon: <LocationOnIcon /> },
    { label: 'PAN Number', value: md.pan, icon: <CreditCardIcon /> },
  ]

  const totalAmount = getPriceAmount(p.price)
  const priceNum = parseInt(totalAmount.replace(/[^0-9]/g, '')) || 0
  const gstAmount = `₹${Math.round(priceNum * 0.18).toLocaleString('en-IN')}`

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <ActiveHeader state={state} onLogout={onLogout} />
      <StepRail activeId="payment" />

      {/* Two-column Grid: left info, right sticky summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
          mt: 1,
        }}
      >
        {/* LEFT: Member Details */}
        <Fade in timeout={600}>
          <Card
            sx={{
              borderRadius: 1.1,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'grey.100',
              minWidth: 0,
            }}
          >
            <CardContent sx={{ p: 0 }}>
              {/* Header */}
              <Box
                sx={{
                  p: 2,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: 'white',
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <PersonIcon sx={{ fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Member Information
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Review your personal and contact details
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Details Grid */}
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 3,
                  }}
                >
                  {memberDetails.map((detail, index) => (
                    <Fade in timeout={800} style={{ transitionDelay: `${index * 100}ms` }} key={index}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderColor: 'grey.200',
                          borderRadius: 1.1,
                          height: '100%',
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ color: 'primary.main' }}>{detail.icon}</Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                              {detail.label}
                            </Typography>
                          </Stack>
                          <Typography variant="body1" fontWeight={600} color="text.primary">
                            {detail.value || 'Not provided'}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Fade>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>

        {/* RIGHT: Sticky Payment Summary */}
        <Box sx={{ position: { xs: 'static', md: 'sticky' }, top: { md: 24 }, minWidth: 0 }}>
          <Fade in timeout={800}>
            <Card
              sx={{
                borderRadius: 1.1,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: 'none',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                {/* Header */}
                <Box
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    color: 'white',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <CreditCardIcon sx={{ fontSize: 32 }} />
                    <Typography variant="h6" fontWeight={700}>
                      Payment Summary
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    {/* Selected Plan */}
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        SELECTED PLAN
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color="primary.main">
                        {p.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.details}
                      </Typography>
                    </Box>

                    <Divider />

                    {/* Price Breakdown */}
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.primary">
                          Plan Fee
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="text.primary">
                          {totalAmount}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.primary">
                          GST (18%)
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="text.primary">
                          {gstAmount}
                        </Typography>
                      </Stack>

                      <Divider />

                      {/* Total */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={800} color="primary.main">
                          Total Amount
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                          {totalAmount}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Divider />

                    {/* Security Features */}
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <SecurityIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        <Typography variant="caption" color="text.secondary">
                          Secure SSL encrypted payment
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        <Typography variant="caption" color="text.secondary">
                          PCI DSS compliant
                        </Typography>
                      </Stack>
                    </Stack>

                    {/* Payment Button */}
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handlePayment}
                      disabled={processing}
                      startIcon={
                        processing ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />
                      }
                      sx={{
                        height: 52,
                        borderRadius: 1.1,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                          transform: 'translateY(-1px)',
                        },
                        '&:disabled': {
                          background: 'grey.300',
                          transform: 'none',
                          boxShadow: 'none',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {processing ? 'Processing...' : `Pay ${totalAmount}`}
                    </Button>

                    {/* Additional Info */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="center"
                      sx={{ display: 'block' }}
                    >
                      By proceeding, you agree to our Terms of Service and Privacy Policy
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Fade>
        </Box>
      </Box>
    </Container>
  )
}
