'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardShell from '@/components/layout/DashboardShell';
import PaymentDetailsView from '@/components/payments/PaymentDetailsView';

export default function OnboardingPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;

  return (
    <DashboardShell title="Onboarding payment details" subtitle="Review receipt and shop information">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/payments/onboarding')}
        sx={{ mb: 3 }}
      >
        Back to onboarding payments
      </Button>

      <PaymentDetailsView paymentId={paymentId} showOnboardingActions />
    </DashboardShell>
  );
}
