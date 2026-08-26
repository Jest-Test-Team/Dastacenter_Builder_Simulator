/**
 * The privacy track's credential gate.
 *
 * Two conditions, and neither can be satisfied by clicking through: every
 * module in the track read, and a real proof produced and locally verified on
 * this machine. The second is recorded by the proving path itself
 * (`src/lib/content/capstone.ts`), so it cannot be granted from here.
 *
 * The credential is a statement about the holder, so it is deliberately not
 * minted automatically — it points at the certificate the reader already
 * earned, which is the artifact that actually carries a proof.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { modulesInTrack } from '@/lib/content/modules';
import { useHydratedProgress } from '@/lib/content/progress';
import { readProofProduced, type CapstoneEvidence } from '@/lib/content/capstone';

export function CapstonePanel({ moduleId }: { moduleId: string }) {
  const { progress, hydrated } = useHydratedProgress();
  const [evidence, setEvidence] = useState<CapstoneEvidence | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void readProofProduced().then((e) => {
      setEvidence(e);
      setChecked(true);
    });
  }, []);

  if (!hydrated || !checked) return null;

  // Every module in the track except this one, which has no quiz to record on.
  const reading = modulesInTrack('privacy').filter((m) => m.id !== moduleId);
  const readingDone = reading.filter((m) => progress[m.id]).length;
  const allRead = readingDone === reading.length;
  const earned = allRead && evidence !== null;

  return (
    <section className="panel mt-10 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className={earned ? 'h-5 w-5 text-success' : 'h-5 w-5 text-fg-muted'} />
        Compact Practitioner
      </h2>

      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          {allRead ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          )}
          <span className={allRead ? '' : 'text-fg-muted'}>
            Read every module in the privacy track — {readingDone}/{reading.length} done.
          </span>
        </li>
        <li className="flex items-start gap-2">
          {evidence ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          )}
          <span className={evidence ? '' : 'text-fg-muted'}>
            {evidence ? (
              <>
                Produced and locally verified a real proof clearing {evidence.threshold}, via{' '}
                <span className="font-mono text-xs">{evidence.backend}</span>.
              </>
            ) : (
              <>Produce a real threshold proof in your own browser.</>
            )}
          </span>
        </li>
      </ul>

      {earned ? (
        <p className="mt-4 text-sm">
          <strong>Earned.</strong>{' '}
          <span className="text-fg-muted">
            The artifact that carries the cryptography is the certificate you already minted — this
            panel only records that you understand what it asserts.
          </span>{' '}
          <Link href="/dashboard" className="text-primary underline">
            View your certificates
          </Link>
          .
        </p>
      ) : (
        <p className="mt-4 text-sm text-fg-muted">
          Neither condition can be granted from this page. Start a{' '}
          <Link href="/build/free" className="text-primary underline">
            free build
          </Link>{' '}
          and prove it.
        </p>
      )}
    </section>
  );
}
