import React, { useEffect, useState } from 'react'
import { Box, Chip, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function DealershipsPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedDealership, setSelectedDealership] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.dealerships.list({ page, size })
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
    { name: 'name', label: 'Dealership Name', required: true },
    { name: 'address', label: 'Address', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'state', label: 'State', required: true },
    { name: 'zipCode', label: 'Zip Code', required: true },
    { name: 'phone', label: 'Phone Number', required: true },
    { name: 'email', label: 'Contact Email', type: 'email' },
    { name: 'website', label: 'Website URL' },
    {
      name: 'isActive',
      label: 'Status',
      type: 'select',
      defaultValue: true,
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
    },
  ]

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'city', label: 'City' },
    { id: 'state', label: 'State' },
    { id: 'phone', label: 'Phone' },
    {
      id: 'isActive',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.isActive ? 'Active' : 'Inactive'}
          color={row.isActive ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <IconButton
          size="small"
          onClick={() => {
            setSelectedDealership(row)
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
        title="Dealerships" 
        actionText="Add Location" 
        onAction={() => {
          setSelectedDealership(null)
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
        title={selectedDealership ? 'Edit Dealership' : 'Add Dealership Location'}
        fields={formFields}
        initialData={selectedDealership}
        onClose={() => {
          setOpenForm(false)
          setSelectedDealership(null)
        }}
        onSubmit={async (formData) => {
          const { id, createdAt, updatedAt, ...payload } = formData
          if (selectedDealership?.id) {
            await api.dealerships.update(selectedDealership.id, payload)
          } else {
            await api.dealerships.create(payload)
          }
          loadData()
        }}
      />
    </Box>
  )
}
