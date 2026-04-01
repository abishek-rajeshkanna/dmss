import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import DashboardIcon from '@mui/icons-material/Dashboard'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import PeopleIcon from '@mui/icons-material/People'
import BadgeIcon from '@mui/icons-material/Badge'
import ReceiptIcon from '@mui/icons-material/Receipt'
import DriveEtaIcon from '@mui/icons-material/DriveEta'
import BuildIcon from '@mui/icons-material/Build'
import PaymentIcon from '@mui/icons-material/Payment'
import StorefrontIcon from '@mui/icons-material/Storefront'

const drawerWidth = 260

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Inventory', path: '/inventory', icon: <DirectionsCarIcon /> },
  { label: 'Customers', path: '/customers', icon: <PeopleIcon /> },
  { label: 'Orders', path: '/orders', icon: <ReceiptIcon /> },
  { label: 'Test Drives', path: '/test-drives', icon: <DriveEtaIcon /> },
  { label: 'Service', path: '/service', icon: <BuildIcon /> },
  { label: 'Payments', path: '/payments', icon: <PaymentIcon /> },
  { label: 'Users', path: '/users', icon: <BadgeIcon /> },
  { label: 'Dealerships', path: '/dealerships', icon: <StorefrontIcon /> },
  { label: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
] as const

function hasToken() {
  return Boolean(localStorage.getItem('accessToken'))
}

export function ShellLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    if (!hasToken() && location.pathname !== '/login') navigate('/login', { replace: true })
  }, [location.pathname, navigate])

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.25, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
          Hyundai DMS
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          AutoEver theme
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path)
              if (isMobile) setOpen(false)
            }}
            sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            navigate('/login', { replace: true })
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid rgba(0, 44, 95, 0.10)',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Dealer Management System
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {isMobile ? (
          <Drawer open={open} onClose={() => setOpen(false)} ModalProps={{ keepMounted: true }}>
            <Box sx={{ width: drawerWidth }}>{drawer}</Box>
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                borderRight: '1px solid rgba(0, 44, 95, 0.10)',
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: 9,
          px: { xs: 2, sm: 3 },
          pb: 4,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}


