import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Typography,
  Checkbox,
  Box,
  Paper,
  Fade,
  Chip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Divider
} from '@mui/material'

// SVG Icons as React components to avoid import blocking
const PsychologyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16h2v2h-2zm1-16c-4.41 0-8 3.59-8 8h2c0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.28-1.27 4.28-3.15 5.31l-.85.5V14h-2v3.81l-.85-.5C8.27 16.28 7 14.28 7 12H5c0 4.41 3.59 8 8 8s8-3.59 8-8-3.59-8-8-8z"/>
  </svg>
)

const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
  </svg>
)

const SecurityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
)

/* === NEW: circular checkbox icons (keeps UI but makes checkboxes circular) === */
const CircleUncheckedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

const CircleCheckedIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="currentColor"/>
    <path d="M9.3 12.6l1.9 1.9 3.6-3.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Mock risk questions
const riskQuestions = [
  { id: 1, text: "What is your primary investment objective?", type: 'radio',
    options: [
      "Capital preservation with minimal risk",
      "Balanced growth with moderate risk",
      "High growth with willingness to accept higher risk",
      "Maximum returns regardless of risk"
    ]},
  { id: 2, text: "How would you react if your portfolio lost 20% in a short period?", type: 'radio',
    options: [
      "Sell all investments immediately",
      "Sell some investments to reduce risk",
      "Hold and wait for recovery",
      "Invest more to average down"
    ]},
  { id: 3, text: "What is your investment time horizon?", type: 'select',
    options: [
      { text: "Less than 1 year", horizon: "Short term" },
      { text: "1-3 years", horizon: "Medium term" },
      { text: "3-7 years", horizon: "Long term" },
      { text: "More than 7 years", horizon: "Very long term" }
    ]},
  { id: 4, text: "Which investment types are you comfortable with?", type: 'checkbox',
    options: [
      "Fixed deposits and bonds",
      "Blue-chip stocks",
      "Mutual funds",
      "Real estate",
      "Cryptocurrency",
      "Startup investments"
    ]},
  { id: 5, text: "How familiar are you with investment concepts?", type: 'radio',
    options: [
      "Not familiar - I'm new to investing",
      "Somewhat familiar - I understand basic concepts",
      "Very familiar - I have investment experience",
      "Expert - I actively manage my investments"
    ]}
]

