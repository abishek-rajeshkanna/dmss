import { createTheme } from '@mui/material/styles'

const hyundaiBlue = '#002C5F'
const hyundaiBlue2 = '#003B7A'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: hyundaiBlue },
    secondary: { main: hyundaiBlue2 },
    background: { default: '#F7FAFF', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'system-ui',
      'Segoe UI',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(0, 44, 95, 0.08)',
        },
      },
    },
  },
})

