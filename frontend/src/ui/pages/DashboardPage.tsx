import React, { useEffect, useState } from 'react'
import { Box, Card, CardContent, Grid, Typography, CircularProgress } from '@mui/material'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptIcon from '@mui/icons-material/Receipt'
import HandymanIcon from '@mui/icons-material/Handyman'
import PaymentsIcon from '@mui/icons-material/Payments'
import { api } from '../../api/api'

export function DashboardPage() {
  const [statsData, setStatsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.dashboard.getStats()
        setStatsData(data)
      } catch (e) {
        console.error('Failed to load dashboard stats', e)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  const statCards = [
    { 
      title: 'Total Inventory', 
      value: statsData?.inventoryCount || 0, 
      icon: <DirectionsCarIcon fontSize="large" color="primary" /> 
    },
    { 
      title: 'Customers', 
      value: statsData?.customerCount || 0, 
      icon: <PeopleIcon fontSize="large" color="primary" /> 
    },
    { 
      title: 'Pending Orders', 
      value: statsData?.pendingOrdersCount || 0, 
      icon: <ReceiptIcon fontSize="large" color="primary" /> 
    },
    { 
      title: 'Active Repairs', 
      value: statsData?.activeServiceTicketsCount || 0, 
      icon: <HandymanIcon fontSize="large" color="primary" /> 
    },
    { 
      title: "Today's Sales", 
      value: `₹${statsData?.todaySales?.toLocaleString() || '0'}`, 
      icon: <PaymentsIcon fontSize="large" color="success" /> 
    },
  ]

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: 'primary.main' }}>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {statCards.map((s, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card sx={{ display: 'flex', alignItems: 'center', p: 1, borderRadius: 3, transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
              <Box sx={{ p: 2, mr: 1, bgcolor: 'rgba(0,44,95,0.05)', borderRadius: 2 }}>
                {s.icon}
              </Box>
              <CardContent sx={{ flex: '1 0 auto', p: 1, pb: '8px !important' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {s.title}
                </Typography>
                <Typography component="div" variant="h5" fontWeight="800">
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
