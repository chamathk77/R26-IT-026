'use client';

import {
  Card,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { PendingPayment } from '@/lib/api/payments.types';
import { formatDate } from '@/lib/utils/formatDate';
import {
  formatPaymentStatusLabel,
  getPaymentStatusColor,
} from './paymentUi';

interface SubscriptionPaymentsDataTableProps {
  payments: PendingPayment[];
  loading: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (paymentId: string) => void;
  emptyMessage?: string;
}

export default function SubscriptionPaymentsDataTable({
  payments,
  loading,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowClick,
  emptyMessage = 'No subscription payments found.',
}: SubscriptionPaymentsDataTableProps) {
  return (
    <Card
      sx={{
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Shop</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Shop status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Due days</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={36} />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow
                  key={payment._id}
                  hover
                  onClick={() => onRowClick(payment._id)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {payment.shop?.shopName ?? payment.shopId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {payment.shopId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.shopStatus ?? payment.shop?.status ?? '—'}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {payment.subscriptionDueDays ?? payment.shop?.subscriptionDueDays ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell>{payment.receiptNumber || '—'}</TableCell>
                  <TableCell>{payment.subscriptionType ?? '—'}</TableCell>
                  <TableCell>
                    {payment.paymentAmount != null
                      ? `Rs. ${payment.paymentAmount.toLocaleString('en-LK')}`
                      : '—'}
                  </TableCell>
                  <TableCell>{formatDate(payment.submittedDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatPaymentStatusLabel(payment.status)}
                      size="small"
                      color={getPaymentStatusColor(payment.status)}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <ChevronRightIcon fontSize="small" color="action" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_event, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[rowsPerPage]}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
        }
      />
    </Card>
  );
}
