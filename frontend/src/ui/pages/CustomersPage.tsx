import React, { useEffect, useState } from 'react'
import { Box, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function CustomersPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [staff, setStaff] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.customers.list({ page, size })
      setData(res.content || res)
      setTotal(res.totalElements || res.length || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadOptions = async () => {
    try {
      const sRes = await api.users.list({ size: 100 })
      setStaff(sRes.content || sRes)
    } catch (e) {
      console.error('Failed to load staff options', e)
    }
  }

  useEffect(() => {
    loadData()
    loadOptions()
  }, [page, size])

  const formFields: FieldConfig[] = [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', required: true },
    {
      name: 'assignedToId',
      label: 'Assigned Salesperson',
      type: 'select',
      options: staff.map((s) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'lead',
      options: [
        { label: 'Lead', value: 'lead' },
        { label: 'Prospect', value: 'prospect' },
        { label: 'Customer', value: 'customer' },
        { label: 'Lost', value: 'lost' },
      ],
    },
    {
      name: 'source',
      label: 'Source',
      type: 'select',
      defaultValue: 'walk_in',
      options: [
        { label: 'Walk In', value: 'walk_in' },
        { label: 'Referral', value: 'referral' },
        { label: 'Online', value: 'online' },
      ],
    },
  ]

  const columns = [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'status', label: 'Lead Status' },
    {
      id: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={() => {
            setSelectedCustomer(row)
            setOpenForm(true)
          }}
          color="primary"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader 
        title="Customers" 
        actionText="Add Customer" 
        onAction={() => {
          setSelectedCustomer(null)
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
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        fields={formFields}
        initialData={selectedCustomer}
        onClose={() => {
          setOpenForm(false)
          setSelectedCustomer(null)
        }}
        onSubmit={async (formData) => {
          const { id, createdAt, updatedAt, dealershipId, salesperson, ...payload } = formData
          if (selectedCustomer?.id) {
            await api.customers.update(selectedCustomer.id, payload)
          } else {
            await api.customers.create({ ...payload, dealershipId: 1 })
          }
          loadData()
        }}
      />
    </Box>
  )
}
