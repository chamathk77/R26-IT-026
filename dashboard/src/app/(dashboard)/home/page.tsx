'use client';

import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/authStore';
import DashboardShell from '@/components/layout/DashboardShell';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardShell title="Home" subtitle="Your dashboard overview">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
              color: '#fff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2 }}>
                Welcome back
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, mb: 1 }}>
                {user?.name ?? 'Team member'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                Manage shop payments, subscriptions, and internal operations from one place.
              </Typography>
              <Chip
                label={user?.role ?? 'internal'}
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <DashboardIcon color="primary" />
                <Typography variant="h6">Account</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Email
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                {user?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Phone
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {user?.phone ?? '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            component={Link}
            href="/payments"
            sx={{
              textDecoration: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PaymentsIcon color="secondary" />
                <Typography variant="h6" color="text.primary">
                  Payments
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Review onboarding and subscription payment receipts.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            component={Link}
            href="/shops/onboarding"
            sx={{
              textDecoration: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StorefrontOutlinedIcon color="primary" />
                <Typography variant="h6" color="text.primary">
                  Shop onboarding
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View shops that completed onboarding and payment status.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardShell>
  );
}
