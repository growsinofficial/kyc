import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Stack,
  Alert
} from '@mui/material'
import CancelIcon from '@mui/icons-material/Cancel'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import HomeIcon from '@mui/icons-material/Home'

export default function PaymentCancel() {
  const navigate = useNavigate()

  useEffect(() => {
    // Log the payment cancellation
    console.log('Payment was cancelled by user')
  }, [])

  const handleGoHome = () => {
    navigate('/')
  }

  const handleRetryPayment = () => {
    navigate('/payment')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 6 }}>
        <Stack spacing={4} alignItems="center">
          {/* Cancellation Icon and Message */}
          <Box textAlign="center">
            <CancelIcon 
              sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} 
            />
            <Typography variant="h3" color="warning.main" fontWeight="bold" gutterBottom>
              Payment Cancelled
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Your payment was cancelled. No charges have been made to your account.
            </Typography>
          </Box>

          {/* Information Alert */}
          <Alert severity="info" sx={{ width: '100%' }}>
            <Typography variant="body2">
              You can retry the payment anytime or contact our support team if you need assistance.
            </Typography>
          </Alert>

          {/* Action Buttons */}
          <Stack spacing={2} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={handleRetryPayment}
              fullWidth
              size="large"
            >
              Retry Payment
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              fullWidth
              size="large"
            >
              Go to Dashboard
            </Button>
          </Stack>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary" textAlign="center">
            If you're experiencing technical difficulties, please try again or contact our support team.
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}