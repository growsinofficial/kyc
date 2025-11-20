import React from 'react'
import { Box, Stack, Typography, useTheme, useMediaQuery, Chip, alpha } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import { riskQuestions } from '../../constants/riskQuestions'

export default function StepRail({ activeId, state }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  
  const s = state ?? {}
  const userData = s.userData ?? {}
  const flags = s.flags ?? {}
  const kycSubStepStatus = s.kycSubStepStatus ?? {}

  const isKycDone = Object.values(kycSubStepStatus).every(Boolean)

  const answeredCount = Object.entries(userData.riskAnswers ?? {}).reduce((acc, [qid, val]) => {
    const q = riskQuestions.find((x) => x.id === qid)
    if (!q) return acc
    if (q.type === 'checkbox') return acc + (Array.isArray(val) && val.length ? 1 : 0)
    return acc + (val !== undefined && val !== null && val !== '' ? 1 : 0)
  }, 0)
  const isRiskDone = answeredCount === riskQuestions.length

  const isAssessmentDone = !!flags.assessmentAck
  const isDocsDone = userData.docsStatus ? Object.values(userData.docsStatus).every(Boolean) : false
  const isPlanDone = !!userData.selectedPlan?.title
  const isSignDone = !!flags.agreementSigned
  const isPaymentDone = !!flags.paymentDone

  const steps = [
    { id: 'kyc',        label: 'KYC Details',    icon: <DescriptionRoundedIcon/>,         done: isKycDone },
    { id: 'risk',       label: 'Risk Profiling', icon: <AssignmentTurnedInRoundedIcon/>,  done: isRiskDone },
    { id: 'assessment', label: 'Suitability',    icon: <TaskAltRoundedIcon/>,             done: isAssessmentDone },
    { id: 'docs',       label: 'Upload Docs',    icon: <UploadFileRoundedIcon/>,          done: isDocsDone },
    { id: 'plan',       label: 'Select Plan',    icon: <RequestQuoteRoundedIcon/>,        done: isPlanDone },
    { id: 'sign',       label: 'Agreement',      icon: <ReceiptLongRoundedIcon/>,         done: isSignDone },
    { id: 'payment',    label: 'Payment',        icon: <CreditCardRoundedIcon/>,          done: isPaymentDone },
  ]

  const activeIndex = Math.max(0, steps.findIndex((st) => st.id === activeId))
  const progressPercentage = ((activeIndex + 1) / steps.length) * 100

  if (isMobile) {
    return (
      <Box sx={{ mb: 3 }}>
        {/* Mobile Progress Bar */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Progress
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {activeIndex + 1}/{steps.length} Steps
            </Typography>
          </Stack>
          <Box sx={{
            width: '100%',
            height: 6,
            backgroundColor: 'grey.200',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <Box sx={{
              width: `${progressPercentage}%`,
              height: '100%',
              background: (activeIndex === steps.length - 1 && isPaymentDone) 
                ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
                : 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)',
              borderRadius: 3,
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Stack>

        <Box sx={{ textAlign: 'center' }}>
          <Chip 
            label={`Step ${activeIndex + 1}: ${steps[activeIndex]?.label}`}
            color={steps[activeIndex]?.done ? "success" : "primary"}
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Desktop Progress Bar */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Onboarding Progress
          </Typography>
          <Typography 
            variant="body2" 
            fontWeight={700} 
            color={activeIndex === steps.length - 1 && isPaymentDone ? "success.main" : "primary.main"}
          >
            {Math.round(progressPercentage)}% Complete
          </Typography>
        </Stack>
        <Box sx={{
          width: '100%',
          height: 8,
          backgroundColor: 'grey.200',
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <Box sx={{
            width: `${progressPercentage}%`,
            height: '100%',
            background: (activeIndex === steps.length - 1 && isPaymentDone)
              ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
              : 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)',
            borderRadius: 4,
            transition: 'width 0.3s ease'
          }} />
        </Box>
      </Stack>

      {/* Steps Rail */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={isTablet ? 1 : 2}
        sx={{
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-track': { background: 'grey.100', borderRadius: 3 },
          '&::-webkit-scrollbar-thumb': { background: 'grey.400', borderRadius: 3 }
        }}
      >
        {steps.map((step, idx) => {
          const isActive = step.id === activeId
          const isCompleted = !!step.done
          const isPastStep = idx < activeIndex
          const _isFutureStep = idx > activeIndex

          const bulletSize = isTablet ? 36 : 44
          const iconSize = Math.round(bulletSize * 0.58)

          const bulletBg = isCompleted
            ? '#2e7d32' 
            : isActive
            ? theme.palette.primary.main
            : theme.palette.grey[300]

          const textColor = isCompleted
            ? 'success.main'
            : isActive
            ? 'primary.main'
            : isPastStep
            ? 'text.primary'
            : 'text.secondary'

          const connectorColor = isCompleted || idx < activeIndex
            ? '#2e7d32' 
            : theme.palette.grey[300]

          const bulletGlow = isCompleted
            ? `0 0 0 5px ${alpha('#2e7d32', 0.25)}`
            : isActive
            ? `0 0 0 5px ${alpha(theme.palette.primary.main, 0.25)}`
            : 'none'

          return (
            <React.Fragment key={step.id}>
              <Stack
                alignItems="center"
                sx={{
                  minWidth: isTablet ? 84 : 104,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {/* Step Bullet */}
                <Box
                  sx={{
                    width: bulletSize,
                    height: bulletSize,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: bulletBg,
                    color: '#fff',
                    boxShadow: bulletGlow,
                    transition: 'all 0.25s ease',
                    '& svg': {
                      width: iconSize,
                      height: iconSize,
                    },
                  }}
                >
                  {isCompleted ? (
                    <CheckRoundedIcon />
                  ) : (
                    React.cloneElement(step.icon, {
                      sx: { 
                        color: isActive ? '#fff' : 
                              isPastStep ? 'grey.600' : 'grey.500'
                      },
                    })
                  )}
                </Box>

                {/* Step Label */}
                <Typography
                  variant={isTablet ? 'caption' : 'body2'}
                  sx={{
                    mt: 2,
                    fontWeight: isActive || isCompleted ? 700 : 600,
                    color: textColor,
                    fontSize: isTablet ? '0.75rem' : '0.875rem',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {step.label}
                </Typography>
              </Stack>

              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <Box
                  sx={{
                    flex: isTablet ? 0 : 1,
                    minWidth: isTablet ? 20 : 40,
                    height: 3,
                    bgcolor: connectorColor,
                    borderRadius: 2,
                    transition: 'all 0.25s ease',
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </Stack>

      {/* Current Step Indicator */}
      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <Chip
          label={`Current: ${steps[activeIndex]?.label}`}
          color={steps[activeIndex]?.done ? "success" : "primary"}
          variant="outlined"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Box>
    </Box>
  )
}