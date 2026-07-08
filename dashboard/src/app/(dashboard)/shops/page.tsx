'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import DashboardShell from '@/components/layout/DashboardShell';

const SHOP_SECTIONS = [
  {
    title: 'Onboarding',
    description: 'View shops that completed onboarding and are waiting for next steps.',
    href: '/shops/onboarding',
    icon: PersonAddAlt1OutlinedIcon,
    gradient: 'linear-gradient(135deg, #00838f 0%, #1565c0 100%)',
  },
] as const;

export default function ShopsHubPage() {
  return (
    <DashboardShell title="Shop" subtitle="Choose a shop management section">
      <Grid container spacing={3}>
        {SHOP_SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <Grid key={section.href} size={{ xs: 12, md: 6 }}>
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
