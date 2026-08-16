'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import {
  createManualPaymentConfirmation,
  fetchManualPaymentConfirmations,
  getPaymentActionErrorMessage,
} from '@/lib/api/payments';
import type { ManualPaymentConfirmation } from '@/lib/api/payments.types';
import { generateManualPaymentConfirmationPdf } from '@/lib/pdf/generateManualPaymentConfirmationPdf';
import { formatDate } from '@/lib/utils/formatDate';
import ManualPaymentConfirmationSlip from './ManualPaymentConfirmationSlip';
import { formatPaymentAmount } from './paymentUi';

type FormState = {
  productName: string;
  shopName: string;
  address: string;
  shopMobileNumber: string;
  paymentAmount: string;
  paymentMethod: string;
  paymentReceivedDate: string;
  description: string;
  notes: string;
};

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPTY_FORM: FormState = {
  productName: 'Smart Cost POS - Upfront Setup',
  shopName: '',
  address: '',
  shopMobileNumber: '',
  paymentAmount: '',
  paymentMethod: 'Bank Transfer',
  paymentReceivedDate: todayInputValue(),
  description: 'Manual upfront payment received',
  notes: '',
};

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Manual'] as const;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ManualPaymentConfirmationPanel() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ManualPaymentConfirmation | null>(null);
  const [history, setHistory] = useState<ManualPaymentConfirmation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchManualPaymentConfirmations({ page: 1, limit: 20 });
      setHistory(data.confirmations);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load recent confirmations'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setGenerated(null);
    setSuccess(null);
  };

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    return (
      form.productName.trim() !== '' &&
      form.shopName.trim() !== '' &&
      form.address.trim() !== '' &&
      form.shopMobileNumber.trim() !== '' &&
      form.paymentAmount.trim() !== '' &&
      form.paymentReceivedDate.trim() !== ''
    );
  }, [submitting, form]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, paymentReceivedDate: todayInputValue() });
    setGenerated(null);
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const paymentAmount = Number(form.paymentAmount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await createManualPaymentConfirmation({
        productName: form.productName.trim(),
        shopName: form.shopName.trim(),
        address: form.address.trim(),
        shopMobileNumber: form.shopMobileNumber.trim(),
        paymentAmount,
        paymentMethod: form.paymentMethod,
        paymentReceivedDate: form.paymentReceivedDate,
        description: form.description.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setGenerated(response.confirmation);
      setSuccess(`${response.message}. PDF downloaded.`);
      generateManualPaymentConfirmationPdf(response.confirmation);
      await loadHistory();
    } catch (err) {
      setError(getPaymentActionErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistoryItem = (item: ManualPaymentConfirmation) => {
    setGenerated(item);
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Manual payment confirmation
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.92 }}>
                Enter product and customer shop details after manual payment, then generate a
                printable confirmation and PDF receipt.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          ) : null}

          {success ? (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {success}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Product name"
                  value={form.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                  disabled={submitting}
                  placeholder="Smart Cost POS - Upfront Setup"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel id="payment-method-label">Payment method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    label="Payment method"
                    value={form.paymentMethod}
                    onChange={(e) => updateField('paymentMethod', e.target.value)}
                    disabled={submitting}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Shop name"
                  value={form.shopName}
                  onChange={(e) => updateField('shopName', e.target.value)}
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Phone number"
                  value={form.shopMobileNumber}
                  onChange={(e) => updateField('shopMobileNumber', e.target.value)}
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  disabled={submitting}
                  multiline
                  minRows={2}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Amount received (Rs.)"
                  value={form.paymentAmount}
                  onChange={(e) => updateField('paymentAmount', e.target.value)}
                  disabled={submitting}
                  slotProps={{ htmlInput: { min: 1, step: '0.01' } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Payment received date"
                  value={form.paymentReceivedDate}
                  onChange={(e) => updateField('paymentReceivedDate', e.target.value)}
                  disabled={submitting}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Description (optional)"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  disabled={submitting}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Internal notes (optional)"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  disabled={submitting}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
              <Button onClick={resetForm} disabled={submitting}>
                Clear
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!canSubmit}
                startIcon={
                  submitting ? <CircularProgress size={16} color="inherit" /> : undefined
                }
                sx={{
                  fontWeight: 800,
                  borderRadius: 2.5,
                  px: 3,
                  background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                }}
              >
                {submitting ? 'Generating…' : 'Generate & download PDF'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {generated ? <ManualPaymentConfirmationSlip confirmation={generated} /> : null}

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Recent manual confirmations
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => void loadHistory()}
              disabled={historyLoading}
            >
              Refresh
            </Button>
          </Stack>

          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No manual confirmations generated yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{item.receiptNumber}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.shopName}</TableCell>
                      <TableCell>{item.shopMobileNumber}</TableCell>
                      <TableCell>{formatPaymentAmount(item.paymentAmount)}</TableCell>
                      <TableCell>{formatDate(item.paymentReceivedDate)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={() => handleViewHistoryItem(item)}>
                            View
                          </Button>
                          <Button
                            size="small"
                            onClick={() => generateManualPaymentConfirmationPdf(item)}
                          >
                            PDF
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
