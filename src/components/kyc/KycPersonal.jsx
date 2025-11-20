import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Button, Grid, Radio, RadioGroup, Stack, TextField, FormControlLabel, FormLabel,
  Box, Typography, Card, CardContent, Paper, Fade, Alert, useTheme, useMediaQuery,
  CircularProgress, InputAdornment
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import PersonIcon from '@mui/icons-material/Person'
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom'
import CakeIcon from '@mui/icons-material/Cake'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import FemaleIcon from '@mui/icons-material/Female'
import MaleIcon from '@mui/icons-material/Male'
import TransgenderIcon from '@mui/icons-material/Transgender'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import apiService from '../../services/api.js'

export default function KycPersonal({ state, persist }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const kyc = state.userData.kyc || {}
  const kycData = state.kycData || {} // Data from MongoDB
  
  // Memoize personal data to prevent useEffect dependency issues
  const personalData = useMemo(() => kycData.personal || {}, [kycData.personal])

  const [local, setLocal] = useState({
    name: personalData.name || kyc.name || state.userData.name || '',
    fatherName: personalData.fatherName || kyc.fatherName || '',
    dob: personalData.dob ? personalData.dob.split('T')[0] : kyc.dob || '',
    pan: personalData.pan || kyc.pan || '',
    aadhar: personalData.aadhar || kyc.aadhar || '',
    gender: personalData.gender || kyc.gender || '',
    maritalStatus: personalData.maritalStatus || kyc.maritalStatus || '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Update local state when kycData changes (after data is loaded)
  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      console.log('🔄 Updating form with loaded personal data:', personalData);
      setLocal({
        name: personalData.name || '',
        fatherName: personalData.fatherName || '',
        dob: personalData.dob ? personalData.dob.split('T')[0] : '',
        pan: personalData.pan || '',
        aadhar: personalData.aadhar || '',
        gender: personalData.gender || '',
        maritalStatus: personalData.maritalStatus || '',
      });
    }
  }, [personalData]);

  // Calculate form completion progress
  useEffect(() => {
    let completed = 0
    const total = 7 
    
    if (local.name.trim()) completed++
    if (local.fatherName.trim()) completed++
    if (local.dob) completed++
    if (local.pan && /^[A-Z]{5}\d{4}[A-Z]$/.test(local.pan)) completed++
    if (local.aadhar && /^\d{12}$/.test(local.aadhar)) completed++
    if (local.gender) completed++
    if (local.maritalStatus) completed++
    
    setProgress((completed / total) * 100)
  }, [local])

  const setL = (k, v) => setLocal(prev => ({ ...prev, [k]: v }))

  // Dynamic name sync to header (debounced)
  const debounceRef = useRef()
  const updateHeaderName = (val) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist(s => ({ ...s, userData: { ...s.userData, name: val } }))
    }, 300)
  }

  // if signup name changes later and KYC name is still empty, adopt it
  useEffect(() => {
    if (!kyc.name && state.userData.name && !local.name) {
      setLocal(prev => ({ ...prev, name: state.userData.name }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.userData.name])

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const getFieldColor = (field) => {
    if (errors[field]) return 'error'
    if (touched[field] && local[field]) return 'success'
    return 'primary'
  }

  const validate = () => {
    const e = {}
    if (!local.name.trim()) e.name = 'Full name as per PAN card is required'
    if (!local.fatherName.trim()) e.fatherName = "Father's name is required"
    if (!local.dob) e.dob = 'Date of birth is required'
    if (!local.pan) e.pan = 'PAN number is required'
    else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(local.pan)) e.pan = 'Invalid PAN format (e.g., ABCDE1234F)'
    if (!local.aadhar) e.aadhar = 'Aadhaar number is required'
    else if (!/^\d{12}$/.test(local.aadhar)) e.aadhar = 'Aadhaar must be exactly 12 digits'
    if (!local.gender) e.gender = 'Please select your gender'
    if (!local.maritalStatus) e.maritalStatus = 'Please select marital status'
    
    setTouched({
      name: true, fatherName: true, dob: true, pan: true, 
      aadhar: true, gender: true, maritalStatus: true
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = async () => {
    if (!validate()) return
    
    setLoading(true)
    
    try {
      console.log('🔍 Submitting personal info data:', local)
      
      // Submit personal info to backend
      await apiService.submitPersonalInfo(local)
      
      // Update local state on success
      persist(s => ({
        ...s,
        userData: { ...s.userData, name: local.name, kyc: { ...s.userData.kyc, ...local } },
        kycSubStepStatus: { ...s.kycSubStepStatus, 1: true },
        kycSubStep: 2,
      }))
    } catch (error) {
      console.error('Failed to submit personal info:', error)
      console.error('Error details:', error.message)
      // You could add error handling here, e.g., show a toast
      setErrors({ general: 'Failed to save personal information. Please try again.' })
    }
    
    setLoading(false)
  }

  const allFieldsValid = progress === 100

  return (
    <Fade in timeout={600}>
      <Box>
        {/* Progress Header */}
        <Paper elevation={0} sx={{ 
          p: 3, 
          mb: 1, 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
          borderRadius: 1.1
        }}>
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={600} color="primary">
              Personal Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please provide your personal details as they appear on your official documents
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
              borderRadius: 3,
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
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={1}>
              {/* Personal Details Grid */}
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Full Name as per PAN"
                    fullWidth
                    value={local.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setL('name', val)
                      updateHeaderName(val)
                    }}
                    onBlur={handleBlur('name')}
                    error={!!errors.name && touched.name}
                    color={getFieldColor('name')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color={getFieldColor('name')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.1,
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Father's Name"
                    fullWidth
                    value={local.fatherName}
                    onChange={(e) => setL('fatherName', e.target.value)}
                    onBlur={handleBlur('fatherName')}
                    error={!!errors.fatherName && touched.fatherName}
                    color={getFieldColor('fatherName')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FamilyRestroomIcon color={getFieldColor('fatherName')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.1,
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Date of Birth"
                    value={local.dob ? new Date(local.dob) : null}
                    onChange={(val) => {
                      if (val instanceof Date && !isNaN(val)) {
                        setL('dob', val.toISOString().split('T')[0])
                      } else {
                        setL('dob', '')
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.dob && touched.dob,
                        onBlur: handleBlur('dob'),
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CakeIcon color={getFieldColor('dob')} />
                            </InputAdornment>
                          ),
                        },
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.1,
                          }
                        }
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="PAN Number"
                    fullWidth
                    value={local.pan}
                    onChange={(e) =>
                      setL('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))
                    }
                    onBlur={handleBlur('pan')}
                    error={!!errors.pan && touched.pan}
                    helperText={errors.pan || "10-character PAN (e.g., ABCDE1234F)"}
                    color={getFieldColor('pan')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCardIcon color={getFieldColor('pan')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.1,
                      }
                    }}
                    inputProps={{ 
                      maxLength: 10,
                      style: { textTransform: 'uppercase' }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Aadhaar Number"
                    fullWidth
                    value={local.aadhar}
                    onChange={(e) =>
                      setL('aadhar', e.target.value.replace(/[^0-9]/g, '').slice(0, 12))
                    }
                    onBlur={handleBlur('aadhar')}
                    error={!!errors.aadhar && touched.aadhar}
                    helperText={errors.aadhar || "12-digit Aadhaar number"}
                    color={getFieldColor('aadhar')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FingerprintIcon color={getFieldColor('aadhar')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.1,
                      }
                    }}
                    inputProps={{ maxLength: 12 }}
                  />
                </Grid>
              </Grid>

              {/* Gender and Marital Status */}
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <FormLabel 
                    component="legend" 
                    sx={{ 
                      mb: 2, 
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: errors.gender && touched.gender ? 'error.main' : 'text.primary'
                    }}
                  >
                    Gender *
                  </FormLabel>
                  <RadioGroup
                    row={!isMobile}
                    value={local.gender}
                    onChange={(e) => setL('gender', e.target.value)}
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel 
                      value="Male" 
                      control={<Radio />} 
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <MaleIcon fontSize="small" />
                          <span>Male</span>
                        </Stack>
                      } 
                      sx={{ 
                        mr: 3,
                        '& .MuiRadio-root': {
                          color: getFieldColor('gender') === 'error' ? 'error.main' : 'primary.main'
                        }
                      }}
                    />
                    <FormControlLabel 
                      value="Female" 
                      control={<Radio />} 
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FemaleIcon fontSize="small" />
                          <span>Female</span>
                        </Stack>
                      }
                      sx={{ 
                        mr: 3,
                        '& .MuiRadio-root': {
                          color: getFieldColor('gender') === 'error' ? 'error.main' : 'primary.main'
                        }
                      }}
                    />
                    <FormControlLabel 
                      value="Other" 
                      control={<Radio />} 
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <TransgenderIcon fontSize="small" />
                          <span>Other</span>
                        </Stack>
                      }
                      sx={{ 
                        '& .MuiRadio-root': {
                          color: getFieldColor('gender') === 'error' ? 'error.main' : 'primary.main'
                        }
                      }}
                    />
                  </RadioGroup>
                  {errors.gender && touched.gender && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {errors.gender}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormLabel 
                    component="legend" 
                    sx={{ 
                      mb: 2, 
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: errors.maritalStatus && touched.maritalStatus ? 'error.main' : 'text.primary'
                    }}
                  >
                    Marital Status *
                  </FormLabel>
                  <RadioGroup
                    row={!isMobile}
                    value={local.maritalStatus}
                    onChange={(e) => setL('maritalStatus', e.target.value)}
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel 
                      value="Single" 
                      control={<Radio />} 
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FavoriteBorderIcon fontSize="small" />
                          <span>Single</span>
                        </Stack>
                      }
                      sx={{ 
                        mr: 3,
                        '& .MuiRadio-root': {
                          color: getFieldColor('maritalStatus') === 'error' ? 'error.main' : 'primary.main'
                        }
                      }}
                    />
                    <FormControlLabel 
                      value="Married" 
                      control={<Radio />} 
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FavoriteIcon fontSize="small" />
                          <span>Married</span>
                        </Stack>
                      }
                      sx={{ 
                        '& .MuiRadio-root': {
                          color: getFieldColor('maritalStatus') === 'error' ? 'error.main' : 'primary.main'
                        }
                      }}
                    />
                  </RadioGroup>
                  {errors.maritalStatus && touched.maritalStatus && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {errors.maritalStatus}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {/* Status Alert */}
              {allFieldsValid && (
                <Fade in>
                  <Alert 
                    severity="success"
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                    }}
                  >
                    All personal details are complete and validated. Ready to proceed.
                  </Alert>
                </Fade>
              )}

              {/* Action Button */}
              <Stack direction="row" justifyContent="flex-end">
                <Button 
                  variant="contained"
                  size="large"
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