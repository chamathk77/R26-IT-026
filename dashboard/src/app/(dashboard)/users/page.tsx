'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import { fetchDashboardUsers } from '@/lib/api/users';
import type {
  DashboardUsersListPermissions,
  ManagedDashboardUser,
} from '@/lib/api/users.types';
import { isDashboardAdmin } from '@/lib/auth/types';
import { useAuthStore } from '@/lib/auth/authStore';

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

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function roleColor(role: string): 'primary' | 'default' {
  return role === 'admin' || role === 'internalAdmin' ? 'primary' : 'default';
}

function userInitials(user: ManagedDashboardUser): string {
  return (user.name || user.email || 'U').slice(0, 2).toUpperCase();
}

export default function UsersPage() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<ManagedDashboardUser[]>([]);
  const [permissions, setPermissions] = useState<DashboardUsersListPermissions>({
    canCreate: false,
    canDelete: false,
    canEditAll: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    permissions.canCreate || isDashboardAdmin(authUser?.role);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardUsers();
      setUsers(data.users ?? []);
      setPermissions(
        data.permissions ?? {
          canCreate: false,
          canDelete: false,
          canEditAll: false,
        },
      );
    } catch (err) {
      setUsers([]);
      setError(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;
    const active = users.filter((u) => u.isActive).length;
    return { total: users.length, admins, staff, active };
  }, [users]);

  return (
    <DashboardShell title="Users" subtitle="Dashboard team accounts">
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <GroupOutlinedIcon color="primary" />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {stats.total} user{stats.total === 1 ? '' : 's'} · {stats.admins} admin ·{' '}
            {stats.staff} staff · {stats.active} active
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => void loadUsers()}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          {canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/users/new')}
              sx={{
                fontWeight: 800,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                boxShadow: '0 10px 24px rgba(21, 101, 192, 0.25)',
              }}
            >
              Create user
            </Button>
          ) : null}
        </Stack>
      </Box>

      {!canCreate ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          You can view all users and edit your own profile. Only admins can create or delete
          users.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          overflow: 'hidden',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No dashboard users found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelf = authUser?._id === user._id;
                  return (
                    <TableRow
                      key={user._id}
                      hover
                      onClick={() => router.push(`/users/${encodeURIComponent(user._id)}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              fontWeight: 800,
                              bgcolor: roleColor(user.role) === 'primary' ? 'primary.main' : 'grey.500',
                            }}
                          >
                            {userInitials(user)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {user.name}
                              {isSelf ? (
                                <Chip
                                  label="You"
                                  size="small"
                                  sx={{ ml: 1, height: 20, fontWeight: 700 }}
                                />
                              ) : null}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{user.phone || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={roleColor(user.role)}
                          sx={{ fontWeight: 700, textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <ChevronRightIcon color="action" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </DashboardShell>
  );
}
