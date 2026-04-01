import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material'

export type FieldConfig = {
  name: string
  label: string
  type?: 'text' | 'number' | 'select' | 'email' | 'password' | 'datetime-local' | 'date' | 'time'
  options?: { label: string; value: string | number | boolean }[]
  required?: boolean
  defaultValue?: any
}

export interface FormDialogProps {
  open: boolean
  title: string
  fields: FieldConfig[]
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  initialData?: any
}

export function FormDialog({ open, title, fields, onClose, onSubmit, initialData }: FormDialogProps) {
  const [data, setData] = useState<any>(initialData || {})
  const [loading, setLoading] = useState(false)

  // Reset internal state when dialog opens with new initialData
  React.useEffect(() => {
    if (open) {
      const defaultState = fields.reduce((acc, f) => {
        if (f.defaultValue !== undefined) acc[f.name] = f.defaultValue
        return acc
      }, {} as any)
      setData({ ...defaultState, ...(initialData || {}) })
    }
  }, [open, initialData, fields])

  const handleChange = (name: string, value: any) => {
    setData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error submitting form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {fields.map((f) => {
              const val = data[f.name] ?? f.defaultValue ?? ''

              if (f.type === 'select') {
                return (
                  <TextField
                    key={f.name}
                    select
                    label={f.label}
                    value={val}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={f.required}
                    fullWidth
                  >
                    {f.options?.map((opt) => (
                      <MenuItem key={String(opt.value)} value={opt.value as any}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )
              }

              return (
                <TextField
                  key={f.name}
                  label={f.label}
                  type={f.type || 'text'}
                  value={val}
                  onChange={(e) => handleChange(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  required={f.required}
                  fullWidth
                  InputLabelProps={['date', 'datetime-local', 'time'].includes(f.type as string) ? { shrink: true } : undefined}
                />
              )
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
