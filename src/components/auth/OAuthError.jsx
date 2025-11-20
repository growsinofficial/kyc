import React from 'react';
import { Box, Typography, Card, CardContent, Alert, Button } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function OAuthError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'no_code_received':
        return 'No authorization code received from Google.';
      case 'token_exchange_failed':
        return 'Failed to exchange authorization code for tokens.';
      case 'callback_failed':
        return 'OAuth callback processing failed.';
      default:
        return error || 'An unknown error occurred during OAuth process.';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <ErrorIcon 
            sx={{ 
              fontSize: 64, 
              color: 'error.main', 
              mb: 2 
            }} 
          />
          
          <Typography variant="h5" gutterBottom fontWeight={600}>
            OAuth Error
          </Typography>
          
          <Alert severity="error" sx={{ mb: 3 }}>
            {getErrorMessage(error)}
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please try again or contact support if the problem persists.
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            fullWidth
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}