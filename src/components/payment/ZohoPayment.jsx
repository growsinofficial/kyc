import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert,
  Grid,
  Divider,
  Chip
} from '@mui/material';
import { 
  CreditCard, 
  Security, 
  CheckCircle, 
  Error as ErrorIcon 
} from '@mui/icons-material';
import api from '../../services/api';

// Zoho Checkout Widget Integration
const ZohoCheckout = ({ sessionId, onSuccess, onFailure, onCancel }) => {
  useEffect(() => {
    if (!sessionId) return;

    // Load Zoho Checkout script
    const script = document.createElement('script');
    script.src = 'https://js.zoho.com/checkout/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize Zoho Checkout widget
      window.ZohoCheckout.init({
        sessionId: sessionId,
        // API key will be handled by the backend session
        theme: 'light',
        config: {
          show_header: true,
          show_footer: true,
          auto_resize: true,
          width: '100%',
          height: 'auto'
        },
        events: {
          onSuccess: (data) => {
            console.log('Payment Success:', data);
            onSuccess && onSuccess(data);
          },
          onFailure: (error) => {
            console.log('Payment Failed:', error);
            onFailure && onFailure(error);
          },
          onCancel: () => {
            console.log('Payment Cancelled');
            onCancel && onCancel();
          }
        }
      });

      // Render the checkout widget
      window.ZohoCheckout.render('zoho-checkout-container');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [sessionId, onSuccess, onFailure, onCancel]);

  return (
    <Box 
      id="zoho-checkout-container" 
      sx={{ 
        width: '100%', 
        minHeight: '400px',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        backgroundColor: '#f9f9f9'
      }} 
    />
  );
};

const ZohoPayment = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('plan'); // plan, checkout, processing, success, failed

  // Fetch plan details
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await api.get(`/plans/${planId}`);
        setPlan(response.data.data);
      } catch (error) {
        setError('Failed to load plan details');
        console.error('Error fetching plan:', error);
      }
    };

    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  // Create checkout session
  const handlePayNow = async () => {
    if (!plan) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/payments/initiate', {
        planId: plan._id,
        amount: plan.price,
        redirectUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      });

      if (response.data.success) {
        setSessionId(response.data.data.sessionId || response.data.sessionId);
        setStep('checkout');
      } else {
        throw new Error(response.data.message || 'Failed to create payment session');
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    setStep('processing');
    
    try {
      // Verify payment with backend
      const response = await api.post('/payments/verify', {
        paymentId: paymentData.payment_id,
        signature: paymentData.signature,
        sessionId: sessionId
      });

      if (response.data.success) {
        setStep('success');
        // Redirect to success page after a delay
        setTimeout(() => {
          navigate('/payment/success');
        }, 3000);
      } else {
        throw new Error(response.data.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError(error.response?.data?.message || 'Payment verification failed');
      setStep('failed');
    }
  };

  // Handle payment failure
  const handlePaymentFailure = (errorData) => {
    setError(errorData.message || 'Payment failed. Please try again.');
    setStep('failed');
  };

  // Handle payment cancellation
  const handlePaymentCancel = () => {
    setStep('plan');
    setSessionId(null);
  };

  // Render plan details step
  const renderPlanDetails = () => (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <CreditCard sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Complete Your Payment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Secure payment powered by Zoho
          </Typography>
        </Box>

        {plan && (
          <>
            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {plan.description}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {plan.duration} {plan.durationType}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  ₹{plan.price.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Security sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Your payment is secured with 256-bit SSL encryption
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handlePayNow}
              disabled={loading}
              sx={{ py: 1.5, fontSize: '1.1rem' }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating Payment Session...
                </>
              ) : (
                `Pay ₹${plan.price.toLocaleString()}`
              )}
            </Button>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Render checkout widget step
  const renderCheckout = () => (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Complete Payment
          </Typography>
          <Chip 
            label={`₹${plan?.price.toLocaleString()} - ${plan?.name}`} 
            color="primary" 
            sx={{ mb: 2 }} 
          />
        </Box>

        <ZohoCheckout
          sessionId={sessionId}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onCancel={handlePaymentCancel}
        />

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={handlePaymentCancel}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Powered by Zoho Payments
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  // Render processing step
  const renderProcessing = () => (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Processing Payment...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we verify your payment
        </Typography>
      </CardContent>
    </Card>
  );

  // Render success step
  const renderSuccess = () => (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Payment Successful!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your payment has been processed successfully. Redirecting...
        </Typography>
        <CircularProgress size={20} />
      </CardContent>
    </Card>
  );

  // Render failure step
  const renderFailure = () => (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 3 }} />
        <Typography variant="h5" gutterBottom>
          Payment Failed
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {error || 'Something went wrong with your payment'}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => {
            setStep('plan');
            setError('');
            setSessionId(null);
          }}
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ py: 4, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {step === 'plan' && renderPlanDetails()}
      {step === 'checkout' && renderCheckout()}
      {step === 'processing' && renderProcessing()}
      {step === 'success' && renderSuccess()}
      {step === 'failed' && renderFailure()}
    </Box>
  );
};

export default ZohoPayment;