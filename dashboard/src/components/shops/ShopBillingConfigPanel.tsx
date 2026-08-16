'use client';

import { useCallback, useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ShopBillingConfig, ShopTaxConfig } from '@/lib/api/shops.types';

type Props = {
  value: ShopBillingConfig;
  editable: boolean;
  onChange: (next: ShopBillingConfig) => void;
};

function createTaxEntry(index: number): ShopTaxConfig {
  return {
    id: `tax-${Date.now()}-${index}`,
    label: '',
    rate: 0,
    enabled: true,
  };
}

function formatRateDisplay(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '';
  return String(rate);
}

function parseRateInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '.') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

type BillingLineRowProps = {
  tax: ShopTaxConfig;
  index: number;
  editable: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onUpdate: (patch: Partial<ShopTaxConfig>) => void;
  onRemove: () => void;
};

function BillingLineRow({
  tax,
  editable,
  expanded,
  onExpand,
  onCollapse,
  onUpdate,
  onRemove,
}: BillingLineRowProps) {
  const [rateDraft, setRateDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) {
      setRateDraft(null);
    }
  }, [expanded, tax.rate]);

  const rateValue = rateDraft ?? formatRateDisplay(tax.rate);

  const commitRate = useCallback(
    (raw: string) => {
      const parsed = parseRateInput(raw);
      if (parsed === null) {
        onUpdate({ rate: 0 });
        setRateDraft('');
        return;
      }
      onUpdate({ rate: parsed });
      setRateDraft(null);
    },
    [onUpdate],
  );

  const handleFocus = () => {
    if (editable) {
      onExpand();
    }
  };

  const handleBlur = (event: React.FocusEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    commitRate(rateValue);
    onCollapse();
  };

  return (
    <Box
      onBlur={handleBlur}
      sx={{
        border: '1px solid',
        borderColor: expanded ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: expanded ? 'action.hover' : 'background.paper',
        transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: expanded ? 2 : 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: expanded ? 1.5 : 1.25,
          cursor: editable ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (editable && !expanded) {
            onExpand();
          }
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
            {tax.label.trim() || 'Untitled line'}
          </Typography>
          {!expanded ? (
            <Typography variant="caption" color="text.secondary">
              {tax.rate > 0 ? `${tax.rate}%` : 'No rate set'}
              {tax.enabled ? ' · Enabled' : ' · Disabled'}
            </Typography>
          ) : null}
        </Box>
        {!expanded ? (
          <Chip
            size="small"
            label={tax.enabled ? 'Enabled' : 'Disabled'}
            color={tax.enabled ? 'success' : 'default'}
            variant={tax.enabled ? 'filled' : 'outlined'}
          />
        ) : null}
        {editable ? (
          <IconButton
            color="error"
            aria-label="Remove line"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      <Collapse in={expanded} unmountOnExit={false}>
        <Stack spacing={2} sx={{ px: 2, pb: 2, pt: 0.5 }}>
          <TextField
            label="Name"
            placeholder="e.g. VAT or Service charge"
            value={tax.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            onFocus={handleFocus}
            fullWidth
            disabled={!editable}
            autoFocus={expanded}
          />
          <TextField
            label="Rate %"
            placeholder="e.g. 18"
            value={rateValue}
            onChange={(event) => {
              const next = event.target.value;
              if (next !== '' && !/^\d*\.?\d*$/.test(next)) {
                return;
              }
              setRateDraft(next);
              const parsed = parseRateInput(next);
              if (parsed !== null) {
                onUpdate({ rate: parsed });
              }
            }}
            onFocus={handleFocus}
            onBlur={() => commitRate(rateValue)}
            fullWidth
            disabled={!editable}
            inputMode="decimal"
            helperText="Enter a percentage between 0 and 100"
            slotProps={{
              htmlInput: {
                min: 0,
                max: 100,
                step: 0.01,
                style: { fontSize: '1rem' },
              },
            }}
            sx={{ maxWidth: 280 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={tax.enabled}
                onChange={(event) => onUpdate({ enabled: event.target.checked })}
                disabled={!editable}
              />
            }
            label="Enabled on bills"
            sx={{ ml: 0 }}
          />
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function ShopBillingConfigPanel({ value, editable, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateTax = (index: number, patch: Partial<ShopTaxConfig>) => {
    const taxes = value.taxes.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, ...patch } : entry,
    );
    onChange({ taxes });
  };

  const addLine = () => {
    const entry = createTaxEntry(value.taxes.length);
    onChange({ taxes: [...value.taxes, entry] });
    setExpandedId(entry.id);
  };

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        Add percentage lines for this shop — for example <strong>VAT 18%</strong> or{' '}
        <strong>Service charge 8%</strong>. Tap a line to expand and edit name, rate, and enable
        switch. Each enabled line is applied at checkout after any customer discount.
      </Typography>

      <Box>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Taxes & charges
          </Typography>
          {editable ? (
            <Button size="small" startIcon={<AddIcon />} onClick={addLine}>
              Add line
            </Button>
          ) : null}
        </Stack>

        {value.taxes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No lines configured. Add VAT, service charge, or any other percentage fee your shop
            needs on bills.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {value.taxes.map((tax, index) => (
              <BillingLineRow
                key={tax.id}
                tax={tax}
                index={index}
                editable={editable}
                expanded={expandedId === tax.id}
                onExpand={() => setExpandedId(tax.id)}
                onCollapse={() => setExpandedId((current) => (current === tax.id ? null : current))}
                onUpdate={(patch) => updateTax(index, patch)}
                onRemove={() => {
                  onChange({ taxes: value.taxes.filter((_, entryIndex) => entryIndex !== index) });
                  setExpandedId((current) => (current === tax.id ? null : current));
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          borderRadius: 2,
          px: 2,
          py: 1.5,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.7 }}>
          <strong>How totals are calculated:</strong> Subtotal → customer discount → each enabled
          line (% of remaining amount) → final total.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.7 }}>
          Example: Rs. 1,000 subtotal, Rs. 100 discount, Service charge 8% (Rs. 72), VAT 18% (Rs.
          162) → <strong>Total Rs. 1,134</strong>. Save the shop for changes to apply on new POS
          checkouts.
        </Typography>
      </Box>
    </Stack>
  );
}
