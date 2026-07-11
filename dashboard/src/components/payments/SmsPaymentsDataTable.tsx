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
import type { SmsPaymentListItem } from '@/lib/api/payments.types';
import { formatDate } from '@/lib/utils/formatDate';
import { formatPaymentStatusLabel, getPaymentStatusColor } from './paymentUi';

const SMS_OVERDUE_THRESHOLD = 14;

function isSmsOverduePending(payment: SmsPaymentListItem): boolean {
  const smsStatus = payment.shop?.smsFeatureStatus ?? null;
  const dueDays = Number(payment.shop?.smsDueDays ?? 0);
  return smsStatus === 'pending' && dueDays > SMS_OVERDUE_THRESHOLD;
}

interface SmsPaymentsDataTableProps {
  payments: SmsPaymentListItem[];
  loading: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (paymentId: string) => void;
  emptyMessage?: string;
}

export default function SmsPaymentsDataTable({
  payments,
  loading,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowClick,
  emptyMessage = 'No SMS payments found.',
}: SmsPaymentsDataTableProps) {
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
              <TableCell sx={{ fontWeight: 700 }}>SMS status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Due days</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Package</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Billing month</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={36} />
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const overduePending = isSmsOverduePending(payment);
                const dueDays = payment.shop?.smsDueDays ?? 0;

                return (
                <TableRow
                  key={payment._id}
                  hover
                  onClick={() => onRowClick(payment._id)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    ...(overduePending
                      ? {
                          bgcolor: '#fef2f2',
                          borderLeft: '4px solid',
                          borderLeftColor: '#dc2626',
                          '&:hover': {
                            bgcolor: '#fee2e2',
                          },
                          '& td': {
                            borderBottomColor: '#fecaca',
                          },
                        }
                      : {}),
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {payment.shop?.shopName ?? payment.shopId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {payment.shopId}
                    </Typography>
                    {overduePending ? (
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mt: 0.5, color: 'error.main', fontWeight: 700 }}
                      >
                        Overdue — settle payment
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.shop?.smsFeatureStatus ?? '—'}
                      size="small"
                      color={overduePending ? 'error' : 'default'}
                      variant={overduePending ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: overduePending ? 'error.main' : 'text.primary',
                      }}
                    >
                      {dueDays}
                    </Typography>
                  </TableCell>
                  <TableCell>{payment.shop?.smsPackageType ?? '—'}</TableCell>
                  <TableCell>{payment.receiptNumber || '—'}</TableCell>
                  <TableCell>
                    {payment.paymentAmount != null
                      ? `Rs. ${payment.paymentAmount.toLocaleString('en-LK')}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMonth
                      ? payment.paymentMonth.charAt(0).toUpperCase() +
                        payment.paymentMonth.slice(1)
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
                );
              })
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