export default function Risk({ state, persist, onLogout, navigateTo }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [answers, setAnswers] = useState(state.userData.riskAnswers || {})
  const [loading, setLoading] = useState(false)

  const calcScore = (a) => {
    let s = 0
    let answered = 0
    riskQuestions.forEach((q) => {
      if (q.type === 'checkbox') {
        if ((a[q.id] || []).length) answered++
      } else if (a[q.id] !== undefined && a[q.id] !== null && a[q.id] !== '') {
        s += Number(a[q.id]) + 1
        answered++
      }
    })
    return { score: s, answered }
  }

  const { score, answered } = calcScore(answers)
  const totalQuestions = riskQuestions.length
  const progress = (answered / totalQuestions) * 100

  const getRiskProfile = (score) => {
    if (score < 6) return { label: 'Conservative', color: 'success.main', description: 'Prefers capital preservation with minimal risk', icon: <SecurityIcon /> }
    if (score < 11) return { label: 'Moderate', color: 'warning.main', description: 'Balanced approach with moderate risk tolerance', icon: <AnalyticsIcon /> }
    return { label: 'Aggressive', color: 'error.main', description: 'Seeks high returns with willingness to accept higher risk', icon: <TrendingUpIcon /> }
  }

  const profile = getRiskProfile(score)

  const setA = (id, val) => {
    const next = { ...answers, [id]: val }
    setAnswers(next)
    const { score: nextScore } = calcScore(next)
    const nextProfile = getRiskProfile(nextScore)
    persist((s) => ({
      ...s,
      userData: {
        ...s.userData,
        riskAnswers: next,
        riskScore: nextScore,
        riskProfile: nextProfile.label,
      },
    }))
  }

  const allAnswered = answered === totalQuestions

  const handleProceed = async () => {
    if (!allAnswered) return
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    navigateTo('assessment')
    setLoading(false)
  }

  const getProfileGradient = () => {
    switch (profile.label) {
      case 'Conservative': return 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
      case 'Moderate':     return 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)'
      case 'Aggressive':   return 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)'
      default:             return 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)'
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Progress Header */}
      <Paper elevation={0} sx={{
        p: 3, mb: 3,
        background: 'linear-gradient(135deg, #d9e1eb8e 0%, #e3e8f0 100%)',
        borderRadius: 1.1
      }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{
              width: 50, height: 50, borderRadius: '50%',
              backgroundColor: 'primary.main', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <PsychologyIcon />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} color="primary">Risk Assessment</Typography>
              <Typography variant="body1" color="text.secondary">
                Help us understand your investment preferences and risk tolerance
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Assessment Progress</Typography>
              <Typography variant="caption" fontWeight={600}>
                {answered}/{totalQuestions} Questions • {Math.round(progress)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8, borderRadius: 4, backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)'
                }
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {/* Questions Section */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            {riskQuestions.map((q, index) => (
              <Fade in key={q.id} timeout={600} style={{ transitionDelay: `${index * 100}ms` }}>
                <Card sx={{
                  borderRadius: 1.1,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0)',
                  border: '1px solid', borderColor: 'grey.100',
                  transition: 'all 0.3s ease',
                  '&:hover': { boxShadow: '0 12px 48px rgba(0,0,0,0.12)' }
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                      {/* Question Header */}
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Box sx={{
                          width: 32, height: 32, borderRadius: '50%',
                          backgroundColor: 'primary.main', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0
                        }}>
                          {index + 1}
                        </Box>
                        <Typography variant="h6" fontWeight={600} color="text.primary">
                          {q.text}
                        </Typography>
                      </Stack>

                      {/* Answer Options */}
                      {q.type === 'radio' && (
                        <RadioGroup
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setA(q.id, Number(e.target.value))}
                        >
                          <Grid container spacing={2}>
                            {q.options.map((opt, idx) => (
                              <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                                <FormControlLabel
                                  value={idx}
                                  control={<Radio />}
                                  label={<Typography variant="body2" fontWeight={500}>{opt}</Typography>}
                                  sx={{
                                    m: 0, p: 1.2,
                                    border: '2px solid',
                                    borderColor: answers[q.id] === idx ? 'primary.main' : 'grey.200',
                                    borderRadius: 1.1,
                                    backgroundColor: answers[q.id] === idx ? 'primary.50' : 'transparent',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { borderColor: 'primary.light', backgroundColor: 'primary.50' }
                                  }}
                                />
                              </Grid>
                            ))}
                          </Grid>
                        </RadioGroup>
                      )}

                      {q.type === 'checkbox' && (
                        <FormGroup>
                          <Grid container spacing={2}>
                            {q.options.map((opt) => {
                              const arr = answers[q.id] || []
                              const checked = arr.includes(opt)
                              return (
                                <Grid size={{ xs: 12, sm: 6 }} key={opt}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = e.target.checked
                                            ? [...arr, opt]
                                            : arr.filter((x) => x !== opt)
                                          setA(q.id, next)
                                        }}
                                        // === circular checkbox icons here ===
                                        icon={<CircleUncheckedIcon />}
                                        checkedIcon={<CircleCheckedIcon />}
                                        disableRipple
                                      />
                                    }
                                    label={<Typography variant="body2" fontWeight={500}>{opt}</Typography>}
                                    sx={{
                                      m: 0, p: 2,
                                      border: '2px solid',
                                      borderColor: checked ? 'primary.main' : 'grey.200',
                                      borderRadius: 1.1,
                                      backgroundColor: checked ? 'primary.50' : 'transparent',
                                      transition: 'all 0.2s ease',
                                      '&:hover': { borderColor: 'primary.light', backgroundColor: 'primary.50' }
                                    }}
                                  />
                                </Grid>
                              )
                            })}
                          </Grid>
                        </FormGroup>
                      )}

                      {q.type === 'select' && (
                        <FormControl fullWidth>
                          <Select
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setA(q.id, Number(e.target.value))}
                            displayEmpty
                            sx={{ borderRadius: 1.1 }}
                          >
                            <MenuItem value="">
                              <em>Select an option</em>
                            </MenuItem>
                            {q.options.map((opt, idx) => (
                              <MenuItem key={idx} value={idx} sx={{ py: 1.5 }}>
                                <Stack>
                                  <Typography variant="body2" fontWeight={500}>
                                    {opt.text || opt}
                                  </Typography>
                                  {opt.horizon && (
                                    <Typography variant="caption" color="text.secondary">
                                      {opt.horizon}
                                    </Typography>
                                  )}
                                </Stack>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Fade>
            ))}
          </Stack>
        </Grid>

        {/* Profile Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Card sx={{ borderRadius: 1.1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: 'none' }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{
                  background: getProfileGradient(), color: 'white', p: 3,
                  borderTopLeftRadius: 12, borderTopRightRadius: 12
                }}>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Box sx={{
                      width: 60, height: 60, borderRadius: '20%',
                      backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      {profile.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={800}>{profile.label}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>{profile.description}</Typography>
                  </Stack>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={600} color="text.secondary">Risk Score</Typography>
                      <Typography variant="h6" fontWeight={700} color={profile.color}>{score}/15</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (score / 15) * 100)}
                      sx={{
                        height: 12, borderRadius: 6, backgroundColor: 'grey.100',
                        '& .MuiLinearProgress-bar': { borderRadius: 6, background: getProfileGradient() }
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Conservative</Typography>
                      <Typography variant="caption" color="text.secondary">Aggressive</Typography>
                    </Stack>
                  </Stack>

                  <Box sx={{
                    mt: 3, p: 2, borderRadius: 1.1, border: '1px solid',
                    borderColor: allAnswered ? 'success.light' : 'info.light',
                    backgroundColor: allAnswered ? 'success.50' : 'info.50'
                  }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {allAnswered && <CheckCircleIcon />}
                      <Typography variant="body2" color={allAnswered ? 'success.dark' : 'info.dark'}>
                        {allAnswered ? 'All questions completed! Ready to proceed.' : `${totalQuestions - answered} questions remaining`}
                      </Typography>
                    </Stack>
                  </Box>

                  <Button
                    fullWidth variant="contained" size="large"
                    onClick={handleProceed} disabled={!allAnswered || loading}
                    sx={{
                      mt: 3, height: 48, borderRadius: 1.1, fontSize: '1rem', fontWeight: 600,
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                      '&:hover': { boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)', transform: 'translateY(-1px)' },
                      '&:disabled': { background: 'grey.300', transform: 'none', boxShadow: 'none' },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={20} color="inherit" />
                        <span>Processing...</span>
                      </Stack>
                    ) : 'See Full Profile & Proceed'}
                  </Button>

                  {!allAnswered && (
                    <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                      <Chip label={`${answered}/${totalQuestions} Answered`} color="primary" variant="outlined" size="small" />
                    </Stack>
                  )}

                  {/* === Agreement notice (optional, lightweight, UI-consistent) === */}
                  <Divider sx={{ my: 3 }} />
                  <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Standard warning:</strong> Investments in securities are subject to market risks. Read all documents carefully before investing.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      SEBI registration/enlistment and NISM certification do not guarantee performance or returns.
                    </Typography>
                  </Alert>
                  <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                    {/* <Button size="small" onClick={() => navigateTo('sign')}>
                      Review Agreement
                    </Button> */}
                  </Stack>
                  {/* === /Agreement notice === */}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  )
}
