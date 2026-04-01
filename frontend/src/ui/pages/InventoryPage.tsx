import React, { useEffect, useState } from 'react'
import { Box, Chip, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function InventoryPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.inventory.list({ page, size })
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
    { name: 'vin', label: 'VIN', required: true },
    { name: 'make', label: 'Make', required: true, defaultValue: 'Hyundai' },
    { name: 'model', label: 'Model', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'sellingPrice', label: 'Selling Price', type: 'number', required: true },
    { name: 'costPrice', label: 'Cost Price', type: 'number', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'available',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Reserved', value: 'reserved' },
        { label: 'Sold', value: 'sold' },
        { label: 'In Service', value: 'in_service' },
        { label: 'Test Drive', value: 'test_drive' },
      ],
    },
    {
      name: 'conditionType',
      label: 'Condition',
      type: 'select',
      defaultValue: 'new_',
      options: [
        { label: 'New', value: 'new_' },
        { label: 'Used', value: 'used' },
        { label: 'Certified Pre-Owned', value: 'certified_pre_owned' },
      ],
    },
    {
      name: 'fuelType',
      label: 'Fuel Type',
      type: 'select',
      defaultValue: 'petrol',
      options: [
        { label: 'Petrol', value: 'petrol' },
        { label: 'Diesel', value: 'diesel' },
        { label: 'Electric', value: 'electric' },
        { label: 'Hybrid', value: 'hybrid' },
        { label: 'CNG', value: 'cng' },
        { label: 'LPG', value: 'lpg' },
      ],
    },
  ]

  const columns = [
    { id: 'vin', label: 'VIN' },
    { id: 'make', label: 'Make' },
    { id: 'model', label: 'Model' },
    { id: 'year', label: 'Year' },
    { id: 'sellingPrice', label: 'Price (₹)', render: (row: any) => `₹${row.sellingPrice}` },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'available' ? 'success' : row.status === 'sold' ? 'error' : 'default'}
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
            setSelectedItem(row)
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
        title="Vehicle Inventory" 
        actionText="Add Vehicle" 
        onAction={() => {
          setSelectedItem(null)
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
        title={selectedItem ? 'Edit Vehicle' : 'Add Vehicle'}
        fields={formFields}
        initialData={selectedItem}
        onClose={() => {
          setOpenForm(false)
          setSelectedItem(null)
        }}
        onSubmit={async (formData) => {
          const { id, createdAt, updatedAt, dealershipId, ...payload } = formData
          if (selectedItem?.id) {
            await api.inventory.update(selectedItem.id, payload)
          } else {
            await api.inventory.create({ ...payload, dealershipId: 1 })
          }
          loadData()
        }}
      />
    </Box>
  )
}
