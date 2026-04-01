import React, { useEffect, useState } from 'react'
import { Box, Chip } from '@mui/material'
import { api } from '../../api/api'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/PageHeader'

export function PaymentsPage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.payments.list({ page, size })
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

  const columns = [
    { id: 'transactionRef', label: 'Transaction ID' },
    { id: 'orderId', label: 'Order ID' },
    { id: 'amount', label: 'Amount (₹)' },
    { id: 'method', label: 'Method' },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <Chip
          label={row.status}
          color={row.status === 'completed' ? 'success' : row.status === 'failed' ? 'error' : 'default'}
          size="small"
        />
      ),
    },
  ]

  return (
    <Box>
      <PageHeader title="Payments" />
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
    </Box>
  )
}
