import { useState, useEffect, useMemo } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  Container, 
  Grid, 
  Stack, 
  Typography, 
  Box, 
  Paper, 
  Fade,
  Alert,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material'
import ActiveHeader from '../layout/ActiveHeader'
import StepRail from '../layout/StepRail'
import DocCard from './DocCard'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChecklistIcon from '@mui/icons-material/Checklist'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import VerifiedIcon from '@mui/icons-material/Verified'

export default function Docs({ state, persist, onLogout, navigateTo }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const documents = useMemo(() => [
    { id: 'pan', title: 'PAN Card', description: 'Upload clear image of your PAN card' },
    { id: 'aadhaar-front', title: 'Aadhaar Card (Front)', description: 'Front side with photo and details' },
    { id: 'aadhaar-back', title: 'Aadhaar Card (Back)', description: 'Back side with QR code' },
    { id: 'profile', title: 'Profile Photo', description: 'Recent passport size photo' },
  ], [])

  // Calculate upload progress
  useEffect(() => {
    const uploadedCount = documents.filter(doc => state.userData.docsStatus?.[doc.id]).length
    const progress = (uploadedCount / documents.length) * 100
    setUploadProgress(progress)
  }, [state.userData.docsStatus, documents])

  const allUploaded = Object.values(state.userData.docsStatus || {}).every(Boolean)
  const uploadedCount = documents.filter(doc => state.userData.docsStatus?.[doc.id]).length

  const handleNext = () => {
    if (allUploaded) {
      navigateTo('plan')
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ActiveHeader state={state} onLogout={onLogout}/>
      <StepRail activeId="docs"/>

      {/* Header Section */}
      <Paper elevation={0} sx={{ 
        p: 4, 
        mb: 4, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
        borderRadius: 3
      }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ 
              width: 60, 
              height: 60, 
              borderRadius: '50%', 
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <UploadFileIcon sx={{ fontSize: 30 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} color="primary">
                Document Upload
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please upload all required documents for KYC verification
              </Typography>
            </Box>
          </Stack>

          {/* Progress Section */}
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Upload Progress
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {uploadedCount}/{documents.length} Documents
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)'
                }
              }}
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {Math.round(uploadProgress)}% Complete
              </Typography>
              <Chip 
                icon={allUploaded ? <VerifiedIcon /> : <ChecklistIcon />}
                label={allUploaded ? 'All Documents Uploaded' : 'Upload Required'}
                color={allUploaded ? 'success' : 'primary'}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Documents Grid */}
      <Grid container spacing={3}>
        {documents.map((doc, index) => (
          <Grid key={doc.id} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Fade in timeout={600} style={{ transitionDelay: `${index * 100}ms` }}>
              <Box>
                <DocCard {...doc} state={state} persist={persist}/>
              </Box>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* Requirements & Next Section */}
      <Paper 
        elevation={0}
        sx={{ 
          mt: 4, 
          p: 4, 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200'
        }}
      >
        <Stack spacing={3}>
          {/* Requirements Info */}

          {/* Status Alert */}
          {allUploaded ? (
            <Alert 
              severity="success"
              variant="outlined"
              sx={{
                borderRadius: 2,
                border: '1px solid',
                backgroundColor: 'success.50'
              }}
              icon={<VerifiedIcon />}
            >
              <Typography variant="body2" fontWeight={500}>
                All documents have been successfully uploaded and are ready for verification.
              </Typography>
            </Alert>
          ) : (
            <Alert 
              severity="info"
              variant="outlined"
              sx={{
                borderRadius: 2,
                border: '1px solid',
                backgroundColor: 'info.50'
              }}
            >
              <Typography variant="body2" fontWeight={500}>
                {documents.length - uploadedCount} document(s) remaining. Please upload all required documents to continue.
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={2} 
            justifyContent="space-between" 
            alignItems={isMobile ? 'stretch' : 'center'}
          >
            <Box>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Ready to proceed?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All documents must be uploaded before continuing
              </Typography>
            </Box>
            
            <Button 
              variant="contained"
              size="large"
              onClick={handleNext}
              disabled={!allUploaded}
              endIcon={<ArrowForwardIcon />}
              sx={{
                minWidth: 200,
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
              Continue to Plan Selection
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Additional Help Text */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Need help with document upload? Contact support for assistance.
        </Typography>
      </Box>
    </Container>
  )
}