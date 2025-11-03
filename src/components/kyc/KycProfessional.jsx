import { useState, useEffect } from 'react'
import {
  Button, FormControl, FormControlLabel, FormHelperText, FormLabel,
  InputLabel, MenuItem, Radio, RadioGroup, Select, Stack, TextField,
  Box, Typography, Card, CardContent, Paper, Fade, Alert,
  useTheme, useMediaQuery, CircularProgress, Grid, InputAdornment
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import WorkIcon from '@mui/icons-material/Work'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import EngineeringIcon from '@mui/icons-material/Engineering'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import HomeIcon from '@mui/icons-material/Home'
import BeachAccessIcon from '@mui/icons-material/BeachAccess'

export default function KycProfessional({ state, persist }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const kyc = state.userData.kyc || {}

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Local-only buffer for "Others" so typing never touches global store
  const [otherLocal, setOtherLocal] = useState(kyc.otherOccupation || '')

  // If occupation toggles away from Others, clear local; if back, preload from global
  useEffect(() => {
    if (kyc.occupation === 'Others') {
      setOtherLocal(kyc.otherOccupation || '')
    } else {
      setOtherLocal('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kyc.occupation])

  const setK = (key, val) =>
    persist(s => ({
      ...s,
      userData: {
        ...s.userData,
        kyc: {
          ...s.userData.kyc,
          [key]: val
        }
      }
    }))

  const occupationTypes = [
    { value: 'salaried', label: 'Salaried', icon: <WorkIcon /> },
    { value: 'self-employed', label: 'Self Employed', icon: <PersonIcon /> },
    { value: 'business', label: 'Business', icon: <BusinessCenterIcon /> },
    { value: 'profession', label: 'Professional', icon: <EngineeringIcon /> }
  ]

  const occupations = [
    { value: "Salaried (Private Sector)", label: "Salaried (Private Sector)", icon: <WorkIcon /> },
    { value: "Salaried (Government / PSU)", label: "Salaried (Government / PSU)", icon: <BusinessCenterIcon /> },
    { value: "Self-employed / Professional", label: "Self-employed / Professional", icon: <PersonIcon /> },
    { value: "Business Owner", label: "Business Owner", icon: <BusinessCenterIcon /> },
    { value: "Student", label: "Student", icon: <SchoolIcon /> },
    { value: "Retired", label: "Retired", icon: <BeachAccessIcon /> },
    { value: "Homemaker", label: "Homemaker", icon: <HomeIcon /> },
    { value: "Agriculturist / Farmer", label: "Agriculturist / Farmer", icon: <AgricultureIcon /> },
    { value: "Others", label: "Others", icon: <WorkIcon /> }
  ]

  // Progress uses local buffer when occupation is Others
  useEffect(() => {
    let completed = 0
    const total = kyc.occupation === 'Others' ? 3 : 2
    if (kyc.occupationType) completed++
    if (kyc.occupation) completed++
    if (kyc.occupation === 'Others' && otherLocal.trim()) completed++
    setProgress((completed / total) * 100)
  }, [kyc.occupationType, kyc.occupation, otherLocal])

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const validate = () => {
    const e = {}
    if (!kyc.occupationType) {
      e.type = 'Please select your occupation type'
      setTouched(prev => ({ ...prev, type: true }))
    }
    if (!kyc.occupation) {
      e.occ = 'Please select your occupation'
      setTouched(prev => ({ ...prev, occ: true }))
    }
    if (kyc.occupation === 'Others' && !otherLocal.trim()) {
      e.other = 'Please specify your occupation'
      setTouched(prev => ({ ...prev, other: true }))
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = async () => {
    // Final sync local -> global before validating/advancing
    if (kyc.occupation === 'Others') {
      setK('otherOccupation', otherLocal)
    }

    if (!validate()) return

    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 300))
    persist(s => ({
      ...s,
      kycSubStepStatus: { ...s.kycSubStepStatus, 3: true },
      kycSubStep: 4
    }))
    setLoading(false)
  }

  const back = () => persist(s => ({ ...s, kycSubStep: 2 }))

  const allFieldsValid = progress === 100

  const getOccupationIcon = (occupationValue) => {
    const occupation = occupations.find(occ => occ.value === occupationValue)
    return occupation ? occupation.icon : <WorkIcon />
  }

  return (
    <Fade in timeout={600}>
      <Box component="form" onSubmit={(e) => e.preventDefault()}>
        {/* Progress Header */}
        <Paper elevation={0} sx={{
          p: 3,
          mb: 1,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
          borderRadius: 1.1
        }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={600} color="primary">
              Professional Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tell us about your professional background and occupation
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Completion Progress
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {Math.round(progress)}%
              </Typography>
            </Stack>
            <Box sx={{
              width: '100%',
              height: 6,
              backgroundColor: 'grey.200',
              borderRadius: 1.1,
              overflow: 'hidden'
            }}>
              <Box sx={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)',
                borderRadius: 3,
                transition: 'width 0.3s ease'
              }} />
            </Box>
          </Stack>
        </Paper>

        <Card sx={{ borderRadius: 1.1, boxShadow: '0 8px 32px rgba(0, 0, 0, 0)' }}>
          <CardContent sx={{ p: 2 }}>
            <Stack spacing={1}>
              {/* Occupation Type */}
              <FormControl error={!!errors.type && touched.type}>
                <FormLabel
                  sx={{
                    mb: 2,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: errors.type && touched.type ? 'error.main' : 'text.primary'
                  }}
                >
                  Occupation Type *
                </FormLabel>
                <RadioGroup
                  value={kyc.occupationType || ''}
                  onChange={e => {
                    setK('occupationType', e.target.value)
                    if (errors.type) setErrors(prev => ({ ...prev, type: '' }))
                  }}
                  onBlur={handleBlur('type')}
                  sx={{ gap: 2 }}
                >
                  <Grid container spacing={2}>
                    {occupationTypes.map((type) => (
                      <Grid item xs={12} sm={6} key={type.value}>
                        <FormControlLabel
                          value={type.value}
                          control={<Radio />}
                          label={
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              {type.icon}
                              <Typography variant="body2" fontWeight={500}>
                                {type.label}
                              </Typography>
                            </Stack>
                          }
                          sx={{
                            width: '100%',
                            m: 1,
                            p: 0,
                            border: '2px solid',
                            borderColor: kyc.occupationType === type.value ? 'primary.main' : 'grey.200',
                            borderRadius: 1.1,
                            backgroundColor: kyc.occupationType === type.value ? 'primary.50' : 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'primary.light',
                              backgroundColor: 'primary.50'
                            },
                            '& .MuiRadio-root': {
                              color: kyc.occupationType === type.value ? 'primary.main' : 'grey.400'
                            }
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
                {errors.type && touched.type && (
                  <FormHelperText sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {errors.type}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Occupation */}
              <FormControl fullWidth error={!!errors.occ && touched.occ}>
                <InputLabel
                  id="occ-label"
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  Occupation *
                </InputLabel>
                <Select
                  labelId="occ-label"
                  label="Occupation *"
                  value={kyc.occupation || ''}
                  onChange={e => {
                    setK('occupation', e.target.value)
                    if (errors.occ) setErrors(prev => ({ ...prev, occ: '' }))
                    if (e.target.value !== 'Others') setOtherLocal('')
                  }}
                  onBlur={handleBlur('occ')}
                  sx={{
                    borderRadius: 1.1,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: errors.occ && touched.occ ? 'error.main' : 'grey.300'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        borderRadius: 1.1,
                        marginTop: 1
                      }
                    }
                  }}
                >
                  {occupations.map((occupation) => (
                    <MenuItem
                      key={occupation.value}
                      value={occupation.value}
                      sx={{ py: 1.5 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        {occupation.icon}
                        <Typography variant="body2">
                          {occupation.label}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
                {errors.occ && touched.occ && (
                  <FormHelperText sx={{ fontSize: '0.75rem' }}>
                    {errors.occ}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Other Occupation Specification (pure local while typing) */}
              {kyc.occupation === 'Others' && (
                <TextField
                  id="other-occupation"
                  label="Specify Your Occupation"
                  value={otherLocal}
                  onChange={(e) => {
                    setOtherLocal(e.target.value)        
                    if (errors.other) setErrors(prev => ({ ...prev, other: '' }))
                  }}
                  onBlur={() => {
                    setTouched(prev => ({ ...prev, other: true }))
                    setK('otherOccupation', otherLocal)   
                  }}
                  error={!!errors.other && touched.other}
                  helperText={errors.other || "Please specify your occupation details"}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.1,
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WorkIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    inputProps: { autoComplete: 'off' }
                  }}
                />
              )}

              {/* Status Alert */}
              {allFieldsValid && (
                <Fade in>
                  <Alert
                    severity="success"
                    variant="outlined"
                    sx={{
                      borderRadius: 1.1,
                      border: '1px solid',
                    }}
                    icon={getOccupationIcon(kyc.occupation)}
                  >
                    <Typography variant="body2">
                      Professional information complete. {kyc.occupationType && `You're registered as ${kyc.occupationType.replace('-', ' ')}.`}
                    </Typography>
                  </Alert>
                </Fade>
              )}

              {/* Action Buttons */}
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Button
                  type="button"
                  startIcon={<ArrowBackIcon />}
                  variant="outlined"
                  onClick={back}
                  sx={{
                    height: 48,
                    borderRadius: 1.1,
                    minWidth: 120,
                    fontWeight: 600
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  onClick={next}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
                  sx={{
                    minWidth: 140,
                    height: 48,
                    borderRadius: 1.1,
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
                  {loading ? 'Processing...' : 'Continue'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Fade>
  )
}
