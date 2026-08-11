/**
 * The proving console is the visual centrepiece of the Midnight beat, and it is
 * only ever reachable behind a connected wallet and a real mint — which means a
 * crash in it would surface for the first time in front of an audience. These
 * render it directly.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZkProvingConsole, type ConsoleLine } from '@/components/cert/ZkProvingConsole';

const LINES: ConsoleLine[] = [
  { tone: 'local', text: 'graphDigest = 0xabc…' },
  { tone: 'info', text: 'Circuit: proveThreshold · rule pack 0.1.0' },
  { tone: 'ok', text: 'Proof generated.' },
];

describe('ZkProvingConsole', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <ZkProvingConsole open={false} lines={LINES} status="running" onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders every line it is given', () => {
    render(<ZkProvingConsole open lines={LINES} status="running" onClose={() => {}} />);
    for (const line of LINES) {
      expect(screen.getByText(line.text)).toBeTruthy();
    }
  });

  it('cannot be dismissed while the proof is still running', () => {
    const onClose = vi.fn();
    render(<ZkProvingConsole open lines={LINES} status="running" onClose={onClose} />);
    const button = screen.getByRole('button', { name: /working/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('can be dismissed once it has settled', () => {
    const onClose = vi.fn();
    render(<ZkProvingConsole open lines={LINES} status="done" onClose={onClose} />);
    const button = screen.getByRole('button', { name: /close/i });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    button.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces a failure state', () => {
    render(
      <ZkProvingConsole
        open
        lines={[{ tone: 'fail', text: 'Assert (score >= threshold) … FAIL' }]}
        status="failed"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/FAIL/)).toBeTruthy();
  });
});
