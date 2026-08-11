/**
 * KSN Civilization Stack — opening title sequence.
 *
 * Three beats, driven off one clock so the visuals and the copy stay in sync:
 *
 *   0.0s  particle network, camera pushing through it       "KSN Civilization Stack"
 *   5.0s  particles collapse into a rack; plaintext telemetry
 *         floats above it, then a Midnight shield closes over
 *         it and the figures scramble into hashes             typewriter: the problem
 *  12.0s  ENTER SIMULATOR; on click the camera punches
 *         through the rack and the overlay blows out to white
 *
 * The whole thing is skippable, plays once per session, and collapses to a
 * static poster under prefers-reduced-motion — an intro that cannot be escaped
 * is a liability in a live demo, not an asset.
 */

'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type LineSegments,
  type Mesh,
  type Points,
  type ShaderMaterial,
} from 'three';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

const SHIELD_AT = 5;
const ENTER_AT = 12;
const PARTICLE_COUNT = 2200;
const LINK_DISTANCE = 1.5;
const MAX_LINKS = 900;

const HEADLINE = 'KSN Civilization Stack';
const SUBLINE = 'Verifying Green Compute WITHOUT Leaking Trade Secrets.';

/** Telemetry shown in the clear, then redacted. The point of the sequence. */
const SECRETS = [
  { label: 'PUE', clear: '1.21', hash: '0x7f3a…c018' },
  { label: 'LOAD', clear: '500 kW', hash: '0x9b21…4de7' },
  { label: 'S(t)', clear: '92', hash: '0x1c84…af35' },
];

/* ------------------------------------------------------------------ points */

/**
 * Two positions per particle: scattered through a shell, and collapsed onto the
 * surface of the rack. The shield beat lerps between them, so the "network
 * becomes a data center" move is a single interpolation rather than two scenes.
 */
function useNetworkGeometry() {
  return useMemo(() => {
    const scattered = new Float32Array(PARTICLE_COUNT * 3);
    const collapsed = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const cold = new Color('#38bdf8');
    const warm = new Color('#22d3ee');

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      // Deterministic scatter: a spherical Fibonacci lattice, which distributes
      // evenly where Math.random() clumps visibly at this count. Height and
      // radius must come from the same sphere or the field reads as a cone.
      const t = i / PARTICLE_COUNT;
      const yUnit = 1 - 2 * ((i + 0.5) / PARTICLE_COUNT);
      const ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
      const theta = i * 2.399963;
      // Jittered shell thickness, so it's a volume of nodes rather than a skin.
      const radius = 5.6 + (((i * 53) % 100) / 100) * 3.4;
      scattered.set(
        [Math.cos(theta) * ring * radius, yUnit * radius * 0.8, Math.sin(theta) * ring * radius],
        i * 3,
      );

      // Collapsed: a hollow cabinet, 1.1 x 2.2 x 0.9.
      const face = i % 4;
      const u = ((i * 37) % 100) / 100;
      const v = ((i * 61) % 100) / 100;
      const halfW = 0.55;
      const halfD = 0.45;
      const height = 2.2;
      const py = (v - 0.5) * height;
      if (face === 0) collapsed.set([(u - 0.5) * 1.1, py, halfD], i * 3);
      else if (face === 1) collapsed.set([(u - 0.5) * 1.1, py, -halfD], i * 3);
      else if (face === 2) collapsed.set([halfW, py, (u - 0.5) * 0.9], i * 3);
      else collapsed.set([-halfW, py, (u - 0.5) * 0.9], i * 3);

      const shade = cold.clone().lerp(warm, t);
      colors.set([shade.r, shade.g, shade.b], i * 3);
    }

    // Link nearby scattered points so the field reads as a network, not dust.
    const links: number[] = [];
    for (let i = 0; i < PARTICLE_COUNT && links.length < MAX_LINKS * 6; i += 7) {
      const ax = scattered[i * 3] ?? 0;
      const ay = scattered[i * 3 + 1] ?? 0;
      const az = scattered[i * 3 + 2] ?? 0;
      for (let j = i + 1; j < Math.min(i + 40, PARTICLE_COUNT); j += 1) {
        const bx = scattered[j * 3] ?? 0;
        const by = scattered[j * 3 + 1] ?? 0;
        const bz = scattered[j * 3 + 2] ?? 0;
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        if (dx * dx + dy * dy + dz * dz < LINK_DISTANCE * LINK_DISTANCE) {
          links.push(ax, ay, az, bx, by, bz);
        }
      }
    }

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(links, 3));

    return { scattered, collapsed, colors, lineGeometry };
  }, []);
}

