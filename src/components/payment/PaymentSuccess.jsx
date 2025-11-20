import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HomeIcon from '@mui/icons-material/Home'
import ReceiptIcon from '@mui/icons-material/Receipt'
import apiService from '../../services/api.js'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [transactionDetails, setTransactionDetails] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const paymentId = searchParams.get('payment_id')
        const transactionId = searchParams.get('transaction_id')
        const signature = searchParams.get('signature')

        if (!paymentId || !transactionId) {
          setError('Invalid payment parameters')
          setPaymentStatus('failed')
          setVerifying(false)
          return
        }

        // Verify payment with backend
        const response = await apiService.verifyPayment(paymentId, signature, transactionId)
        
        setPaymentStatus('success')
        setTransactionDetails(response.data)
        
      } catch (error) {
        console.error('Payment verification failed:', error)
        setError(error.message || 'Payment verification failed')
        setPaymentStatus('failed')
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [searchParams])

  const handleGoHome = () => {
    navigate('/')
  }

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download
    alert('Receipt download functionality will be implemented')
  }

  if (verifying) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Verifying Payment...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we confirm your payment.
          </Typography>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={4} alignItems="center">
          {/* Status Icon and Message */}
          <Box textAlign="center">
            {paymentStatus === 'success' ? (
              <>
                <CheckCircleIcon 
                  sx={{ fontSize: 80, color: 'success.main', mb: 2 }} 
                />
                <Typography variant="h3" color="success.main" fontWeight="bold" gutterBottom>
                  Payment Successful!
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Thank you for your purchase. Your payment has been processed successfully.
                </Typography>
              </>
            ) : (
              <>
                <ErrorIcon 
                  sx={{ fontSize: 80, color: 'error.main', mb: 2 }} 
                />
                <Typography variant="h3" color="error.main" fontWeight="bold" gutterBottom>
                  Payment Failed
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Unfortunately, your payment could not be processed.
                </Typography>
              </>
            )}
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {/* Transaction Details */}
          {paymentStatus === 'success' && transactionDetails && (
            <Card sx={{ width: '100%', maxWidth: 500 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ReceiptIcon />
                  Transaction Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Transaction ID:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {transactionDetails.transactionId}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Status:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="success.main">
                      {transactionDetails.status?.toUpperCase()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Date:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {new Date().toLocaleDateString()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              fullWidth
              size="large"
            >
              Go to Dashboard
            </Button>
            
            {paymentStatus === 'success' && (
              <Button
                variant="outlined"
                startIcon={<ReceiptIcon />}
                onClick={handleDownloadReceipt}
                fullWidth
                size="large"
              >
                Download Receipt
              </Button>
            )}
          </Stack>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {paymentStatus === 'success' 
              ? 'You will receive a confirmation email shortly with your purchase details.'
              : 'If you continue to experience issues, please contact our support team.'
            }
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}