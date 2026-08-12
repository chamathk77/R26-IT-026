'use client';

import { useMemo, useState } from 'react';
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
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import axios from 'axios';
import { deleteShopBulkImportCatalog, dismissShopBulkImportResult } from '@/lib/api/shops';
import type { BulkImportFailedRow, BulkImportResultResponse } from '@/lib/api/shops.types';
import { downloadBulkImportResultReport } from '@/lib/bulkImport/resultExport';

type Props = {
  shopId: string;
  shopName?: string;
  result: BulkImportResultResponse;
  onResultChange: (result: BulkImportResultResponse | null) => void;
  onError: (message: string | null) => void;
};

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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 120,
        borderRadius: 3,
        p: 2,
        bgcolor: `${accent}12`,
        border: '1px solid',
        borderColor: `${accent}33`,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, color: accent, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function BulkImportResultPanel({
  shopId,
  shopName,
  result,
  onResultChange,
  onError,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmShopId, setConfirmShopId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const summary = result.summary;
  const failedRows = result.failedRows ?? [];
  const importedProducts = result.importedProducts ?? [];

  const hasFailures = (summary?.failed ?? 0) > 0;
  const hasImportedData = (summary?.imported ?? 0) > 0;
  const canDeleteCatalog =
    hasFailures || hasImportedData || importedProducts.length > 0 || failedRows.length > 0;
  const canConfirmDelete =
    confirmShopId.trim().toUpperCase() === shopId.trim().toUpperCase() && !deleting;

  const importedAtLabel = useMemo(() => {
    if (!result.importedAt) return '';
    return new Date(result.importedAt).toLocaleString('en-LK');
  }, [result.importedAt]);

  const handleDownload = () => {
    downloadBulkImportResultReport(shopId, result);
  };

  const handleDismiss = async () => {
    setDismissing(true);
    onError(null);
    try {
      await dismissShopBulkImportResult(shopId);
      onResultChange(null);
    } catch (error) {
      onError(getApiErrorMessage(error, 'Could not dismiss import result'));
    } finally {
      setDismissing(false);
    }
  };

  const handleDeleteCatalog = async () => {
    if (!canConfirmDelete) return;

    setDeleting(true);
    onError(null);
    try {
      await deleteShopBulkImportCatalog(shopId, confirmShopId.trim());
      setConfirmOpen(false);
      setConfirmShopId('');
      onResultChange(null);
    } catch (error) {
      onError(getApiErrorMessage(error, 'Could not delete shop catalog data'));
    } finally {
      setDeleting(false);
    }
  };

  if (!summary) return null;

  return (
    <>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Import result
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {result.importedByName ? `Last run by ${result.importedByName}` : 'Stored import result'}
                {importedAtLabel ? ` · ${importedAtLabel}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleDownload}
                sx={{ fontWeight: 700, borderRadius: 2.5 }}
              >
                Download result
              </Button>
              <Button
                variant="text"
                onClick={() => void handleDismiss()}
                disabled={dismissing}
                sx={{ fontWeight: 700 }}
              >
                {dismissing ? 'Dismissing…' : 'Dismiss result'}
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <StatCard label="Total rows" value={summary.totalRows} accent="#1565c0" />
            <StatCard label="Imported" value={summary.imported} accent="#2e7d32" />
            <StatCard label="Failed" value={summary.failed} accent="#c62828" />
            <StatCard label="Categories created" value={summary.categoriesCreated} accent="#6a1b9a" />
          </Stack>

          {result.categoriesCreated?.length ? (
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <CategoryOutlinedIcon fontSize="small" color="secondary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  New categories
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {result.categoriesCreated.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: category.colorCode ? `${category.colorCode}22` : undefined,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          {summary.failed === 0 ? (
            <Alert
              icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
              severity="success"
              sx={{ borderRadius: 2, mb: canDeleteCatalog ? 2.5 : 0 }}
            >
              All rows imported successfully.
            </Alert>
          ) : (
            <>
              <Alert
                icon={<ErrorOutlineOutlinedIcon fontSize="inherit" />}
                severity="warning"
                sx={{ borderRadius: 2, mb: 2 }}
              >
                {summary.failed} row{summary.failed === 1 ? '' : 's'} failed. Download the result,
                fix the Excel file, then upload again.
              </Alert>

              <TableContainer
                sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2.5 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Number</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Errors</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {failedRows.map((row: BulkImportFailedRow) => (
                      <TableRow key={`${row.rowNumber}-${row.productName}`} hover>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{row.productName || '—'}</TableCell>
                        <TableCell>{row.productNumber || '—'}</TableCell>
                        <TableCell>{row.categoryName || '—'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error.main">
                            {row.errors.join('; ')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {canDeleteCatalog ? (
            <Card
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'error.light',
                background:
                  'linear-gradient(180deg, rgba(198,40,40,0.06) 0%, rgba(255,255,255,1) 55%)',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <WarningAmberRoundedIcon color="error" fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.dark' }}>
                        Delete all uploaded catalog data
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
                      Removes all products, categories, branch stock, and pending carts for{' '}
                      <strong>{shopName || shopId}</strong>. Use this to clear a bad bulk upload
                      before trying again.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteForeverOutlinedIcon />}
                    onClick={() => {
                      setConfirmShopId('');
                      setConfirmOpen(true);
                    }}
                    sx={{ fontWeight: 800, borderRadius: 2.5, whiteSpace: 'nowrap' }}
                  >
                    Delete all catalog data
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete all catalog data?</DialogTitle>
        <DialogContent>
          <Alert severity="error" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            This permanently deletes all products, categories, branch stock, and pending carts for{' '}
            <strong>{shopName || shopId}</strong>. This cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type <strong>{shopId}</strong> to confirm.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Confirm shop ID"
            placeholder={shopId}
            value={confirmShopId}
            onChange={(event) => setConfirmShopId(event.target.value)}
            disabled={deleting}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!canConfirmDelete}
            onClick={() => void handleDeleteCatalog()}
            startIcon={
              deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverOutlinedIcon />
            }
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {deleting ? 'Deleting…' : 'Yes, delete all catalog data'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