function ParticleField({ clock }: { clock: React.RefObject<number> }) {
  const pointsRef = useRef<Points>(null);
  const groupRef = useRef<Group>(null);
  const linesRef = useRef<LineSegments>(null);
  const cabinetRef = useRef<Mesh>(null);
  const { scattered, collapsed, colors, lineGeometry } = useNetworkGeometry();
  const live = useMemo(() => Float32Array.from(scattered), [scattered]);

  useFrame((_, delta) => {
    const elapsed = clock.current ?? 0;
    const group = groupRef.current;
    if (group) group.rotation.y += delta * 0.06;

    const points = pointsRef.current;
    if (!points) return;

    // 0 through the network beat, 1 once collapsed into the cabinet.
    const collapse = smoothstep(SHIELD_AT - 0.6, SHIELD_AT + 1.8, elapsed);
    const attribute = points.geometry.getAttribute('position');
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 1) {
      const from = scattered[i] ?? 0;
      const to = collapsed[i] ?? 0;
      live[i] = from + (to - from) * collapse;
    }
    attribute.needsUpdate = true;

    const material = points.material as { opacity: number };
    material.opacity = 0.55 + 0.45 * collapse;

    // The links are baked from the scattered layout, so they cannot follow the
    // collapse — fade them out as it happens or they trail as stray streaks.
    if (linesRef.current) {
      const lineMaterial = linesRef.current.material as { opacity: number };
      lineMaterial.opacity = 0.16 * (1 - collapse);
    }

    // The cabinet fades in behind the particles as they land on it, so the
    // shape reads as a rack rather than a cloud of dots that happens to be
    // rectangular.
    if (cabinetRef.current) {
      const cabinetMaterial = cabinetRef.current.material as { opacity: number };
      cabinetMaterial.opacity = collapse * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[live, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial
          color="#1e88c7"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <mesh ref={cabinetRef}>
        <boxGeometry args={[1.12, 2.22, 0.92]} />
        <meshStandardMaterial
          color="#0b2f52"
          emissive="#0d4a7a"
          emissiveIntensity={0.6}
          transparent
          opacity={0}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ shield */

const SHIELD_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fresnel rim plus a travelling circuit grid. The grid is what sells "Midnight
 * closed over it" rather than "a blue ball appeared".
 */
const SHIELD_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);

    vec2 cell = vPosition.xy * 3.4;
    float grid = step(0.94, fract(cell.x)) + step(0.94, fract(cell.y));
    grid *= 0.14;

    float sweep = smoothstep(0.0, 0.35, sin(vPosition.y * 2.0 - uTime * 1.6) * 0.5 + 0.5);

    vec3 tint = mix(vec3(0.11, 0.42, 0.92), vec3(0.35, 0.85, 1.0), rim);
    // Deliberately faint: the shell has to read as *over* the cabinet, with the
    // rack and the committed hashes still legible through it. An opaque dome
    // hides the very thing the shot is about.
    float alpha = (rim * 0.42 + grid + sweep * 0.06) * uProgress;
    gl_FragColor = vec4(tint, clamp(alpha, 0.0, 0.5));
  }
`;

function Shield({ clock }: { clock: React.RefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uProgress: { value: 0 } }),
    [],
  );

  useFrame((_, delta) => {
    const elapsed = clock.current ?? 0;
    const progress = smoothstep(SHIELD_AT + 0.9, SHIELD_AT + 2.4, elapsed);
    // Write through the material's own uniforms rather than the object handed
    // to the JSX prop: they are not guaranteed to be the same reference, and a
    // uProgress stuck at 0 renders the shell perfectly transparent.
    const live = materialRef.current?.uniforms;
    if (live) {
      live.uTime!.value += delta;
      live.uProgress!.value = progress;
    }
    if (groupRef.current) {
      // Snaps out past the cabinet, then settles — a closing shell, not a fade.
      const scale = 0.2 + progress * 1.18 - Math.sin(progress * Math.PI) * 0.1;
      groupRef.current.scale.setScalar(Math.max(scale, 0.001));
    }
  });

  // Visibility rides on uProgress (alpha 0 contributes nothing under additive
  // blending) rather than a `visible` flag. A declared visible={false} would be
  // reapplied by R3F on every re-render — and the typewriter re-renders this
  // tree every 26ms, which outruns the frame loop trying to switch it back on.
  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.5, 3]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={SHIELD_VERTEX}
          fragmentShader={SHIELD_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------- 3D labels */

/**
 * The redaction beat. Anchored in 3D (rather than as a DOM overlay) so the
 * figures sit on the cabinet and travel with the camera push.
 */
function SecretLabels({ clock }: { clock: React.RefObject<number> }) {
  const [redacted, setRedacted] = useState(false);
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const elapsed = clock.current ?? 0;
    // No upper bound: the redacted figures are the payoff, so they stay on
    // screen next to the ENTER button rather than vanishing before it lands.
    const shouldShow = elapsed > SHIELD_AT - 0.2;
    if (shouldShow !== visible) setVisible(shouldShow);
    const shouldRedact = elapsed > SHIELD_AT + 1.7;
    if (shouldRedact !== redacted) setRedacted(shouldRedact);
  });

  if (!visible) return null;

  return (
    <Html position={[0, 1.85, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
      <div className="pointer-events-none flex flex-col items-center gap-1 font-mono text-[13px] leading-tight">
        {SECRETS.map((secret) => (
          <div
            key={secret.label}
            className={`whitespace-nowrap rounded px-2 py-0.5 transition-colors duration-500 ${
              redacted
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            <span className="opacity-60">{secret.label} </span>
            {redacted ? secret.hash : secret.clear}
          </div>
        ))}
        <div
          className={`mt-1 text-[10px] uppercase tracking-[0.2em] transition-opacity duration-500 ${
            redacted ? 'text-emerald-400/80 opacity-100' : 'text-red-400/80 opacity-100'
          }`}
        >
          {redacted ? 'Committed · design withheld' : 'Private data · local only'}
        </div>
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ camera */

