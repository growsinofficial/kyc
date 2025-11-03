import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  Chip,
  Paper,
  Fade,
  useTheme,
  useMediaQuery,
  Divider,
  alpha
} from '@mui/material'
import ActiveHeader from '../layout/ActiveHeader'
import StepRail from '../layout/StepRail'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StarIcon from '@mui/icons-material/Star'

const plans = [
  {
    key: 'standard',
    title: 'Comprehensive Planning',
    subtitle: 'Complete financial roadmap for individuals and families',
    price: '₹34,999',
    details: 'One-time comprehensive fee',
    features: [
      'Financial Health Check & Analysis',
      'Goal-Based Financial Planning',
      'Risk Management & Insurance',
      'Strategic Investment Planning',
      'Retirement & Pension Planning',
      'Debt & Credit Advisory',
      'Tax Optimization Strategies'
    ],
    recommended: false
  },
  {
    key: 'exclusive',
    title: 'Wealth Management',
    subtitle: 'Bespoke strategies for high-net-worth clients',
    price: 'Customized',
    details: 'Preferred for > ₹1 Cr Net Worth',
    features: [
      'All Comprehensive features',
      'Strategic Wealth Structuring',
      'Global Diversification',
      'Advanced Tax Planning',
      'Legacy & Succession Planning',
      'Private Market Advisory',
      'Lifestyle & Concierge Services'
    ],
    recommended: true
  },
  {
    key: 'rebalancing',
    title: 'Portfolio Rebalancing',
    subtitle: 'Professional alignment of investment portfolio',
    price: '₹14,999 / ₹24,999',
    details: 'For Portfolio Value up to ₹50L / above ₹50L',
    features: [
      'Portfolio Analysis & Risk Profiling',
      'Intrinsic Value Analysis',
      'Asset Allocation Strategy',
      'Portfolio Optimization',
      'Rebalancing Report',
      'Execution Guidance',
      '6-month Performance Review'
    ],
    recommended: false
  },
]

