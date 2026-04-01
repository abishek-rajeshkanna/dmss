import React, { useEffect, useState } from 'react'
import { Box, Chip, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function TestDrivesPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedDrive, setSelectedDrive] = useState<any>(null)

  const [customers, setCustomers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.testDrives.list({ page, size })
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
      const [cRes, iRes, sRes] = await Promise.all([
        api.customers.list({ size: 100 }),
        api.inventory.list({ size: 100 }),
        api.users.list({ size: 100 }),
      ])
      setCustomers(cRes.content || cRes)
      setInventory(iRes.content || iRes)
      setStaff(sRes.content || sRes)
    } catch (e) {
      console.error('Failed to load options', e)
    }
  }

  useEffect(() => {
    loadData()
    loadOptions()
  }, [page, size])

  const columns = [
    { id: 'scheduledAt', label: 'Scheduled Time' },
    { 
      id: 'customerName', 
      label: 'Customer', 
      render: (row: any) => {
        if (row.customer) return `${row.customer.firstName || ''} ${row.customer.lastName || ''}`.trim();
        const c = customers.find(c => c.id === row.customerId);
        return c ? `${c.firstName} ${c.lastName}` : (row.customerId ? `ID: ${row.customerId}` : 'Unknown');
      }
    },
    { 
      id: 'vehicle', 
      label: 'Vehicle', 
      render: (row: any) => {
        if (row.inventory) return row.inventory.model;
        const v = inventory.find(v => v.id === row.inventoryId);
        return v ? `${v.year} ${v.make} ${v.model}` : (row.inventoryId ? `ID: ${row.inventoryId}` : 'Unknown');
      }
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'completed' ? 'success' : 'default'}
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
            setSelectedDrive({
              ...row,
              customerId: row.customer?.id || row.customerId,
              inventoryId: row.inventory?.id || row.inventoryId,
              staffId: row.staff?.id || row.staffId
            })
            setOpenForm(true)
          }}
          color="primary"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  const formFields: FieldConfig[] = [
    {
      name: 'customerId',
      label: 'Customer',
      type: 'select',
      required: true,
      options: customers.map((c) => ({ label: `${c.firstName} ${c.lastName}`, value: c.id })),
    },
    {
      name: 'inventoryId',
      label: 'Vehicle',
      type: 'select',
      required: true,
      options: inventory.map((v) => ({ label: `${v.year} ${v.make} ${v.model} (${v.vin})`, value: v.id })),
    },
    {
      name: 'staffId',
      label: 'Staff Member',
      type: 'select',
      required: true,
      options: staff.map((s) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
    },
    {
      name: 'scheduledAt',
      label: 'Scheduled At',
      type: 'datetime-local',
      required: true,
    },
    {
      name: 'status',
      label: 'Test Drive Status',
      type: 'select',
      defaultValue: 'scheduled',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'In Progress', value: 'ongoing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    { name: 'notes', label: 'Notes' },
    { name: 'odometerBefore', label: 'Odometer Before', type: 'number' },
  ]

  return (
    <Box>
      <PageHeader 
        title="Test Drives" 
        actionText="Schedule Test Drive" 
        onAction={() => {
          setSelectedDrive(null)
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
        title={selectedDrive ? 'Edit Test Drive' : 'Schedule Test Drive'}
        fields={formFields}
        initialData={selectedDrive}
        onClose={() => {
          setOpenForm(false)
          setSelectedDrive(null)
        }}
        onSubmit={async (formData) => {
          const { id, customer, inventory, staff, createdAt, updatedAt, dealershipId, ...payload } = formData
          if (selectedDrive?.id) {
            await api.testDrives.update(selectedDrive.id, payload)
          } else {
            await api.testDrives.create(payload)
          }
          loadData()
        }}
      />
    </Box>
  )
}
