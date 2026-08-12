'use client';

import { Box, Card, Chip, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

export interface FilterOption<T extends string> {
  value: T | 'all';
  label: string;
}

interface PaymentFiltersBarProps<T extends string, S extends string> {
  title?: string;
  typeLabel?: string;
  typeOptions?: FilterOption<T>[];
  typeValue?: T | 'all';
  onTypeChange?: (value: T | 'all') => void;
  statusLabel?: string;
  statusOptions?: FilterOption<S>[];
  statusValue?: S | 'all';
  onStatusChange?: (value: S | 'all') => void;
}

export default function PaymentFiltersBar<T extends string, S extends string>({
  title = 'Filters',
  typeLabel = 'Payment type',
  typeOptions,
  typeValue,
  onTypeChange,
  statusLabel = 'Status',
  statusOptions,
  statusValue,
  onStatusChange,
}: PaymentFiltersBarProps<T, S>) {
  return (
    <Card
      sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: 'linear-gradient(135deg, rgba(21,101,192,0.04) 0%, rgba(0,131,143,0.04) 100%)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterListIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {typeOptions && typeValue !== undefined && onTypeChange ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              {typeLabel}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {typeOptions.map((option) => {
                const selected = typeValue === option.value;
                return (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => onTypeChange(option.value)}
                    sx={{ fontWeight: selected ? 700 : 500, borderRadius: 2 }}
                  />
                );
              })}
            </Box>
          </Box>
        ) : null}

        {statusOptions && statusValue !== undefined && onStatusChange ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              {statusLabel}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {statusOptions.map((option) => {
                const selected = statusValue === option.value;
                return (
                  <Chip
                    key={option.value}
                    label={option.label}
                    clickable
                    color={selected ? 'secondary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => onStatusChange(option.value)}
                    sx={{ fontWeight: selected ? 700 : 500, borderRadius: 2 }}
                  />
                );
              })}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Card>
  );
}
