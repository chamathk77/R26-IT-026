'use client';

import LoginForm from '@/components/auth/LoginForm';
import LoginBackgroundAnimation from '@/components/auth/LoginBackgroundAnimation';
import './login.css';

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
      <LoginBackgroundAnimation />
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
            {PLATFORM_MODULES.map((mod, index) => (
              <span
                key={mod.label}
                className="login-feature-chip"
                style={{
                  borderColor: mod.color,
                  color: mod.color,
                  animationDelay: `${index * 0.12}s`,
                }}
              >
                {mod.label}
              </span>
            ))}
          </div>
        </aside>

        <LoginForm />
      </div>
    </div>
  );
}