export default function Plans({ state, persist, onLogout, navigateTo }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'))

  // keep default selection as your previous logic (exclusive)
  const [selected, setSelected] = useState(state.userData.selectedPlan?.key || 'exclusive')
  const [rebalanceOpen, setRebalanceOpen] = useState(false)
  const [exclusiveOpen, setExclusiveOpen] = useState(false)
  const [portfolioValue, setPortfolioValue] = useState('')
  const [aumValue, setAumValue] = useState('')

  // ---- NEW: show recommended plan first (top/left on grid) ----
  const displayPlans = useMemo(() => {
    return [...plans].sort((a, b) => (b.recommended === true) - (a.recommended === true))
  }, [])

  const chosen = useMemo(
    () => plans.find((p) => p.key === selected) || plans[1],
    [selected]
  )

  const applySelection = (planObj) => {
    persist((s) => ({
      ...s,
      userData: {
        ...s.userData,
        selectedPlan: {
          key: planObj.key,
          title: planObj.title,
          price: planObj.price,
          details: planObj.details,
        },
      },
    }))
  }

  const handleSelect = (key) => {
    setSelected(key)
    const planObj = plans.find((p) => p.key === key)
    if (!planObj) return

    if (key === 'rebalancing') {
      setPortfolioValue('')
      setRebalanceOpen(true)
    } else if (key === 'exclusive') {
      setAumValue('')
      setExclusiveOpen(true)
    } else {
      applySelection(planObj)
    }
  }

  const sanitizeNumber = (val) => {
    const cleaned = String(val || '').replace(/[, ]/g, '')
    const num = parseFloat(cleaned)
    return Number.isFinite(num) ? num : NaN
  }

  const confirmRebalance = () => {
    const v = sanitizeNumber(portfolioValue)
    if (!Number.isFinite(v) || v < 0) return
    const np = v <= 5000000 ? '₹14,999' : '₹24,999'
    const nd = v <= 5000000 ? 'For Portfolio Value up to ₹50L' : 'For Portfolio Value above ₹50L'
    applySelection({ key: 'rebalancing', title: 'Portfolio Rebalancing', price: np, details: nd })
    setRebalanceOpen(false)
  }

  const confirmExclusive = () => {
    applySelection({
      key: 'exclusive',
      title: 'Wealth Management',
      price: 'AUM Based',
      details: '1.5% Annually (+ ₹99,999 Upfront)',
    })
    setExclusiveOpen(false)
  }

  const PlanCard = ({ plan, index }) => (
    <Fade in timeout={500} style={{ transitionDelay: `${index * 100}ms` }}>
      <Card
        sx={{
          position: 'relative', 
          height: '100%',
          borderRadius: 2,
          border: selected === plan.key ? `2px solid ${theme.palette.primary.main}` : '1px solid',
          borderColor: selected === plan.key ? theme.palette.primary.main : theme.palette.grey[200],
          backgroundColor: 'white',
          boxShadow:
            selected === plan.key
              ? `0 8px 20px ${alpha(theme.palette.primary.main, 0.15)}`
              : '0 4px 10px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 28px ${alpha(theme.palette.primary.main, 0.2)}`
          }
        }}
      >
        {/* ---- NEW: Corner ribbon for RECOMMENDED at the top ---- */}
        {plan.recommended && (
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              left: -36,
              transform: 'rotate(-45deg)',
              bgcolor: theme.palette.primary.main,
              color: 'white',
              px: 6,
              py: 0.6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
              boxShadow: `0 6px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
              zIndex: 3,
              userSelect: 'none'
            }}
          >
            RECOMMENDED
          </Box>
        )}

        <CardContent sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              {plan.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
            >
              {plan.subtitle}
            </Typography>

            {/* Price */}
            <Typography
              variant="h4"
              fontWeight={700}
              color="primary.main"
              sx={{ fontSize: { xs: '1.8rem', sm: '2rem' } }}
            >
              {plan.price}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
            >
              {plan.details}
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Features */}
          <Stack spacing={1.3} sx={{ mb: 2 }}>
            {plan.features.map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1 }}>
                <CheckCircleIcon
                  sx={{ fontSize: 16, color: theme.palette.primary.main, flexShrink: 0, mt: 0.3 }}
                />
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* Select Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleSelect(plan.key)}
            sx={{
              borderRadius: 1.2,
              fontWeight: 600,
              textTransform: 'none',
              py: 1.2,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              mt: 'auto',
              backgroundColor: selected === plan.key ? '#175ee2' : theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.dark }
            }}
          >
            {selected === plan.key ? 'Selected' : 'Select Plan'}
          </Button>
        </CardContent>
      </Card>
    </Fade>
  )

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 5 }, px: { xs: 1.5, sm: 3 } }}>
      <ActiveHeader state={state} onLogout={onLogout} />
      <StepRail activeId="plan" />

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 6 } }}>
        <Typography
          variant="h4"
          fontWeight={700}
          color="text.primary"
          sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}
        >
          Choose Your Plan
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: 'auto', fontSize: { xs: '0.9rem', sm: '1rem' } }}
        >
          Select the financial planning service that best fits your needs and goals.
        </Typography>
      </Box>

      {/* Responsive Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }} justifyContent="center" alignItems="stretch">
        {displayPlans.map((plan, index) => (
          <Grid item xs={12} sm={6} md={4} key={plan.key}>
            <PlanCard plan={plan} index={index} />
          </Grid>
        ))}
      </Grid>

      {/* Bottom Proceed Section */}
      <Paper
        elevation={0}
        sx={{
          mt: { xs: 4, sm: 5 },
          p: { xs: 2, sm: 3 },
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          borderRadius: 2
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Box>
            <Typography variant="body1" fontWeight={600} color="text.primary">
              {chosen.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ready to proceed with your selected plan?
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigateTo('sign')}
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              borderRadius: 1,
              fontWeight: 600,
              py: 1,
              textTransform: 'none',
              backgroundColor: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.dark }
            }}
          >
            Continue to Agreement
          </Button>
        </Stack>
      </Paper>

      {/* Dialogs */}
      <Dialog open={rebalanceOpen} onClose={() => setRebalanceOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>Portfolio Value</Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>Enter your current portfolio value to determine the service fee.</Typography>
            <TextField
              autoFocus
              label="Portfolio Value (₹)"
              fullWidth
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(e.target.value)}
              placeholder="e.g., 5,000,000"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRebalanceOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmRebalance} disabled={!portfolioValue}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exclusiveOpen} onClose={() => setExclusiveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>Assets Under Management</Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>Provide your approximate Assets Under Management for customized pricing.</Typography>
            <TextField
              autoFocus
              label="Approximate AUM (₹)"
              fullWidth
              value={aumValue}
              onChange={(e) => setAumValue(e.target.value)}
              placeholder="e.g., 15,000,000"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExclusiveOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmExclusive}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
