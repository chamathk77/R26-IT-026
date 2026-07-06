'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Line, RoundedBox } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

type FeatureKey = 'pos' | 'cost' | 'kpi' | 'analytics' | 'marketing' | 'inventory';

interface FeatureConfig {
  key: FeatureKey;
  label: string;
  subtitle: string;
  color: string;
  angle: number;
}

const FEATURES: FeatureConfig[] = [
  { key: 'pos', label: 'POS', subtitle: 'Sales & checkout', color: '#00e676', angle: 0 },
  { key: 'cost', label: 'Cost', subtitle: 'Expenses & margins', color: '#ff7043', angle: Math.PI / 3 },
  { key: 'kpi', label: 'KPI', subtitle: 'Team performance', color: '#42a5f5', angle: (2 * Math.PI) / 3 },
  {
    key: 'analytics',
    label: 'Analytics',
    subtitle: 'Revenue insights',
    color: '#ab47bc',
    angle: Math.PI,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    subtitle: 'Promotions & SMS',
    color: '#ffca28',
    angle: (4 * Math.PI) / 3,
  },
  {
    key: 'inventory',
    label: 'Inventory',
    subtitle: 'Products & stock',
    color: '#26c6da',
    angle: (5 * Math.PI) / 3,
  },
];

const ORBIT_RADIUS = 4.2;

function useMouseNormalized() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return mouse;
}

function FeatureLabel({
  label,
  subtitle,
  color,
}: {
  label: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="scene-feature-label" style={{ borderColor: color }}>
      <span className="scene-feature-label-title" style={{ color }}>
        {label}
      </span>
      <span className="scene-feature-label-sub">{subtitle}</span>
    </div>
  );
}

