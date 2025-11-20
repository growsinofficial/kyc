import { useState } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  Stack, 
  Typography, 
  Box, 
  Chip, 
  Fade,
  LinearProgress,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions
} from '@mui/material'
import UploadIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import apiService from '../../services/api.js'
import CloseIcon from '@mui/icons-material/Close'

export default function DocCard({ id, title, state, persist }) {
  const uploaded = state.userData.docsStatus?.[id]
  const preview = state.userData.kyc?.[`doc_${id}`]
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState('')

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    const maxSize = 10 * 1024 * 1024  // 10MB

    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG or JPG)')
      return false
    }

    if (file.size > maxSize) {
      setError('File size must be less than 10MB')
      return false
    }

    setError('')
    return true
  }

  const onChange = async (file) => {
    if (!validateFile(file)) return

    setUploading(true)
    setProgress(0)
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
           
          Chip
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    try {
      // Upload document to backend
      const response = await apiService.uploadDocument(id, file)
      
      setProgress(100)
      
      // Update state with uploaded document info
      persist(s => ({ 
        ...s, 
        userData: { 
          ...s.userData, 
          kyc: { 
            ...s.userData.kyc, 
            [`doc_${id}`]: response.url || response.data 
          }, 
          docsStatus: { 
            ...s.userData.docsStatus, 
            [id]: true 
          } 
        } 
      }))
      
      setUploading(false)
      setProgress(0)
      
    } catch (error) {
      console.error('Upload failed:', error)
      setError(error.message || 'Upload failed. Please try again.')
      setUploading(false)
      setProgress(0)
    }
  }

  const handleRemove = () => {
    persist(s => ({ 
      ...s, 
      userData: { 
        ...s.userData, 
        kyc: { 
          ...s.userData.kyc, 
          [`doc_${id}`]: undefined 
        }, 
        docsStatus: { 
          ...s.userData.docsStatus, 
          [id]: false 
        } 
      } 
    }))
    setError('')
  }

  const handlePreview = () => {
    setPreviewOpen(true)
  }

  return (
    <>
      <Fade in timeout={600}>
        <Card sx={{ 
          borderRadius: 3, 
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '2px solid',
          borderColor: uploaded ? 'success.light' : 'grey.100',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 48px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3} alignItems="center">
              {/* Status Header */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                <Chip 
                  icon={uploaded ? <CheckCircleIcon /> : <ErrorIcon />}
                  label={uploaded ? 'Verified' : 'Required'}
                  color={uploaded ? 'success' : 'error'}
                  variant="outlined"
                  size="small"
                />
                {uploaded && (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton 
                      size="small" 
                      onClick={handlePreview}
                      sx={{ 
                        color: 'primary.main',
                        '&:hover': { backgroundColor: 'primary.50' }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={handleRemove}
                      sx={{ 
                        color: 'error.main',
                        '&:hover': { backgroundColor: 'error.50' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Stack>

              {/* Preview/Upload Icon */}
              {uploaded && preview ? (
                <Box 
                  sx={{ 
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover .preview-overlay': {
                      opacity: 1
                    }
                  }}
                  onClick={handlePreview}
                >
                  <img 
                    src={preview} 
                    alt={`${title} preview`} 
                    style={{ 
                      maxHeight: 120, 
                      maxWidth: 200,
                      borderRadius: 8,
                      objectFit: 'cover'
                    }}
                  />
                  <Box 
                    className="preview-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    <VisibilityIcon sx={{ color: 'white', fontSize: 32 }} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 2, 
                  backgroundColor: 'grey.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}>
                  <UploadIcon sx={{ fontSize: 32, color: 'text.secondary' }}/>
                </Box>
              )}

              {/* Title and Requirements */}
              <Stack spacing={1} alignItems="center" textAlign="center">
                <Typography variant="h6" fontWeight={700}>
                  {title} <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {uploaded ? 'Document successfully uploaded' : 'PNG, JPG up to 10MB'}
                </Typography>
              </Stack>

              {/* Upload Progress */}
              {uploading && (
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress}
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, #1976d2 0%, #4dabf5 100%)'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
                    Uploading... {progress}%
                  </Typography>
                </Box>
              )}

              {/* Error Message */}
              {error && (
                <Typography variant="caption" color="error" align="center" sx={{ maxWidth: 200 }}>
                  {error}
                </Typography>
              )}

              {/* Upload Button */}
              <Button 
                component="label" 
                variant={uploaded ? 'outlined' : 'contained'}
                disabled={uploading}
                startIcon={uploaded ? null : <UploadIcon />}
                sx={{
                  borderRadius: 2,
                  minWidth: 140,
                  fontWeight: 600,
                  ...(uploaded ? {
                    borderColor: 'success.main',
                    color: 'success.main',
                    '&:hover': {
                      borderColor: 'success.dark',
                      backgroundColor: 'success.50'
                    }
                  } : {
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-1px)'
                    }
                  })
                }}
              >
                {uploading ? 'Uploading...' : uploaded ? 'Change File' : 'Upload File'}
                <input 
                  hidden 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={e => { 
                    const f = e.target.files?.[0] 
                    if (f) onChange(f) 
                    e.target.value = '' 
                  }}
                />
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Fade>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          {preview && (
            <img 
              src={preview} 
              alt={`${title} preview`} 
              style={{ 
                width: '100%', 
                height: 'auto',
                display: 'block'
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleRemove}
            color="error"
            startIcon={<DeleteIcon />}
          >
            Remove Document
          </Button>
          <Button 
            onClick={() => setPreviewOpen(false)}
            variant="contained"
          >
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}