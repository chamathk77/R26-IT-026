'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import { DASHBOARD_NAV_ITEMS, type NavItem } from '@/config/navItems';

export const SIDEBAR_WIDTH = 260;

const sidebarPaper = {
  width: SIDEBAR_WIDTH,
  bgcolor: '#0f172a',
  borderRight: '1px solid rgba(255,255,255,0.08)',
  backgroundImage: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
};

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItemButton({
  item,
  pathname,
  onNavigate,
  nested = false,
}: {
  item: Pick<NavItem, 'label' | 'href' | 'icon' | 'description'>;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active = isPathActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <ListItemButton
      component={Link}
      href={item.href}
      onClick={onNavigate}
      sx={{
        mb: 0.5,
        ml: nested ? 1.5 : 0,
        borderRadius: 2,
        color: active ? '#fff' : 'rgba(255,255,255,0.72)',
        bgcolor: active ? 'rgba(21, 101, 192, 0.45)' : 'transparent',
        border: active ? '1px solid rgba(77, 208, 225, 0.35)' : '1px solid transparent',
        py: nested ? 0.75 : 1,
        '&:hover': {
          bgcolor: active ? 'rgba(21, 101, 192, 0.55)' : 'rgba(255,255,255,0.06)',
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: nested ? 34 : 40,
          color: active ? '#4dd0e1' : 'rgba(255,255,255,0.55)',
        }}
      >
        <Icon fontSize={nested ? 'small' : 'medium'} />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        secondary={nested ? undefined : item.description}
        slotProps={{
          primary: {
            sx: {
              fontWeight: active ? 700 : 600,
              fontSize: nested ? '0.88rem' : '0.95rem',
            },
          },
          secondary: {
            sx: {
              fontSize: '0.72rem',
              color: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
            },
          },
        }}
      />
    </ListItemButton>
  );
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const children = item.children ?? [];
  const childActive = children.some((child) => isPathActive(pathname, child.href));
  const parentActive = isPathActive(pathname, item.href);
  const [open, setOpen] = useState(childActive || parentActive);
  const Icon = item.icon;

  useEffect(() => {
    if (childActive || parentActive) {
      setOpen(true);
    }
  }, [childActive, parentActive]);

  if (children.length === 0) {
    return <NavItemButton item={item} pathname={pathname} onNavigate={onNavigate} />;
  }

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          mb: 0.5,
          borderRadius: 2,
          color: parentActive || childActive ? '#fff' : 'rgba(255,255,255,0.72)',
          bgcolor: parentActive || childActive ? 'rgba(21, 101, 192, 0.25)' : 'transparent',
          border:
            parentActive || childActive
              ? '1px solid rgba(77, 208, 225, 0.25)'
              : '1px solid transparent',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.06)',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: parentActive || childActive ? '#4dd0e1' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          secondary={item.description}
          slotProps={{
            primary: {
              sx: { fontWeight: 700, fontSize: '0.95rem' },
            },
            secondary: {
              sx: {
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.45)',
              },
            },
          }}
        />
        {open ? (
          <ExpandLess sx={{ color: 'rgba(255,255,255,0.55)' }} />
        ) : (
          <ExpandMore sx={{ color: 'rgba(255,255,255,0.55)' }} />
        )}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {children.map((child) => (
            <NavItemButton
              key={child.href}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <List sx={{ px: 1.5, flex: 1 }}>
      {DASHBOARD_NAV_ITEMS.map((item) => (
        <NavGroup key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </List>
  );
}

function NavBrand() {
  return (
    <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #4dd0e1 0%, #42a5f5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        SmartCost
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
        Internal dashboard
      </Typography>
    </Box>
  );
}

export function DashboardSidebar() {
  return (
    <Box
      component="nav"
      sx={{
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        ...sidebarPaper,
      }}
    >
      <NavBrand />
      <NavLinks />
    </Box>
  );
}

export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        sx={{
          color: 'text.primary',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: sidebarPaper } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <NavBrand />
        <NavLinks onNavigate={() => setOpen(false)} />
      </Drawer>
    </>
  );
}
