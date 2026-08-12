'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { getLoginErrorMessage, logoutRequest } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/auth/authStore';
import { DashboardMobileNav, DashboardSidebar, SIDEBAR_WIDTH } from './DashboardNav';

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } catch (error) {
      console.error(getLoginErrorMessage(error));
    } finally {
      clearAuth();
      router.replace('/login');
      setLoggingOut(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardSidebar />

      <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'rgba(244, 246, 248, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 3 }, py: 1.5, minHeight: { xs: 64, md: 72 }, gap: 2 }}>
            <Box sx={{ display: { md: 'none' } }}>
              <DashboardMobileNav />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title ?? 'SmartCost Dashboard'}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>

            {user ? (
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {getInitials(user.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                    {user.name}
                  </Typography>
                  <Chip label={user.role} size="small" sx={{ mt: 0.25, height: 20, fontSize: '0.68rem' }} />
                </Box>
              </Box>
            ) : null}

            <IconButton
              aria-label="Log out"
              onClick={handleLogout}
              disabled={loggingOut}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'error.contrastText',
                  borderColor: 'error.light',
                },
              }}
            >
              <LogoutOutlinedIcon fontSize="small" />
            </IconButton>
          </Toolbar>
        </Box>

        <Box
          sx={{
            flex: 1,
            px: { xs: 2, md: 3 },
            py: { xs: 2.5, md: 3 },
            width: '100%',
            maxWidth: { md: `calc(100vw - ${SIDEBAR_WIDTH}px)` },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
