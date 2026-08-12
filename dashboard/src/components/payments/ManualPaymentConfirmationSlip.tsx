'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import type { ManualPaymentConfirmation } from '@/lib/api/payments.types';
import {
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE_DISPLAY,
} from '@/lib/businessConfig';
import { generateManualPaymentConfirmationPdf } from '@/lib/pdf/generateManualPaymentConfirmationPdf';
import { formatDate, formatDateTime } from '@/lib/utils/formatDate';
import { formatPaymentAmount } from './paymentUi';

interface ManualPaymentConfirmationSlipProps {
  confirmation: ManualPaymentConfirmation;
}

export default function ManualPaymentConfirmationSlip({
  confirmation,
}: ManualPaymentConfirmationSlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateManualPaymentConfirmationPdf(confirmation);
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: 'flex-end', mb: 2, '@media print': { display: 'none' } }}
      >
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfOutlinedIcon />}
          onClick={handleDownloadPdf}
          sx={{ fontWeight: 700, borderRadius: 2.5 }}
        >
          Download PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintOutlinedIcon />}
          onClick={handlePrint}
          sx={{
            fontWeight: 800,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
          }}
        >
          Print
        </Button>
      </Stack>

      <Card
        id="manual-payment-confirmation-slip"
        sx={{
          maxWidth: 760,
          mx: 'auto',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          '@media print': {
            boxShadow: 'none',
            border: '1px solid #ccc',
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            background: 'linear-gradient(135deg, #1565c0 0%, #00838f 100%)',
            color: '#fff',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Smart Cost — Payment confirmation
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.92, mt: 0.5 }}>
            Manual payment receipt for upfront setup fee received from customer.
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Receipt number
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0.5 }}>
                {confirmation.receiptNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Generated {formatDateTime(confirmation.createdAt)}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Product / service
              </Typography>
              <Typography variant="body1">{confirmation.productName}</Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Purchaser / shop details
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body1">
                  <strong>Shop name:</strong> {confirmation.shopName}
                </Typography>
                <Typography variant="body1">
                  <strong>Address:</strong> {confirmation.address}
                </Typography>
                <Typography variant="body1">
                  <strong>Phone:</strong> {confirmation.shopMobileNumber}
                </Typography>
              </Stack>
            </Box>

            <Divider />

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Amount received
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>
                {formatPaymentAmount(confirmation.paymentAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Payment date: {formatDate(confirmation.paymentReceivedDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Payment method: {confirmation.paymentMethod}
              </Typography>
            </Box>

            {confirmation.description ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {confirmation.description}
                </Typography>
              </Box>
            ) : null}

            {confirmation.notes ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Internal notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {confirmation.notes}
                </Typography>
              </Box>
            ) : null}

            <Divider />

            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              This confirms that Smart Cost has received the upfront payment listed above from
              the customer. Keep this receipt for your records.
            </Typography>

            {confirmation.generatedByName ? (
              <Typography variant="caption" color="text.secondary">
                Issued by: {confirmation.generatedByName}
              </Typography>
            ) : null}

            <Typography variant="caption" color="text.secondary">
              Support: {BUSINESS_SUPPORT_PHONE_DISPLAY} · {BUSINESS_SUPPORT_EMAIL}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
