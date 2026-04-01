import React, { useEffect, useState } from 'react'
import { Box, Chip, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function ServiceTicketsPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  const [customers, setCustomers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.serviceTickets.list({ page, size })
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
    { id: 'ticketNumber', label: 'Ticket #' },
    { id: 'serviceType', label: 'Type', render: (row: any) => row.serviceType?.toUpperCase() || '' },
    { id: 'priority', label: 'Priority', render: (row: any) => row.priority?.toUpperCase() || '' },
    { id: 'totalCost', label: 'Total Value', render: (row: any) => `₹${row.totalCost?.toLocaleString() || '0'}` },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'completed' || row.status === 'delivered' ? 'success' : 'warning'}
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
            setSelectedTicket({
              ...row,
              customerId: row.customer?.id || row.customerId,
              inventoryId: row.inventory?.id || row.inventoryId,
              assignedTo: row.assignedTo?.id || row.assignedToId
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
      name: 'assignedTo',
      label: 'Assign To (Technician)',
      type: 'select',
      options: staff.map((s) => ({ label: `${s.firstName} ${s.lastName} (${s.role})`, value: s.id })),
    },
    {
      name: 'serviceType',
      label: 'Service Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Routine Maintenance', value: 'routine' },
        { label: 'Repair', value: 'repair' },
        { label: 'Warranty', value: 'warranty' },
        { label: 'Recall', value: 'recall' },
        { label: 'Inspection', value: 'inspection' },
        { label: 'Body Work', value: 'body_work' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' },
      ],
      defaultValue: 'medium',
    },
    {
      name: 'status',
      label: 'Ticket Status',
      type: 'select',
      defaultValue: 'received',
      options: [
        { label: 'Received', value: 'received' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    { name: 'complaint', label: 'Complaint / Description', required: true },
    { name: 'notes', label: 'Internal Notes' },
  ]

  return (
    <Box>
      <PageHeader 
        title="Service & Repairs" 
        actionText="New Ticket" 
        onAction={() => {
          setSelectedTicket(null)
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
        title={selectedTicket ? 'Edit Service Ticket' : 'Create Service Ticket'}
        fields={formFields}
        initialData={selectedTicket}
        onClose={() => {
          setOpenForm(false)
          setSelectedTicket(null)
        }}
        onSubmit={async (formData) => {
          const { id, ticketNumber, createdAt, updatedAt, dealershipId, customer, inventory, assignedTo: oldAssignedTo, ...payload } = formData
          const finalPayload = {
            ...payload,
            assignedTo: formData.assignedTo?.id || formData.assignedTo || null
          }
          if (selectedTicket?.id) {
            await api.serviceTickets.update(selectedTicket.id, finalPayload)
          } else {
            await api.serviceTickets.create(finalPayload)
          }
          loadData()
        }}
      />
    </Box>
  )
}