function PosIcon() {
  return (
    <group>
      <RoundedBox args={[1.6, 1, 0.14]} radius={0.05} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#37474f" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.35, 0.08]}>
        <planeGeometry args={[1.3, 0.55]} />
        <meshStandardMaterial color="#00c853" emissive="#00e676" emissiveIntensity={0.55} />
      </mesh>
      {[-0.4, -0.15, 0.1, 0.35].map((x, i) => (
        <mesh key={i} position={[x, -0.05, 0.09]}>
          <boxGeometry args={[0.22, 0.16, 0.02]} />
          <meshStandardMaterial color="#546e7a" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <RoundedBox args={[1.4, 0.12, 0.9]} radius={0.03} position={[0, -0.55, 0]}>
        <meshStandardMaterial color="#263238" metalness={0.7} roughness={0.3} />
      </RoundedBox>
    </group>
  );
}

function CostIcon() {
  const heights = [0.35, 0.65, 0.5];
  const colors = ['#66bb6a', '#ffa726', '#ef5350'];
  return (
    <group>
      <RoundedBox args={[1.5, 0.1, 0.8]} radius={0.03} position={[0, -0.45, 0]}>
        <meshStandardMaterial color="#455a64" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      {heights.map((h, i) => (
        <mesh key={i} position={[-0.4 + i * 0.4, -0.45 + h / 2, 0]}>
          <boxGeometry args={[0.28, h, 0.28]} />
          <meshStandardMaterial
            color={colors[i]}
            emissive={colors[i]}
            emissiveIntensity={0.25}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}
      <mesh position={[0.55, 0.15, 0.1]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.55, 0.35, 0.06]} />
        <meshStandardMaterial color="#ff7043" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function KpiIcon() {
  const bars = [0.3, 0.55, 0.85, 0.65];
  return (
    <group>
      <RoundedBox args={[1.5, 0.08, 0.75]} radius={0.03} position={[0, -0.5, 0]}>
        <meshStandardMaterial color="#1565c0" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      {bars.map((h, i) => (
        <mesh key={i} position={[-0.45 + i * 0.3, -0.5 + h / 2, 0]}>
          <boxGeometry args={[0.2, h, 0.2]} />
          <meshStandardMaterial
            color="#42a5f5"
            emissive="#1976d2"
            emissiveIntensity={0.3}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0.45, 0.55, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.18, 0.35, 4]} />
        <meshStandardMaterial color="#ffca28" emissive="#ffc107" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function AnalyticsIcon() {
  const points: [number, number, number][] = [
    [-0.55, -0.2, 0.05],
    [-0.2, 0.05, 0.05],
    [0.1, -0.1, 0.05],
    [0.45, 0.35, 0.05],
    [0.65, 0.15, 0.05],
  ];
  return (
    <group>
      <RoundedBox args={[1.55, 1.05, 0.1]} radius={0.05}>
        <meshStandardMaterial color="#311b92" metalness={0.4} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.25, 0.75]} />
        <meshStandardMaterial color="#1a237e" emissive="#311b92" emissiveIntensity={0.2} />
      </mesh>
      <Line points={points} color="#ce93d8" lineWidth={2} />
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#e1bee7" emissive="#ab47bc" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function MarketingIcon() {
  return (
    <group rotation={[0, -0.4, 0]}>
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.55, 1.1, 24]} />
        <meshStandardMaterial color="#ffca28" emissive="#ff8f00" emissiveIntensity={0.25} metalness={0.3} />
      </mesh>
      <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 16]} />
        <meshStandardMaterial color="#ffb300" metalness={0.7} roughness={0.25} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.75 + i * 0.12, 0.15 - i * 0.12, 0]} rotation={[0, 0, -0.3]}>
          <torusGeometry args={[0.08 + i * 0.05, 0.015, 8, 16]} />
          <meshStandardMaterial color="#fff59d" emissive="#ffca28" emissiveIntensity={0.4} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function InventoryIcon() {
  const boxes: { pos: [number, number, number]; color: string }[] = [
    { pos: [-0.35, -0.15, 0], color: '#26c6da' },
    { pos: [0.2, -0.15, 0.1], color: '#00acc1' },
    { pos: [-0.05, 0.35, -0.05], color: '#4dd0e1' },
  ];
  return (
    <group>
      {boxes.map((box, i) => (
        <RoundedBox key={i} args={[0.75, 0.75, 0.75]} radius={0.06} position={box.pos}>
          <meshStandardMaterial color={box.color} metalness={0.35} roughness={0.45} />
        </RoundedBox>
      ))}
      <mesh position={[0.35, -0.42, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.08]} />
        <meshStandardMaterial color="#eceff1" />
      </mesh>
      {[-0.12, 0, 0.12].map((x, i) => (
        <mesh key={i} position={[0.35 + x, -0.42, 0.05]}>
          <boxGeometry args={[0.04, 0.06, 0.01]} />
          <meshStandardMaterial color="#263238" />
        </mesh>
      ))}
    </group>
  );
}

function FeatureIcon({ featureKey }: { featureKey: FeatureKey }) {
  switch (featureKey) {
    case 'pos':
      return <PosIcon />;
    case 'cost':
      return <CostIcon />;
    case 'kpi':
      return <KpiIcon />;
    case 'analytics':
      return <AnalyticsIcon />;
    case 'marketing':
      return <MarketingIcon />;
    case 'inventory':
      return <InventoryIcon />;
    default:
      return null;
  }
}

function FeatureModule({
  config,
  highlight,
}: {
  config: FeatureConfig;
  highlight: number;
}) {
  const x = Math.cos(config.angle) * ORBIT_RADIUS;
  const z = Math.sin(config.angle) * ORBIT_RADIUS;
  const isActive = highlight === FEATURES.findIndex((f) => f.key === config.key);
  const scale = isActive ? 1.12 : 1;

  return (
    <group position={[x, 0, z]} scale={scale}>
      <Line
        points={[
          [0, 0, 0],
          [-x, 0, -z],
        ]}
        color={config.color}
        transparent
        opacity={isActive ? 0.65 : 0.28}
        lineWidth={1}
      />

      <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.8}>
        <group>
          <RoundedBox args={[1.85, 1.85, 0.12]} radius={0.1} position={[0, 0, -0.15]}>
            <meshStandardMaterial
              color="#0d1b2a"
              transparent
              opacity={0.85}
              metalness={0.6}
              roughness={0.35}
            />
          </RoundedBox>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[1.7, 1.7]} />
            <meshStandardMaterial
              color={config.color}
              transparent
              opacity={0.08}
              emissive={config.color}
              emissiveIntensity={isActive ? 0.35 : 0.15}
            />
          </mesh>
          <FeatureIcon featureKey={config.key} />
        </group>
      </Float>

      <Html position={[0, -1.35, 0]} center distanceFactor={6.5} style={{ pointerEvents: 'none' }}>
        <FeatureLabel label={config.label} subtitle={config.subtitle} color={config.color} />
      </Html>
    </group>
  );
}

function CentralHub() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.35;
  });

  return (
    <group>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[1.35, 1.55, 0.2, 48]} />
        <meshStandardMaterial color="#1a237e" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.04, 16, 64]} />
        <meshStandardMaterial color="#4dd0e1" emissive="#00e5ff" emissiveIntensity={0.6} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          color="#1565c0"
          emissive="#42a5f5"
          emissiveIntensity={0.45}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <Html position={[0, 1.15, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <div className="scene-hub-label">
          <span className="scene-hub-title">SmartCost</span>
          <span className="scene-hub-sub">All-in-one retail platform</span>
        </div>
      </Html>
    </group>
  );
}

function SmartCostFeatureScene() {
  const mouse = useMouseNormalized();
  const sceneRef = useRef<Group>(null);
  const orbitRef = useRef<Group>(null);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHighlight((prev) => (prev + 1) % FEATURES.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, []);

  useFrame((state) => {
    const { x: mx, y: my } = mouse.current;
    const time = state.clock.elapsedTime;

    if (sceneRef.current) {
      sceneRef.current.rotation.x = THREE.MathUtils.lerp(sceneRef.current.rotation.x, my * 0.18, 0.04);
      sceneRef.current.rotation.y = THREE.MathUtils.lerp(sceneRef.current.rotation.y, mx * 0.22, 0.04);
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.y = time * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#e3f2fd" />
      <pointLight position={[-5, 3, 4]} intensity={1} color="#00e676" />
      <pointLight position={[5, -2, 3]} intensity={0.85} color="#ab47bc" />

      <group ref={sceneRef}>
        <CentralHub />

        <group ref={orbitRef}>
          {FEATURES.map((feature) => (
            <FeatureModule
              key={feature.key}
              config={feature}
              highlight={highlight}
            />
          ))}
        </group>
      </group>
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export default function LoginScene3D() {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="login-canvas-3d" aria-hidden>
      <Canvas
        camera={{ position: [0, 2.2, 10.5], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <SmartCostFeatureScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
