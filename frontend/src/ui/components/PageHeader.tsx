import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

export interface PageHeaderProps {
  title: string
  actionText?: string
  onAction?: () => void
}

export function PageHeader({ title, actionText, onAction }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
        {title}
      </Typography>
      {actionText && onAction && (
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Box>
  )
}
