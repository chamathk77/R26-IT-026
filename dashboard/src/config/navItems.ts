import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  description: string;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/home',
    icon: HomeOutlinedIcon,
    description: 'Overview & account',
  },
  {
    label: 'Payments',
    href: '/payments',
    icon: PaymentsOutlinedIcon,
    description: 'Review pending payments',
  },
];
