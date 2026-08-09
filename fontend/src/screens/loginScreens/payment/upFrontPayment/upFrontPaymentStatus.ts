import { PaymentStatus } from '../../../../type/payment';

export function getUpFrontStatusMeta(status: PaymentStatus) {
  switch (status) {
    case 'approve':
      return {
        label: 'Approved',
        tone: 'success' as const,
        icon: 'checkmark-circle-outline' as const,
        color: '#15803d',
      };
    case 'pending':
      return {
        label: 'Pending review',
        tone: 'warning' as const,
        icon: 'time-outline' as const,
        color: '#b45309',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        tone: 'neutral' as const,
        icon: 'close-circle-outline' as const,
        color: '#dc2626',
      };
    case 'notPaid':
    default:
      return {
        label: 'Not paid',
        tone: 'neutral' as const,
        icon: 'alert-circle-outline' as const,
        color: '#64748b',
      };
  }
}

export function getUpFrontStatusHighlight(
  status: PaymentStatus,
  resolvedTheme: 'light' | 'dark',
): { borderColor: string; backgroundColor: string; accentColor: string } {
  const isDark = resolvedTheme === 'dark';

  switch (status) {
    case 'approve':
      return {
        borderColor: '#86efac',
        backgroundColor: isDark ? '#052e16' : '#f0fdf4',
        accentColor: '#15803d',
      };
    case 'pending':
      return {
        borderColor: '#fcd34d',
        backgroundColor: isDark ? '#422006' : '#fffbeb',
        accentColor: '#b45309',
      };
    case 'rejected':
      return {
        borderColor: '#fca5a5',
        backgroundColor: isDark ? '#450a0a' : '#fef2f2',
        accentColor: '#dc2626',
      };
    case 'notPaid':
    default:
      return {
        borderColor: isDark ? '#475569' : '#cbd5e1',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        accentColor: '#64748b',
      };
  }
}
