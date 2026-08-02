'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import {
  deleteDashboardUser,
  fetchDashboardUserDetails,
  updateDashboardUser,
} from '@/lib/api/users';
import type {
  DashboardRole,
  DashboardUserDetailsPermissions,
  ManagedDashboardUser,
} from '@/lib/api/users.types';
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params.userId ? decodeURIComponent(params.userId) : '';
  const authUser = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [user, setUser] = useState<ManagedDashboardUser | null>(null);
  const [permissions, setPermissions] = useState<DashboardUserDetailsPermissions>({
    canEdit: false,
    canDelete: false,
    canEditRole: false,
    canEditActive: false,
    isSelf: false,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<DashboardRole>('staff');
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardUserDetails(userId);
      setUser(data.user);
      setPermissions(data.permissions);
      setName(data.user.name ?? '');
      setEmail(data.user.email ?? '');
      setPhone(data.user.phone ?? '');
      setRole((data.user.role as DashboardRole) || 'staff');
      setNote(data.user.note ?? '');
      setIsActive(data.user.isActive !== false);
      setPassword('');
    } catch (err) {
      setUser(null);
      setError(getApiErrorMessage(err, 'Failed to load user details'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      name.trim() !== (user.name ?? '') ||
      email.trim().toLowerCase() !== (user.email ?? '') ||
      phone.trim() !== (user.phone ?? '') ||
      role !== user.role ||
      note.trim() !== (user.note ?? '').trim() ||
      isActive !== (user.isActive !== false) ||
      password.trim() !== ''
    );
  }, [user, name, email, phone, role, note, isActive, password]);

  const canSave =
    permissions.canEdit &&
    dirty &&
    !saving &&
    !deleting &&
    name.trim() &&
    email.trim() &&
    phone.trim();

  const handleUpdate = async () => {
    if (!userId || !canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        note: note.trim(),
      };

      if (permissions.canEditRole) {
        payload.role = role;
      }
      if (permissions.canEditActive) {
        payload.isActive = isActive;
      }
      if (password.trim()) {
        payload.password = password.trim();
      }

      const result = await updateDashboardUser(userId, payload);
      setUser(result.user);
      setPermissions(result.permissions);
      setPassword('');
      setSuccess(result.message || 'User updated successfully');

      if (result.permissions.isSelf && token && authUser) {
        setAuth(
          token,
          {
            ...authUser,
            name: result.user.name,
            email: result.user.email,
            phone: result.user.phone,
            role: result.user.role as typeof authUser.role,
            note: result.user.note,
          },
          7 * 24 * 60 * 60,
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !permissions.canDelete) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteDashboardUser(userId);
      setConfirmDeleteOpen(false);
      router.push('/users');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete user'));
      setDeleting(false);
    }
  };

  return (
    <DashboardShell title="User details" subtitle={user?.email || userId || '—'}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/users')} sx={{ mb: 3 }}>
        Back to users
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      ) : null}

      {!loading && user ? (
        <Card
          sx={{
            maxWidth: 880,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              p: 3,
              background:
                user.role === 'admin'
                  ? 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)'
                  : 'linear-gradient(135deg, #455a64 0%, #607d8b 100%)',
              color: '#fff',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <PersonOutlineOutlinedIcon sx={{ fontSize: 36 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {user.name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {user.email}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {permissions.isSelf ? (
                  <Chip
                    label="You"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  />
                ) : null}
                <Chip
                  label={user.role}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                  }}
                />
              </Stack>
            </Stack>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {!permissions.canEdit ? (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                You can view this user, but only admins can edit other accounts. Staff may edit
                their own profile only.
              </Alert>
            ) : null}

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!permissions.canEdit || saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!permissions.canEdit || saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!permissions.canEdit || saving || deleting}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!permissions.canEditRole || saving || deleting}>
                  <InputLabel id="edit-user-role-label">Role</InputLabel>
                  <Select
                    labelId="edit-user-role-label"
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as DashboardRole)}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!permissions.canEdit || saving || deleting}
                  helperText={
                    permissions.canEdit
                      ? 'Leave blank to keep current password'
                      : undefined
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={!permissions.canEditActive || saving || deleting}
                    />
                  }
                  label={isActive ? 'Active account' : 'Inactive account'}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!permissions.canEdit || saving || deleting}
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ justifyContent: 'space-between', mb: 2 }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(user.createdAt)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatDate(user.updatedAt)}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ justifyContent: 'flex-end' }}
            >
              {permissions.canDelete ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverOutlinedIcon />}
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={saving || deleting}
                  sx={{ fontWeight: 700, borderRadius: 2.5 }}
                >
                  Delete user
                </Button>
              ) : null}

              {permissions.canEdit ? (
                <Button
                  variant="contained"
                  startIcon={
                    saving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveOutlinedIcon />
                    )
                  }
                  onClick={() => void handleUpdate()}
                  disabled={!canSave}
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    px: 3,
                    background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                  }}
                >
                  {saving ? 'Saving…' : 'Update user'}
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this user?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently delete <strong>{user?.name}</strong> ({user?.email}).
          </DialogContentText>
          <Alert severity="error" variant="outlined">
            This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleDelete()}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteForeverOutlinedIcon />
              )
            }
            sx={{ fontWeight: 800 }}
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardShell>
  );
}
