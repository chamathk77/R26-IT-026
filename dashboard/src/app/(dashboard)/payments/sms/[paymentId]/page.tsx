'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardShell from '@/components/layout/DashboardShell';
import SmsPaymentDetailsView from '@/components/payments/SmsPaymentDetailsView';

export default function SmsPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;

  return (
    <DashboardShell title="SMS payment details" subtitle="Review SMS invoice and shop information">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments/sms')}
        sx={{ mb: 3 }}
      >
        Back to SMS payments
      </Button>

      <SmsPaymentDetailsView paymentId={paymentId} />
    </DashboardShell>
  );
}
