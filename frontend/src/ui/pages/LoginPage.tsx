import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import { api } from '../../api/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('rajesh.sharma@sharmamotors.in')
  const [password, setPassword] = React.useState('Test@1234')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tokens = await api.auth.login({ email, password })
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(1200px 600px at 30% 10%, rgba(0,44,95,0.12), transparent 60%), linear-gradient(180deg, #F7FAFF, #FFFFFF)',
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
                Hyundai DMS
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Sign in to continue
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Theme: Hyundai blue/white • Minimal UI • Responsive layout
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}

