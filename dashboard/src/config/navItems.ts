import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import type { SvgIconComponent } from '@mui/icons-material';

export interface NavChildItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  description: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  description: string;
  children?: NavChildItem[];
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
    description: 'Onboarding & subscription payments',
  },
  {
    label: 'Shop',
    href: '/shops',
    icon: StorefrontOutlinedIcon,
    description: 'Shop onboarding & management',
    children: [
      {
        label: 'Onboarding',
        href: '/shops/onboarding',
        icon: PersonAddAlt1OutlinedIcon,
        description: 'Completed onboarding shops',
      },
    ],
  },
];
