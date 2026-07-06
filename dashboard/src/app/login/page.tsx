'use client';

import dynamic from 'next/dynamic';
import LoginForm from '@/components/auth/LoginForm';
import './login.css';

const LoginScene3D = dynamic(() => import('@/components/auth/LoginScene3D'), {
  ssr: false,
  loading: () => null,
});

const PLATFORM_MODULES = [
  { label: 'POS', color: '#00e676' },
  { label: 'Cost Management', color: '#ff7043' },
  { label: 'KPI', color: '#42a5f5' },
  { label: 'Analytics', color: '#ab47bc' },
  { label: 'Marketing', color: '#ffca28' },
  { label: 'Inventory', color: '#26c6da' },
];

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-bg-gradient" aria-hidden />
      <LoginScene3D />
      <div className="login-grid-overlay" aria-hidden />

      <div className="login-content">
        <aside className="login-brand-panel">
          <p className="login-brand-badge">
            <span className="login-brand-dot" />
            All-in-one retail platform
          </p>
          <h1 className="login-brand-title">
            SmartCost
            <br />
            Dashboard
          </h1>
          <p className="login-brand-subtitle">
            POS, cost control, KPIs, analytics, marketing & inventory — one platform
            for your entire shop operation.
          </p>
          <div className="login-feature-chips">
            {PLATFORM_MODULES.map((mod) => (
              <span
                key={mod.label}
                className="login-feature-chip"
                style={{ borderColor: mod.color, color: mod.color }}
              >
                {mod.label}
              </span>
            ))}
          </div>
          <p className="login-brand-hint">Modules orbit the hub — move your cursor to explore</p>
        </aside>

        <LoginForm />
      </div>
    </div>
  );
}
