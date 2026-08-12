import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  BUSINESS_SUPPORT_EMAIL,
  BUSINESS_SUPPORT_PHONE_DISPLAY,
  BUSINESS_SUPPORT_PHONE_E164,
} from '@/lib/businessConfig';

export const metadata: Metadata = {
  title: 'Smart Cost Support',
  description: 'Get help with the Smart Cost POS app and account support.',
};

export default function SupportPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: '#0b1220',
        color: '#e8eef7',
        px: { xs: 2.5, sm: 4 },
        py: { xs: 5, sm: 8 },
      }}
    >
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography
          component="p"
          sx={{ color: '#7dd3fc', fontWeight: 600, mb: 1, letterSpacing: 0.4 }}
        >
          Smart Cost
        </Typography>
        <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Support
        </Typography>
        <Typography sx={{ color: '#b6c2d4', mb: 4, lineHeight: 1.7 }}>
          Need help with the Smart Cost POS app, your shop account, billing, or
          technical issues? Contact us and we will get back to you as soon as
          possible.
        </Typography>

        <ContactCard title="Call">
          <Typography
            component="a"
            href={`tel:+${BUSINESS_SUPPORT_PHONE_E164}`}
            sx={linkSx}
          >
            {BUSINESS_SUPPORT_PHONE_DISPLAY}
          </Typography>
        </ContactCard>

        <ContactCard title="WhatsApp">
          <Typography
            component="a"
            href={`https://wa.me/${BUSINESS_SUPPORT_PHONE_E164}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={linkSx}
          >
            Message {BUSINESS_SUPPORT_PHONE_DISPLAY} on WhatsApp
          </Typography>
        </ContactCard>

        <ContactCard title="Email">
          <Typography
            component="a"
            href={`mailto:${BUSINESS_SUPPORT_EMAIL}`}
            sx={linkSx}
          >
            {BUSINESS_SUPPORT_EMAIL}
          </Typography>
        </ContactCard>

        <Typography sx={{ color: '#b6c2d4', mb: 2, lineHeight: 1.7 }}>
          Please include your shop name, registered phone number, and a short
          description of the issue so we can help faster.
        </Typography>

        <Typography sx={{ color: '#8b9bb0', fontSize: 14 }}>
          Privacy:{' '}
          <Link href="/privacy" style={{ color: '#7dd3fc' }}>
            Privacy Policy
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

const linkSx = {
  color: '#7dd3fc',
  wordBreak: 'break-all' as const,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
};

function ContactCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 2,
        p: 3,
        mb: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
      }}
    >
      <Typography sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  );
}
