'use client';

const ORBS = [
  { className: 'login-orb login-orb-1', color: 'rgba(77, 208, 225, 0.45)' },
  { className: 'login-orb login-orb-2', color: 'rgba(21, 101, 192, 0.4)' },
  { className: 'login-orb login-orb-3', color: 'rgba(0, 230, 118, 0.28)' },
  { className: 'login-orb login-orb-4', color: 'rgba(171, 71, 188, 0.32)' },
];

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${6 + ((index * 23) % 88)}%`,
  delay: `${(index % 6) * 0.7}s`,
  duration: `${4 + (index % 5)}s`,
  size: 3 + (index % 4),
}));

export default function LoginBackgroundAnimation() {
  return (
    <div className="login-bg-animation" aria-hidden>
      {ORBS.map((orb) => (
        <div
          key={orb.className}
          className={orb.className}
          style={{ background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)` }}
        />
      ))}

      <div className="login-particles">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="login-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <svg className="login-lines" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="loginLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(77, 208, 225, 0)" />
            <stop offset="50%" stopColor="rgba(77, 208, 225, 0.35)" />
            <stop offset="100%" stopColor="rgba(77, 208, 225, 0)" />
          </linearGradient>
        </defs>
        <path className="login-line login-line-1" d="M120,480 Q400,200 680,120" />
        <path className="login-line login-line-2" d="M80,320 Q400,80 720,360" />
        <path className="login-line login-line-3" d="M200,560 Q400,300 600,80" />
      </svg>
    </div>
  );
}
