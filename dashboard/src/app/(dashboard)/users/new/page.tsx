'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import axios from 'axios';
import DashboardShell from '@/components/layout/DashboardShell';
import { createDashboardUser } from '@/lib/api/users';
import type { DashboardRole } from '@/lib/api/users.types';
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

export default function CreateUserPage() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const canCreate = isDashboardAdmin(authUser?.role);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<DashboardRole>('staff');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;

    setSaving(true);
    setError(null);
    try {
      const result = await createDashboardUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password,
        note: note.trim(),
        isActive,
      });
      router.push(`/users/${encodeURIComponent(result.user._id)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create user'));
      setSaving(false);
    }
  };

  return (
    <DashboardShell title="Create user" subtitle="Add a new dashboard account">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/users')}
        sx={{ mb: 3 }}
      >
        Back to users
      </Button>

      {!canCreate ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Only admins can create dashboard users.
        </Alert>
      ) : (
        <Card
          sx={{
            maxWidth: 760,
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
              color: '#fff',
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <PersonAddAlt1OutlinedIcon sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  New dashboard user
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Create an admin or staff account
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel id="create-user-role-label">Role</InputLabel>
                    <Select
                      labelId="create-user-role-label"
                      label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as DashboardRole)}
                      disabled={saving}
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="staff">Staff</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={saving}
                    helperText="Minimum 6 characters"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        disabled={saving}
                      />
                    }
                    label="Active account"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={saving}
                    multiline
                    minRows={2}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={() => router.push('/users')} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={
                    saving ? <CircularProgress size={16} color="inherit" /> : undefined
                  }
                  sx={{
                    fontWeight: 800,
                    borderRadius: 2.5,
                    px: 3,
                    background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                  }}
                >
                  {saving ? 'Creating…' : 'Create user'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
