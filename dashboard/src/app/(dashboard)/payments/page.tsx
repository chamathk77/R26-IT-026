'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import DashboardShell from '@/components/layout/DashboardShell';

const PAYMENT_SECTIONS = [
  {
    title: 'Onboarding',
    description: 'Review upfront and subscription payments created during shop onboarding.',
    href: '/payments/onboarding',
    icon: PersonAddAlt1OutlinedIcon,
    gradient: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
  },
  {
    title: 'Subscription',
    description: 'Review pending subscription payment receipts from active shops.',
    href: '/payments/subscription',
    icon: AutorenewOutlinedIcon,
    gradient: 'linear-gradient(135deg, #6a1b9a 0%, #283593 100%)',
  },
  {
    title: 'SMS',
    description: 'Review SMS package billing invoices and uploaded payment receipts.',
    href: '/payments/sms',
    icon: SmsOutlinedIcon,
    gradient: 'linear-gradient(135deg, #00695c 0%, #2e7d32 100%)',
  },
] as const;

export default function PaymentsHubPage() {
  return (
    <DashboardShell title="Payments" subtitle="Choose a payment category to review">
      <Grid container spacing={3}>
        {PAYMENT_SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <Grid key={section.href} size={{ xs: 12, md: 4 }}>
              <Card
                component={Link}
                href={section.href}
                sx={{
                  height: '100%',
                  textDecoration: 'none',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 8,
                  },
                }}
              >
                <Box sx={{ height: 6, background: section.gradient }} />
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      background: section.gradient,
                      color: '#fff',
                    }}
                  >
                    <Icon />
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, minHeight: 44 }}>
                    {section.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Open {section.title.toLowerCase()}
                    </Typography>
                    <ArrowForwardIcon fontSize="small" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </DashboardShell>
  );
}
