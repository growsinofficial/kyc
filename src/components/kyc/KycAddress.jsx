import { useState, useEffect } from 'react'
import {
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Fade,
  Alert,
  useTheme,
  useMediaQuery,
  CircularProgress,
  InputAdornment
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import HomeIcon from '@mui/icons-material/Home'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import PinDropIcon from '@mui/icons-material/PinDrop'
import PublicIcon from '@mui/icons-material/Public'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import PlaceIcon from '@mui/icons-material/Place'
import { indianStates } from '../../constants/indianStates'
import { isEmail, isPincode, isPhone } from '../../utils/validation'

export default function KycAddress({ state, persist }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const kyc0 = state.userData.kyc || {}

  const [local, setLocal] = useState({
    address: kyc0.address || '',
    city: kyc0.city || '',
    pincode: kyc0.pincode || '',
    state: kyc0.state || '',
    country: kyc0.country || 'India',
    mobile: kyc0.mobile || state.userData.mobile || '',
    email: kyc0.email || state.userData.email || '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Calculate form completion progress
  useEffect(() => {
    let completed = 0
    const total = 7 

    if (local.address.trim()) completed++
    if (local.city.trim()) completed++
    if (isPincode(local.pincode)) completed++
    if (local.state) completed++
    if (local.country) completed++
    if (isPhone(local.mobile)) completed++
    if (isEmail(local.email)) completed++

    setProgress((completed / total) * 100)
  }, [local])

  const setL = (k, v) => setLocal(prev => ({ ...prev, [k]: v }))

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))}
  const getFieldColor = (field) => {
    if (errors[field]) return 'error'
    if (touched[field] && local[field]) return 'success'
    return 'primary'
  }

  const validate = () => {
    const e = {}
    if (!local.address.trim()) e.address = 'Complete address is required'
    if (!local.city.trim()) e.city = 'City name is required'
    if (!isPincode(local.pincode)) e.pincode = 'Valid 6-digit PIN code is required'
    if (!local.state) e.state = 'Please select your state'
    if (!isPhone(local.mobile)) e.mobile = 'Valid 10-digit mobile number is required'
    if (!isEmail(local.email)) e.email = 'Valid email address is required'

    setTouched({
      address: true, city: true, pincode: true, state: true,
      country: true, mobile: true, email: true
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = async () => {
    if (!validate()) return
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    persist(s => ({
      ...s,
      userData: { ...s.userData, kyc: { ...s.userData.kyc, ...local } },
      kycSubStepStatus: { ...s.kycSubStepStatus, 2: true },
      kycSubStep: 3,
    }))
    setLoading(false)
  }

  const back = () => persist(s => ({ ...s, kycSubStep: 1 }))
  const allFieldsValid = progress === 100

  return (
    <Fade in timeout={600}>
      <Box>
        {/* Progress Header */}
        <Paper elevation={0} sx={{
          p: 1.6, mb: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e3e8f0 100%)',
          borderRadius: 1.1
        }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={600} color="primary">
              Address Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please provide your current residential address for verification
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">Completion Progress</Typography>
              <Typography variant="caption" fontWeight={600}>{Math.round(progress)}%</Typography>
            </Stack>
            <Box sx={{ width: '100%', height: 6, backgroundColor: 'grey.200', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{
                width: `${progress}%`, height: '100%',
                background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)',
                borderRadius: 3, transition: 'width 0.3s ease'
              }} />
            </Box>
          </Stack>
        </Paper>

        <Card sx={{ borderRadius: 1.1, boxShadow: '0 8px 32px rgba(0, 0, 0, 0)' }}>
          <CardContent sx={{ p: 1 }}>
            <Stack spacing={2.2}>

              {/* Address Field — label moved right, aligned in both states */}
              <Box sx={{ position: 'relative' }}>
                <TextField
                  multiline
                  minRows={3}
                  maxRows={6}
                  label="Complete Residential Address"
                  value={local.address}
                  onChange={e => setL('address', e.target.value)}
                  onBlur={handleBlur('address')}
                  error={!!errors.address && touched.address}
                  color={getFieldColor('address')}
                  fullWidth
                  InputLabelProps={{
                    sx: {
                      transform: 'translate(46px, 16px) scale(1)',
                      zIndex: 1,
                      px: 0.5,
                      backgroundColor: (t) => t.palette.background.paper,
                      '&.MuiInputLabel-shrink': {
                        transform: 'translate(16px, -9px) scale(0.75)',
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.1,
                      alignItems: 'flex-start',
                    },
                    '& .MuiInputBase-inputMultiline': {
                      paddingLeft: '56px',   
                      paddingTop: '16px',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    },
                    '& textarea': {
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                    },
                  }}
                />
                {/* Icon over the field so selection/cursor never overlaps it */}
                <HomeIcon
                  sx={{
                    position: 'absolute',
                    left: 14,
                    top: 26,
                    color: (t) => t.palette.primary.main,
                    pointerEvents: 'none',
                    zIndex: 3,
                    opacity: 0.9,
                  }}
                />
              </Box>

              <Grid container spacing={3}>
                {/* City */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="City"
                    value={local.city}
                    onChange={e => setL('city', e.target.value)}
                    onBlur={handleBlur('city')}
                    error={!!errors.city && touched.city}
                    color={getFieldColor('city')}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationCityIcon color={getFieldColor('city')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                  />
                </Grid>

                {/* PIN Code */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PIN Code"
                    value={local.pincode}
                    onChange={e =>
                      setL('pincode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                    }
                    onBlur={handleBlur('pincode')}
                    error={!!errors.pincode && touched.pincode}
                    color={getFieldColor('pincode')}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PinDropIcon color={getFieldColor('pincode')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                  />
                </Grid>

                {/* State */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="State"
                    value={local.state}
                    onChange={e => setL('state', e.target.value)}
                    onBlur={handleBlur('state')}
                    error={!!errors.state && touched.state}
                    color={getFieldColor('state')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PlaceIcon color={getFieldColor('state')} />
                        </InputAdornment>
                      ),
                    }}
                    SelectProps={{
                      displayEmpty: true,
                      MenuProps: { PaperProps: { style: { maxHeight: 280, borderRadius: 12 } } },
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                  >
                    <MenuItem value="">
                      <em>Select your state</em>
                    </MenuItem>
                    {indianStates.map(s => (
                      <MenuItem key={s} value={s} sx={{ py: 1 }}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Country */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Country"
                    value={local.country}
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PublicIcon color="success" />
                        </InputAdornment>
                      ),
                    }}
                    fullWidth
                    color="success"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.1,
                        backgroundColor: 'success.50'
                      }
                    }}
                  />
                </Grid>

                {/* Mobile */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Mobile Number"
                    value={local.mobile}
                    onChange={e =>
                      setL('mobile', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
                    }
                    onBlur={handleBlur('mobile')}
                    error={!!errors.mobile && touched.mobile}
                    color={getFieldColor('mobile')}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color={getFieldColor('mobile')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                  />
                </Grid>

                {/* Email */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email Address"
                    value={local.email}
                    onChange={e => setL('email', e.target.value)}
                    onBlur={handleBlur('email')}
                    error={!!errors.email && touched.email}
                    color={getFieldColor('email')}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color={getFieldColor('email')} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.1 } }}
                  />
                </Grid>
              </Grid>

              {/* Status Alert */}
              {allFieldsValid && (
                <Fade in>
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: 1.1, border: '1px solid' }}>
                    All address details are complete and validated. Ready to proceed to the next step.
                  </Alert>
                </Fade>
              )}

              {/* Action Buttons */}
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  variant="outlined"
                  onClick={back}
                  sx={{ height: 48, borderRadius: 1.1, minWidth: 120, fontWeight: 600 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={next}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
                  sx={{
                    minWidth: 140, height: 48, borderRadius: 1.1, fontSize: '1rem', fontWeight: 600,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                    '&:hover': { boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)', transform: 'translateY(-1px)' },
                    '&:disabled': { background: 'grey.300', transform: 'none', boxShadow: 'none' },
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