function CameraRig({
  clock,
  punching,
}: {
  clock: React.RefObject<number>;
  punching: boolean;
}) {
  const { camera } = useThree();
  const punchRef = useRef(0);

  useFrame((_, delta) => {
    const elapsed = clock.current ?? 0;

    // Steady push through the field, easing to rest as the shield closes.
    const approach = smoothstep(0, ENTER_AT, elapsed);
    let z = 13 - approach * 7.2;

    if (punching) {
      punchRef.current = Math.min(punchRef.current + delta * 1.9, 1);
      z -= punchRef.current * punchRef.current * 6.4;
    }

    camera.position.set(Math.sin(elapsed * 0.12) * 0.5, 0.25, z);
    camera.lookAt(0, 0.1, 0);
  });

  return null;
}

/* ------------------------------------------------------------------- scene */

function Scene({
  clock,
  punching,
  onTick,
}: {
  clock: React.RefObject<number>;
  punching: boolean;
  onTick: (elapsed: number) => void;
}) {
  useFrame((_, delta) => {
    clock.current = (clock.current ?? 0) + delta;
    onTick(clock.current);
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 6, 6]} intensity={40} color="#38bdf8" />
      <CameraRig clock={clock} punching={punching} />
      <ParticleField clock={clock} />
      <Shield clock={clock} />
      <SecretLabels clock={clock} />
    </>
  );
}

/* -------------------------------------------------------------------- util */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/* --------------------------------------------------------------- overlay */

export function KsnIntro({ onDone }: { onDone: () => void }) {
  const clock = useRef(0);
  const [phase, setPhase] = useState<'network' | 'shield' | 'enter'>('network');
  const [typed, setTyped] = useState('');
  const [punching, setPunching] = useState(false);
  const [flash, setFlash] = useState(false);
  const reducedMotion = useReducedMotion();

  const finish = useCallback(() => {
    if (punching) return;
    setPunching(true);
    setFlash(true);
    // Let the punch-through read before handing over to the page.
    window.setTimeout(onDone, 620);
  }, [onDone, punching]);

  // Escape always exits. A demo that traps the presenter is worse than no demo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const handleTick = useCallback((elapsed: number) => {
    setPhase((current) => {
      const next = elapsed >= ENTER_AT ? 'enter' : elapsed >= SHIELD_AT ? 'shield' : 'network';
      return next === current ? current : next;
    });
  }, []);

  // Typewriter for the problem statement, started by the shield beat.
  useEffect(() => {
    if (phase === 'network') return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(SUBLINE.slice(0, index));
      if (index >= SUBLINE.length) window.clearInterval(timer);
    }, 26);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Reduced motion: no particles, no push, no typing — the same message, still.
  if (reducedMotion) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-[#04070f] px-6 text-center">
        <h1 className="text-3xl font-bold text-white md:text-5xl">{HEADLINE}</h1>
        <p className="max-w-xl text-base text-sky-200/80 md:text-lg">{SUBLINE}</p>
        <button type="button" onClick={onDone} className="btn text-base">
          Enter simulator
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#04070f]">
      <Canvas camera={{ position: [0, 0.25, 13], fov: 55 }} dpr={[1, 2]}>
        <Scene clock={clock} punching={punching} onTick={handleTick} />
      </Canvas>

      {/* Centred copy sits in the DOM rather than in <Html>: it never needs to
          track a 3D point, and this keeps the type crisp at any DPR. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className={`text-3xl font-bold tracking-tight text-white transition-all duration-1000 md:text-6xl ${
            phase === 'network' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ textShadow: '0 0 28px rgba(56,189,248,0.65)' }}
        >
          {HEADLINE}
        </h1>

        <p
          className={`absolute bottom-[18%] max-w-2xl font-mono text-sm text-sky-100/90 transition-opacity duration-500 md:text-lg ${
            phase === 'network' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {typed}
          <span className="ml-0.5 inline-block w-2 animate-pulse bg-sky-300/80">&nbsp;</span>
        </p>

        <button
          type="button"
          onClick={finish}
          className={`pointer-events-auto absolute bottom-[8%] rounded-md border border-sky-400/60 bg-sky-500/10 px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-100 backdrop-blur transition-all duration-700 hover:bg-sky-500/25 ${
            phase === 'enter' ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
          }`}
        >
          Enter Simulator
        </button>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="absolute right-5 top-5 rounded border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/60 transition hover:text-white"
      >
        Skip
      </button>

      {/* Punch-through blowout. */}
      <div
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-500 ${
          flash ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
