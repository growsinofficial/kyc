import {
  Avatar,
  Box,
  Button,
  Stack,
  Typography,
  Chip,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'

export default function ActiveHeader({ state, onLogout }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const _isTablet = useMediaQuery('(max-width: 1024px)')

  // Time-based greeting
  const getWelcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Progress text based on step
  const getProgressStatus = () => {
    const steps = {
      auth: 'Getting started',
      kyc: 'Completing KYC',
      risk: 'Risk assessment',
      assessment: 'Suitability review',
      docs: 'Document upload',
      plan: 'Plan selection',
      sign: 'Agreement signing',
      payment: 'Payment processing'
    }
    return steps[state.currentStep] || 'Onboarding in progress'
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3 },
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <Stack
        direction={isMobile ? 'column' : 'row'}
        alignItems={isMobile ? 'flex-start' : 'center'}
        justifyContent="space-between"
        spacing={isMobile ? 3 : 4}
      >
        {/* === Profile Section === */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={2.5}
          sx={{
            width: isMobile ? '100%' : 'auto',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Avatar */}
          <Avatar
            sx={{
              width: { xs: 60, sm: 70, md: 80 },
              height: { xs: 60, sm: 70, md: 80 },
              border: `3px solid ${theme.palette.primary.main}`,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
              backgroundColor: theme.palette.primary.main,
              flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ fontSize: { xs: 28, sm: 32, md: 38 }, color: 'white' }} />
          </Avatar>

          {/* User Info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mb: 0.8 }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                sx={{
                  fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
                  lineHeight: 1.3,
                }}
              >
                {getWelcomeMessage()},{' '}
                {state.userData?.name?.split(' ')[0] || 'Guest'}!
              </Typography>

              {state.userData?.kyc?.gender && (
                <Chip
                  label={
                    state.userData.kyc.gender === 'female' ? '♀ Female' : '♂ Male'
                  }
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    ml: 0.5,
                  }}
                />
              )}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                fontSize: { xs: '0.9rem', sm: '1rem' },
              }}
            >
              {getProgressStatus()}
            </Typography>

            {/* Status Chips */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              rowGap={1}
            >
              <Chip
                icon={<PersonIcon sx={{ fontSize: 16 }} />}
                label="KYC Verified"
                color="success"
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  height: 28,
                  backgroundColor: theme.palette.success.main,
                  color: 'white',
                }}
              />
              {state.userData?.riskProfile && (
                <Chip
                  label={`${state.userData.riskProfile} Risk`}
                  color={
                    state.userData.riskProfile === 'Conservative'
                      ? 'success'
                      : state.userData.riskProfile === 'Moderate'
                      ? 'warning'
                      : 'error'
                  }
                  variant="outlined"
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    height: 28,
                    borderWidth: 1.2,
                  }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {/* === Logout Button === */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            alignItems: 'center',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          <Button
            startIcon={<LogoutIcon />}
            color="error"
            variant="outlined"
            onClick={onLogout}
            sx={{
              borderRadius: 1.2,
              fontWeight: 600,
              borderColor: 'error.main',
              color: 'error.main',
              minWidth: isMobile ? '100%' : 150,
              py: { xs: 1.2, sm: 1.3 },
              fontSize: { xs: '0.95rem', sm: '1rem' },
              '&:hover': {
                backgroundColor: 'error.50',
                borderColor: 'error.dark',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {isMobile ? 'Sign Out' : 'Log Out'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  )
}
