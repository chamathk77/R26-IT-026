'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import axios from 'axios';
import {
  bulkImportShopCatalog,
  fetchShopBulkImportResult,
  fetchShopBulkImportTemplate,
} from '@/lib/api/shops';
import type {
  BulkImportColumn,
  BulkImportResponse,
  BulkImportResultResponse,
  BulkImportRow,
} from '@/lib/api/shops.types';
import BulkImportResultPanel from '@/components/shops/BulkImportResultPanel';
import {
  BULK_IMPORT_COLUMN_HELP,
  buildBulkImportWorkbook,
  downloadBulkImportSample,
  parseBulkImportFile,
  resolveBulkImportColumns,
  validateBulkImportRows,
  type ParsedBulkImportFile,
} from '@/lib/bulkImport/excel';
import * as XLSX from 'xlsx';

type Props = {
  shopId: string;
  shopName?: string;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    const errors = error.response?.data?.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors.join(', ');
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ShopBulkUploadPanel({ shopId, shopName }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [expectedColumns, setExpectedColumns] = useState<BulkImportColumn[]>(
    resolveBulkImportColumns(false),
  );
  const [sampleRows, setSampleRows] = useState<BulkImportRow[]>([]);
  const [warrantyModule, setWarrantyModule] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ParsedBulkImportFile | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResponse | BulkImportResultResponse | null>(null);

  const loadPreviousResult = useCallback(async () => {
    try {
      const previous = await fetchShopBulkImportResult(shopId);
      setResult(previous);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return;
      }
    }
  }, [shopId]);

  const loadTemplate = useCallback(async () => {
    setLoadingTemplate(true);
    try {
      const template = await fetchShopBulkImportTemplate(shopId);
      const columns = template.expectedColumns?.length
        ? template.expectedColumns
        : resolveBulkImportColumns(Boolean(template.warrantyModule));
      setExpectedColumns(columns);
      setSampleRows(template.sampleRows ?? []);
      setWarrantyModule(Boolean(template.warrantyModule));
      setNotes(template.notes ?? []);
    } catch {
      setExpectedColumns(resolveBulkImportColumns(false));
      setSampleRows([]);
      setWarrantyModule(false);
      setNotes([
        'Keep the column headers exactly as shown in the sample file.',
        'type must be product or service.',
        'productNumber must be unique within the Excel file and unique per shop when provided.',
        'New categories are created automatically from categoryName.',
      ]);
    } finally {
      setLoadingTemplate(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadTemplate();
    void loadPreviousResult();
  }, [loadPreviousResult, loadTemplate]);

  const handleSelectFile = async (file: File | null) => {
    if (!file || loadingTemplate) return;

    setError(null);
    setResult(null);

    try {
      const parsed = await parseBulkImportFile(file, expectedColumns);
      const duplicateErrors = validateBulkImportRows(parsed.rows);
      if (duplicateErrors.length > 0) {
        setSelectedFile(null);
        setError(duplicateErrors.join('\n'));
        return;
      }
      setSelectedFile(parsed);
    } catch (err) {
      setSelectedFile(null);
      setError(getApiErrorMessage(err, 'Could not read the Excel file'));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const response = await bulkImportShopCatalog(shopId, {
        columns: [...selectedFile.columns],
        rows: selectedFile.rows,
      });
      setResult(response);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Bulk upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          background:
            'linear-gradient(135deg, rgba(21,101,192,0.08) 0%, rgba(0,131,143,0.06) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main' }}>
                Catalog import
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                Bulk upload products & categories
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 720 }}>
                Upload an Excel file for <strong>{shopName || shopId}</strong>. Categories are
                created automatically when the category name is new.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              onClick={() => {
                const rows = sampleRows.length
                  ? sampleRows
                  : undefined;
                if (rows) {
                  const workbook = buildBulkImportWorkbook(expectedColumns, rows);
                  XLSX.writeFile(workbook, `${shopId}-bulk-upload-sample.xlsx`);
                  return;
                }
                downloadBulkImportSample(
                  `${shopId}-bulk-upload-sample.xlsx`,
                  expectedColumns,
                );
              }}
              disabled={loadingTemplate}
              sx={{
                alignSelf: { xs: 'stretch', md: 'center' },
                fontWeight: 800,
                borderRadius: 2.5,
                px: 2.5,
                background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
                boxShadow: '0 10px 24px rgba(21, 101, 192, 0.28)',
              }}
            >
              Download sample Excel
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                <DescriptionOutlinedIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Required columns
                </Typography>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Column</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expectedColumns.map((key) => {
                      const meta = BULK_IMPORT_COLUMN_HELP[key];
                      return (
                      <TableRow key={key} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {key}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {meta.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={meta.required ? 'Yes' : 'Optional'}
                            color={meta.required ? 'primary' : 'default'}
                            variant={meta.required ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {meta.hint}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Sample rows included in the Excel template
              </Typography>
              {warrantyModule ? (
                <Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>
                  Warranty module is enabled for this shop — the Excel template includes{' '}
                  <strong>warrantyAvailable</strong> and <strong>warrantyMonths</strong> columns.
                </Alert>
              ) : null}
              <Stack spacing={1}>
                {(sampleRows.length ? sampleRows : []).map((row, index) => (
                  <Box
                    key={`${String(row.productName)}-${index}`}
                    sx={{
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {row.productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.categoryName} · {row.type}
                      {row.amount !== '' ? ` · Rs. ${row.amount}` : ''}
                      {row.productNumber ? ` · #${row.productNumber}` : ''}
                      {row.warrantyAvailable === true || row.warrantyAvailable === 'true'
                        ? ` · Warranty ${row.warrantyMonths} mo`
                        : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                <CloudUploadOutlinedIcon color="secondary" />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Upload Excel file
                </Typography>
              </Stack>

              <Box
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  void handleSelectFile(file);
                }}
                sx={{
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: dragActive ? 'primary.main' : 'divider',
                  bgcolor: dragActive ? 'rgba(21,101,192,0.06)' : 'background.default',
                  p: 3,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <CloudUploadOutlinedIcon sx={{ fontSize: 42, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Drag & drop your .xlsx file here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  Or choose a file from your computer
                </Typography>

                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleSelectFile(file);
                  }}
                />

                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || loadingTemplate}
                  sx={{ borderRadius: 2.5, fontWeight: 700 }}
                >
                  Choose Excel file
                </Button>
              </Box>

              {selectedFile ? (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  <strong>{selectedFile.fileName}</strong> ready — {selectedFile.rows.length} row
                  {selectedFile.rows.length === 1 ? '' : 's'} detected.
                </Alert>
              ) : null}

              {loadingTemplate ? <LinearProgress sx={{ mt: 2, borderRadius: 99 }} /> : null}

              {notes.length ? (
                <Stack spacing={0.75} sx={{ mt: 2 }}>
                  {notes.map((note) => (
                    <Typography key={note} variant="body2" color="text.secondary">
                      • {note}
                    </Typography>
                  ))}
                </Stack>
              ) : null}

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!selectedFile || uploading || loadingTemplate}
                onClick={() => void handleUpload()}
                startIcon={
                  uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadOutlinedIcon />
                }
                sx={{
                  mt: 3,
                  fontWeight: 800,
                  borderRadius: 2.5,
                  py: 1.25,
                  background: 'linear-gradient(135deg, #6a1b9a 0%, #1565c0 100%)',
                  boxShadow: '0 10px 24px rgba(106, 27, 154, 0.28)',
                }}
              >
                {uploading ? 'Uploading…' : 'Start bulk upload'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      {result?.summary ? (
        <BulkImportResultPanel
          shopId={shopId}
          shopName={shopName}
          result={result as BulkImportResultResponse}
          onResultChange={setResult}
          onError={setError}
        />
      ) : null}
    </Stack>
  );
}
