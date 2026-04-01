import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  IconButton,
  Divider,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { api } from '../../api/api'

export function NotificationsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const size = 20

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.notifications.list({ page, size })
      setData(res.content || res)
      setTotal(res.totalElements || res.length || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page])

  const markAsRead = async (id: number) => {
    try {
      await api.notifications.update(id, { isRead: true })
      setData((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (e) {
      console.error('Failed to mark as read', e)
    }
  }

  const markAllAsRead = async () => {
    const unread = data.filter((n) => !n.isRead)
    for (const n of unread) {
      await markAsRead(n.id)
    }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
            Notifications
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Stay updated on activities across your dealership.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={markAllAsRead}
            disabled={loading || data.every((n) => n.isRead)}
          >
            Mark all read
          </Button>
        </Stack>
      </Box>

      {loading && data.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 44, 95, 0.08)' }}>
          <List disablePadding>
            {data.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <NotificationsActiveIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                <Typography>You have no new notifications.</Typography>
              </Box>
            ) : (
              data.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    sx={{
                      p: 2.5,
                      bgcolor: item.isRead ? 'transparent' : 'rgba(0, 44, 95, 0.02)',
                      transition: 'background-color 0.2s',
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => markAsRead(item.id)}
                        disabled={item.isRead}
                        color={item.isRead ? 'default' : 'primary'}
                        title={item.isRead ? 'Already read' : 'Mark as read'}
                      >
                        {item.isRead ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
                      </IconButton>
                    }
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: item.isRead ? 'transparent' : 'primary.main',
                        mr: 2,
                        mt: 1.5,
                        alignSelf: 'flex-start',
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: item.isRead ? 500 : 700 }}>
                            {item.title}
                          </Typography>
                          <Chip
                            label={item.type || 'Alert'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              bgcolor: 'rgba(0, 44, 95, 0.08)',
                              color: 'primary.main',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {item.body}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(item.createdAt).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < data.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))
            )}
          </List>
        </Card>
      )}

      {total > size && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {data.length} of {total}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              disabled={(page + 1) * size >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

