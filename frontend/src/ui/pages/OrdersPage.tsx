import React, { useEffect, useState } from 'react'
import { Box, Chip, IconButton } from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'
import { FormDialog, type FieldConfig } from '../components/FormDialog'

export function OrdersPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [customers, setCustomers] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.orders.list({ page, size })
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
      const [cRes, sRes] = await Promise.all([
        api.customers.list({ size: 100 }),
        api.users.list({ size: 100 }),
      ])
      setCustomers(cRes.content || cRes)
      setStaff(sRes.content || sRes)
    } catch (e) {
      console.error('Failed to load options', e)
    }
  }

  useEffect(() => {
    loadData()
    loadOptions()
  }, [page, size])

  const formFields: FieldConfig[] = [
    { 
      name: 'customerId', 
      label: 'Customer', 
      type: 'select', 
      required: true,
      options: customers.map((c) => ({ label: `${c.firstName} ${c.lastName}`, value: c.id }))
    },
    { 
      name: 'salespersonId', 
      label: 'Manager / Approver', 
      type: 'select', 
      options: staff.map((s) => ({ label: `${s.firstName} ${s.lastName} (${s.role})`, value: s.id }))
    },
    { 
      name: 'itemType', 
      label: 'Item Type', 
      type: 'select', 
      required: true,
      defaultValue: 'vehicle',
      options: [
        { label: 'Vehicle', value: 'vehicle' },
        { label: 'Parts & Accessories', value: 'accessory' },
        { label: 'Insurance', value: 'insurance' },
        { label: 'Warranty', value: 'extended_warranty' },
        { label: 'Fee', value: 'finance_fee' },
        { label: 'Service/Other', value: 'other' },
      ],
    },
    { name: 'description', label: 'Item Description / Notes', required: true },
    { name: 'unitPrice', label: 'Amount (Total)', type: 'number', required: true },
    {
      name: 'status',
      label: 'Order Status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Confirmed / Pending', value: 'confirmed' },
        { label: 'Processing', value: 'processing' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Returned', value: 'returned' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
  ]

  const columns = [
    { id: 'orderNumber', label: 'Order #' },
    { id: 'orderDate', label: 'Date' },
    { id: 'totalAmount', label: 'Total (₹)', render: (row: any) => `₹${row.totalAmount?.toLocaleString() || '0'}` },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'delivered' ? 'success' : row.status === 'cancelled' ? 'error' : 'primary'}
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
            // Pre-populate fields from the first item if editing
            const firstItem = row.items?.[0]
            setSelectedOrder({
              ...row,
              customerId: row.customerId,
              salespersonId: row.managerId || row.salespersonId,
              itemType: firstItem?.itemType || 'vehicle',
              description: firstItem?.description || row.notes,
              unitPrice: firstItem?.unitPrice || row.totalAmount,
              status: row.status
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

  return (
    <Box>
      <PageHeader 
        title="Orders" 
        actionText="New Order" 
        onAction={() => {
          setSelectedOrder(null)
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
        title={selectedOrder ? 'Edit Order' : 'New Order'}
        fields={formFields}
        initialData={selectedOrder}
        onClose={() => {
          setOpenForm(false)
          setSelectedOrder(null)
        }}
        onSubmit={async (formData) => {
          const itemPayload = {
            itemType: formData.itemType || 'fee',
            description: formData.description || 'Order Item',
            unitPrice: Number(formData.unitPrice || 0),
            quantity: 1,
            discount: 0
          }
          
          const payload = {
            customerId: formData.customerId,
            managerId: formData.salespersonId || null,
            taxRate: 0, // Set to 0 so unitPrice directly reflects total amount
            notes: formData.description || '',
            status: formData.status || 'draft',
            items: [itemPayload],
          }
          
          if (selectedOrder?.id) {
            await api.orders.update(selectedOrder.id, payload)
          } else {
            await api.orders.create(payload)
          }
          loadData()
        }}
      />
    </Box>
  )
}
