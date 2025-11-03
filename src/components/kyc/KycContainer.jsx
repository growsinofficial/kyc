import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Container,
  Stack,
  Button,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import ActiveHeader from '../layout/ActiveHeader'
import StepRail from '../layout/StepRail'
import KycPersonal from './KycPersonal'
import KycAddress from './KycAddress'
import KycProfessional from './KycProfessional'
import KycReview from './KycReview'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

export default function KycContainer({ state, persist, onLogout, navigateTo }) {
  const theme = useTheme()
  const isDownMd = useMediaQuery(theme.breakpoints.down('md'))
  const { kycSubStep, kycSubStepStatus } = state

  const steps = [
    { id: 1, label: 'Personal', subtitle: 'Basic information' },
    { id: 2, label: 'Address & Contact', subtitle: 'Location details' },
    { id: 3, label: 'Professional', subtitle: 'Employment info' },
    { id: 4, label: 'Review', subtitle: 'Final verification' },
  ]

  const headerTitle =
    {
      1: 'Personal Details',
      2: 'Address & Contact',
      3: 'Professional Details',
      4: 'Review & Submit',
    }[kycSubStep] || 'KYC Details'

  const canOpen = (id) => id === 1 || !!kycSubStepStatus[id - 1]
  const open = (id) => canOpen(id) && persist((s) => ({ ...s, kycSubStep: id }))

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <ActiveHeader state={state} onLogout={onLogout} />
      <StepRail activeId="kyc" />

      {/* --- Two-column layout using CSS Grid (prevents wrapping) --- */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, 
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
          mt: 1,
        }}
      >
        {/* LEFT: pill-style sidebar */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 1.2,
            p: 1.9,
            position: { xs: 'static', md: 'sticky' },
            top: { md: 24 },
          }}
        >
          <Stack spacing={1}>
            {steps.map((s) => {
              const active = kycSubStep === s.id
              const done = !!kycSubStepStatus[s.id]
              const unlocked = canOpen(s.id)
              return (
                <Button
                  key={s.id}
                  onClick={() => open(s.id)}
                  disabled={!unlocked}
                  fullWidth
                  disableElevation
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderRadius: 1,
                    px: 1.25,
                    py: 1,
                    gap: 1.25,
                    alignItems: 'stretch',
                    border: '1.5px solid',
                    borderColor: active ? 'transparent' : '#175ee2',
                    background: active
                      ? 'linear-gradient(90deg, #175ee2 0%, #2a6de8ff 100%)'
                      : 'transparent',
                    color: active ? '#fff' : '#175ee2',
                    boxShadow: active ? '0 10px 18px rgba(23,94,226,.22)' : 'none',
                    opacity: unlocked ? 1 : 0.55,
                    transition: 'all .22s ease',
                    '&:hover': {
                      background: active
                        ? 'linear-gradient(90deg, #154dd1 0%, #2a6de898 100%)'
                        : 'rgba(23,94,226,.06)',
                      transform: unlocked ? 'translateX(1px)' : 'none',
                    },
                  }}
                >
                  {/* dot */}
                  <Box sx={{ display: 'flex', alignItems: 'center', py: 0.25 }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: active
                          ? 'rgba(255,255,255,.22)'
                          : 'rgba(23,94,226,.08)',
                        color: active ? '#fff' : done ? 'success.main' : '#175ee2',
                        border: active
                          ? '1px solid rgba(255,255,255,.35)'
                          : '1px solid rgba(23,94,226,.28)',
                      }}
                    >
                      {done ? (
                        <CheckCircleIcon fontSize="small" />
                      ) : (
                        <RadioButtonUncheckedIcon fontSize="small" />
                      )}
                    </Box>
                  </Box>

                  {/* labels */}
                  <Box sx={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }} noWrap>
                      {s.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.85, display: 'block' }}
                      noWrap
                    >
                      {s.subtitle}
                    </Typography>
                  </Box>
                </Button>
              )
            })}
          </Stack>
        </Card>

        {/* RIGHT: main card */}
        <Box sx={{ minWidth: 0 }}>
          <Card
            sx={{
              borderRadius: 1,
              boxShadow: '0 8px 28px rgba(0,0,0,.06)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={900}>
                  {headerTitle}
                </Typography>
              }
              sx={{
                px: { xs: 2, md: 3 },
                py: 3,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            />
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              {kycSubStep === 1 && <KycPersonal state={state} persist={persist} />}
              {kycSubStep === 2 && <KycAddress state={state} persist={persist} />}
              {kycSubStep === 3 && <KycProfessional state={state} persist={persist} />}
              {kycSubStep === 4 && (
                <KycReview
                  state={state}
                  persist={persist}
                  goRisk={() => navigateTo('risk')}
                />
              )}
            </CardContent>
          </Card>

          {/* mobile prev/next helpers */}
          {isDownMd && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                disabled={kycSubStep === 1}
                onClick={() =>
                  persist((s) => ({
                    ...s,
                    kycSubStep: Math.max(1, kycSubStep - 1),
                  }))
                }
              >
                Previous
              </Button>
              <Button
                variant="contained"
                fullWidth
                disabled={kycSubStep === 4 || !kycSubStepStatus[kycSubStep]}
                onClick={() =>
                  persist((s) => ({
                    ...s,
                    kycSubStep: Math.min(4, kycSubStep + 1),
                  }))
                }
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  )
}
