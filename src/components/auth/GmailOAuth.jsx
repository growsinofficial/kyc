import React from 'react';
import { Button, Box, Typography, Card, CardContent, Alert } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';

export default function GmailOAuth() {
  const initiateGmailOAuth = () => {
    // Redirect to backend OAuth initiation endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/oauth/gmail`;
  };

  return (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Connect Gmail
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your Gmail account to enable email notifications for OTP and other important updates.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="caption">
            This will redirect you to Google's secure OAuth page to authorize Gmail access for sending emails.
          </Typography>
        </Alert>
        
        <Button 
          variant="contained" 
          onClick={initiateGmailOAuth}
          startIcon={<EmailIcon />}
          fullWidth
          sx={{
            background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #3367d6 0%, #2d9048 100%)',
            }
          }}
        >
          Connect Gmail
        </Button>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          You can disconnect at any time from your account settings
        </Typography>
      </CardContent>
    </Card>
  );
}