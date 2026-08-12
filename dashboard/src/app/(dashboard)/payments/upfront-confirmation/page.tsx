'use client';

import Link from 'next/link';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardShell from '@/components/layout/DashboardShell';
import ManualPaymentConfirmationPanel from '@/components/payments/ManualPaymentConfirmationPanel';

export default function UpfrontPaymentConfirmationPage() {
  return (
    <DashboardShell
      title="Manual payment confirmation"
      subtitle="Record upfront payments received manually and generate printable receipts"
    >
      <Button
        component={Link}
        href="/payments"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Back to payments
      </Button>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            How to use this
          </Typography>
          <Typography variant="body2">
            1. Customer pays you manually (cash or bank transfer outside the app).
          </Typography>
          <Typography variant="body2">
            2. Enter product name, shop name, address, phone number, amount, and payment method.
          </Typography>
          <Typography variant="body2">
            3. Click Generate & download PDF to save the confirmation receipt.
          </Typography>
          <Typography variant="body2">
            4. Share or print the PDF with the customer for their records.
          </Typography>
        </Stack>
      </Alert>

      <Box sx={{ maxWidth: 960 }}>
        <ManualPaymentConfirmationPanel />
      </Box>
    </DashboardShell>
  );
}
