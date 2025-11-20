import React, { useEffect } from 'react';
import { Box, Typography, Card, CardContent, Alert, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get('message');

  useEffect(() => {
    // Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
          <CheckCircleIcon 
            sx={{ 
              fontSize: 64, 
              color: 'success.main', 
              mb: 2 
            }} 
          />
          
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Success!
          </Typography>
          
          {message === 'gmail_connected' && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Gmail has been successfully connected for email notifications.
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You will be redirected automatically in a few seconds.
          </Typography>
          
          <Button 
            variant="contained" 
            onClick={() => navigate('/')}
            fullWidth
          >
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}