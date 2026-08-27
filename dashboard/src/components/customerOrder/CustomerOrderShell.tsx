'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';

/**
 * Standalone mobile-first frame for the public customer pages — deliberately
 * outside the internal DashboardShell (no nav, no auth).
 */
export default function CustomerOrderShell({
  shopName,
  branchName,
  subtitle,
  action,
  children,
}: {
  shopName: string;
  branchName?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: '#f4f6f8',
        pb: 4,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 2.5,
          color: '#fff',
          background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
        }}
      >
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <StorefrontOutlinedIcon sx={{ fontSize: 30, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
                  {shopName || 'Shop'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                  {subtitle || branchName || ''}
                </Typography>
              </Box>
            </Stack>
            {action}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, pt: 2 }}>{children}</Box>
    </Box>
  );
}
