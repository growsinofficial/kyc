import { 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  Stack, 
  Typography, 
  Box, 
  Paper, 
  Fade, 
  Chip, 
  Divider, 
  useTheme, 
  useMediaQuery,
  Alert 
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PersonIcon from '@mui/icons-material/Person'
import HomeIcon from '@mui/icons-material/Home'
import WorkIcon from '@mui/icons-material/Work'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'

export default function KycReview({ state, persist, goRisk }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const kyc = state.userData.kyc || {}
  
  const back = () => persist(s => ({ ...s, kycSubStep: 3 }))
  const confirm = () => { 
    persist(s => ({ ...s, kycSubStepStatus: { ...s.kycSubStepStatus, 4: true } })); 
    goRisk() 
  }

  // Group fields by category for better organization
  const fieldGroups = {
    personal: {
      title: "Personal Information",
      icon: <PersonIcon />,
      fields: [
        { key: 'name', label: 'Full Name' },
        { key: 'fatherName', label: "Father's Name" },
        { key: 'dob', label: 'Date of Birth' },
        { key: 'pan', label: 'PAN Number' },
        { key: 'aadhar', label: 'Aadhaar Number' },
        { key: 'gender', label: 'Gender' },
        { key: 'maritalStatus', label: 'Marital Status' }
      ]
    },
    address: {
      title: "Address Details",
      icon: <HomeIcon />,
      fields: [
        { key: 'address', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'pincode', label: 'PIN Code' },
        { key: 'state', label: 'State' },
        { key: 'country', label: 'Country' },
        { key: 'mobile', label: 'Mobile Number' },
        { key: 'email', label: 'Email Address' }
      ]
    },
    professional: {
      title: "Professional Information",
      icon: <WorkIcon />,
      fields: [
        { key: 'occupationType', label: 'Occupation Type' },
        { key: 'occupation', label: 'Occupation' },
        { key: 'otherOccupation', label: 'Other Occupation' }
      ]
    }
  }

  // Format values for display
  const formatValue = (key, value) => {
    if (!value) return '-'
    
    switch (key) {
      case 'dob':
        return new Date(value).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      case 'gender':
        return value.charAt(0).toUpperCase() + value.slice(1)
      case 'maritalStatus':
        return value.charAt(0).toUpperCase() + value.slice(1)
      case 'occupationType':
        return value.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      default:
        return String(value)
    }
  }

  const getCompletionStatus = () => {
    const totalFields = Object.values(fieldGroups).reduce((acc, group) => acc + group.fields.length, 0)
    const completedFields = Object.values(fieldGroups).reduce((acc, group) => {
      return acc + group.fields.filter(field => kyc[field.key]).length
    }, 0)
    return { completed: completedFields, total: totalFields }
  }

  const _completion = getCompletionStatus()

  return (
    <Fade in timeout={600}>
      <Box>
        {/* Header Section */}
        {/* <Paper elevation={0} sx={{ 
          p: 2, 
          mb: 2, 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
          borderRadius: 1.1,
          textAlign: 'center'
        }}>
          <Stack spacing={2} alignItems="center">
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
              <VerifiedUserIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary">
              Review Your Information
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={600}>
              Please review all the information you've provided. Make sure everything is accurate before proceeding to the next step.
            </Typography> */}
            
            {/* Completion Status */}
            {/* <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <Chip 
                icon={<CheckCircleIcon />}
                label={`${completion.completed}/${completion.total} Fields Completed`}
                color="success"
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round((completion.completed / completion.total) * 100)}% Complete
              </Typography>
            </Stack>
          </Stack>
        </Paper> */}

        {/* Review Cards */}
        <Stack spacing={1}>
          {Object.entries(fieldGroups).map(([groupKey, group]) => (
            <Card 
              key={groupKey}
              sx={{ 
                borderRadius: 1.1, 
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0)',
                borderColor: 'grey.100'
              }}
            >
              <CardContent sx={{ p: 1 }}>
                <Stack spacing={2}>
                  {/* Section Header */}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {group.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {group.title}
                    </Typography>
                  </Stack>

                  <Divider />

                  {/* Fields Grid - Updated for MUI Grid v2 */}
                  <Grid container spacing={0}>
                    {group.fields.map((field) => {
                      const value = kyc[field.key]
                      const isCompleted = !!value
                      
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={field.key}>
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                fontWeight={500}
                                sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                              >
                                {field.label}
                              </Typography>
                              {isCompleted && (
                                <CheckCircleIcon 
                                  sx={{ 
                                    fontSize: 16, 
                                    color: 'success.main' 
                                  }} 
                                />
                              )}
                            </Stack>
                            <Typography 
                              variant="body1" 
                              fontWeight={600}
                              sx={{ 
                                minHeight: '24px',
                                color: isCompleted ? 'text.primary' : 'text.disabled',
                              }}
                            >
                              {formatValue(field.key, value)}
                            </Typography>
                          </Stack>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Action Buttons */}
        <Paper 
          elevation={0}
          sx={{ 
            mt: 1, 
            p: 3, 
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: 1.1
          }}
        >
          <Stack 
            direction={isMobile ? 'column' : 'row'} 
            spacing={2} 
            justifyContent="space-between" 
            alignItems={isMobile ? 'stretch' : 'center'}
          >
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Ready to proceed?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confirm that all information is correct to continue
              </Typography>
            </Stack>
            
            <Stack 
              direction={isMobile ? 'column' : 'row'} 
              spacing={2} 
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              <Button 
                startIcon={<ArrowBackIcon />} 
                variant="outlined" 
                onClick={back}
                fullWidth={isMobile}
                sx={{
                  height: 48,
                  borderRadius: 1.1,
                  minWidth: 140,
                  fontWeight: 600,
                  borderColor: 'grey.300',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50'
                  }
                }}
              >
                Back to Edit
              </Button>
              <Button 
                variant="contained"
                onClick={confirm}
                endIcon={<ArrowForwardIcon />}
                fullWidth={isMobile}
                sx={{
                  height: 48,
                  borderRadius: 1.1,
                  minWidth: 200,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Confirm & Proceed
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Final Confirmation Alert */}
        <Fade in timeout={1000}>
          <Alert 
            severity="info"
            variant="outlined"
            sx={{
              mt: 3,
              borderRadius: 1.1,
              border: '1px solid',
              borderColor: 'info.light',
              backgroundColor: 'info.50'
            }}
            icon={<VerifiedUserIcon />}
          >
            <Typography variant="body2" fontWeight={500}>
              Your KYC information will be submitted for verification. You can track the status in your dashboard.
            </Typography>
          </Alert>
        </Fade>
      </Box>
    </Fade>
  )
}