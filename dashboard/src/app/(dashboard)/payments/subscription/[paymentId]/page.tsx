'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardShell from '@/components/layout/DashboardShell';
import SubscriptionPaymentDetailsView from '@/components/payments/SubscriptionPaymentDetailsView';

export default function SubscriptionPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;

  return (
    <DashboardShell title="Subscription payment details" subtitle="Review receipt and shop information">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments/subscription')}
        sx={{ mb: 3 }}
      >
        Back to subscription payments
      </Button>

      <SubscriptionPaymentDetailsView paymentId={paymentId} />
    </DashboardShell>
  );
}
