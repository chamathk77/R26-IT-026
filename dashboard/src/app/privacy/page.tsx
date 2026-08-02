import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export const metadata: Metadata = {
  title: 'Smart Cost Privacy Policy',
  description: 'Privacy Policy for the Smart Cost POS mobile application.',
};

const SUPPORT_EMAIL = 'chamathhasarinda4321@gmail.com';
const SUPPORT_PHONE_DISPLAY = '0760352847';
const SUPPORT_PHONE_E164 = '94760352847';

export default function PrivacyPage() {
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
        <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Privacy Policy
        </Typography>
        <Typography sx={{ color: '#8b9bb0', mb: 4 }}>
          Last updated: July 23, 2026
        </Typography>

        <Section title="1. Overview">
          Smart Cost (&quot;we&quot;, &quot;us&quot;) provides a point-of-sale (POS)
          mobile application and related services for shops. This Privacy Policy
          explains what information we collect, how we use it, and your choices.
        </Section>

        <Section title="2. Information we collect">
          Depending on how you use the app, we may collect:
          {'\n'}• Account details such as name, phone number, and email
          {'\n'}• Shop and business information you enter
          {'\n'}• Sales, product, inventory, and receipt data created in the app
          {'\n'}• Device and usage information needed to operate the service
          {'\n'}• Photos or camera data when you choose to scan barcodes or upload
          product images
        </Section>

        <Section title="3. How we use information">
          We use this information to:
          {'\n'}• Create and manage your shop account
          {'\n'}• Provide POS features such as sales, inventory, and receipts
          {'\n'}• Authenticate users and secure the service
          {'\n'}• Provide customer support
          {'\n'}• Improve reliability and fix issues
        </Section>

        <Section title="4. Sharing">
          We do not sell your personal information. We may share data with service
          providers who help us host, operate, or support the app (for example
          cloud hosting or SMS delivery), only as needed to provide the service,
          or when required by law.
        </Section>

        <Section title="5. Data retention">
          We retain account and business data for as long as your account is
          active or as needed to provide the service, comply with legal
          obligations, and resolve disputes.
        </Section>

        <Section title="6. Security">
          We use reasonable technical and organizational measures to protect your
          information. No method of transmission or storage is 100% secure.
        </Section>

        <Section title="7. Your choices">
          You may request access, correction, or deletion of your account data by
          contacting us. Some data may be retained where required for legal or
          operational reasons.
        </Section>

        <Section title="8. Children">
          Smart Cost is intended for business use and is not directed to children
          under 13.
        </Section>

        <Section title="9. Contact">
          For privacy questions, contact us by:
          {'\n'}• Call:{' '}
          <Typography
            component="a"
            href={`tel:+${SUPPORT_PHONE_E164}`}
            sx={{ color: '#7dd3fc', textDecoration: 'none' }}
          >
            {SUPPORT_PHONE_DISPLAY}
          </Typography>
          {'\n'}• WhatsApp:{' '}
          <Typography
            component="a"
            href={`https://wa.me/${SUPPORT_PHONE_E164}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#7dd3fc', textDecoration: 'none' }}
          >
            {SUPPORT_PHONE_DISPLAY}
          </Typography>
          {'\n'}• Email:{' '}
          <Typography
            component="a"
            href={`mailto:${SUPPORT_EMAIL}`}
            sx={{ color: '#7dd3fc', wordBreak: 'break-all', textDecoration: 'none' }}
          >
            {SUPPORT_EMAIL}
          </Typography>
        </Section>

        <Typography sx={{ color: '#8b9bb0', fontSize: 14, mt: 4 }}>
          Support:{' '}
          <Link href="/support" style={{ color: '#7dd3fc' }}>
            Support page
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      <Typography
        sx={{
          color: '#b6c2d4',
          lineHeight: 1.75,
          whiteSpace: 'pre-line',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}
