/**
 * Onboarding overlay for first-time users.
 *
 * Shows a multi-step walkthrough on first visit. State persisted in
 * localStorage so it only appears once per browser.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Cpu,
  Shield,
  Award,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'dcb_onboarding_seen';

const STEPS = [
  {
    icon: Box,
    title: 'Welcome to Datacenter Builder',
    body: 'Build a virtual data center using Lego-style blocks. Place power, cooling, IT, and security infrastructure on a 3D grid.',
    color: 'text-primary',
  },
  {
    icon: Zap,
    title: 'Real engineering rules',
    body: 'Every block you place affects your score. The engine evaluates against Uptime, TIA-942, ASHRAE, NFPA, ISO 27001, and EU energy standards.',
    color: 'text-warn',
  },
  {
    icon: Shield,
    title: 'Security & policy controls',
    body: 'Use the policy panel to toggle physical, logical, and administrative security controls alongside your 3D build.',
    color: 'text-success',
  },
  {
    icon: Cpu,
    title: 'Simulate operations',
    body: 'Run your build through a time-loop simulation with events, NPCs, and live gauges for power, temperature, and cost.',
    color: 'text-accent',
  },
  {
    icon: Award,
    title: 'Earn your certificate',
    body: 'Get rated and mint a verifiable SBT certificate with QR code. The chain stores the proof, and anyone can verify it.',
    color: 'text-warn',
  },
];

function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setVisible(true);
    }
  }, []);

  function close() {
    markSeen();
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible) return null;

  const current = STEPS[step]!;
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div
        className="panel mx-4 w-full max-w-lg p-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-fg-muted">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <button onClick={close} className="icon-btn" aria-label="Close tour">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div
            className={`mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-bg-subtle ${current.color}`}
          >
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{current.body}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-primary' : 'w-2 bg-border'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={prev}
            disabled={step === 0}
            className="btn-ghost text-sm disabled:invisible"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {step === STEPS.length - 1 ? (
            <div className="flex gap-2">
              <Link href="/demos" onClick={close} className="btn-ghost text-sm">
                View demos
              </Link>
              <Link href="/build/free" onClick={close} className="btn text-sm">
                Start building
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <button onClick={next} className="btn text-sm">
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
