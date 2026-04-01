import React, { useEffect, useState } from 'react'
import { Box, Chip } from '@mui/material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { IconButton } from '@mui/material'

export function UsersPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.users.list({ page, size })
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
  }, [page, size])

  const formFields: FieldConfig[] = [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      defaultValue: 'salesperson',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
        { label: 'Salesperson', value: 'salesperson' },
        { label: 'Technician', value: 'technician' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ]

  const columns = [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'active' ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedUser(row)
              setOpenForm(true)
            }}
            color="primary"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this user?')) {
                await api.users.delete(row.id)
                loadData()
              }
            }}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader 
        title="Staff & Users" 
        actionText="Add User" 
        onAction={() => {
          setSelectedUser(null)
          setOpenForm(true)
        }} 
      />
      <DataTable
        columns={columns}
        data={data}
        totalElements={total}
        page={page}
        rowsPerPage={size}
        loading={loading}
        onPageChange={setPage}
        onRowsPerPageChange={setSize}
      />
      <FormDialog
        open={openForm}
        title={selectedUser ? 'Edit User' : 'Add User'}
        fields={formFields}
        initialData={selectedUser}
        onClose={() => {
          setOpenForm(false)
          setSelectedUser(null)
        }}
        onSubmit={async (formData) => {
          if (selectedUser?.id) {
            await api.users.update(selectedUser.id, formData)
          } else {
            await api.users.create({ ...formData, dealershipId: 1 }) // fallback d-id
          }
          loadData()
        }}
      />
    </Box>
  )
}
