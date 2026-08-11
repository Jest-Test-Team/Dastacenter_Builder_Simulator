/**
 * Decides whether the opening sequence plays, and keeps it out of the homepage
 * bundle when it doesn't.
 *
 * Rules:
 *  - once per browser session, so returning to the lobby isn't a 15s toll;
 *  - `?intro=1` always replays it — needed to record the demo, and to show it
 *    on demand without clearing storage;
 *  - `?intro=0` suppresses it, for screenshots and for driving the build flow.
 *
 * The 3D scene is loaded lazily: three + drei are far too heavy to sit in the
 * critical path of a landing page that most visitors will scroll straight past.
 */

'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

const KsnIntro = dynamic(() => import('./KsnIntro').then((m) => m.KsnIntro), {
  ssr: false,
});

const SEEN_KEY = 'ksn-intro-seen';

export function IntroGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('intro');
    if (forced === '1') {
      setShow(true);
      return;
    }
    if (forced === '0') return;

    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // Private mode or blocked storage: fall through and play it once.
    }
    if (!seen) setShow(true);
  }, []);

  const handleDone = useCallback(() => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Not being able to remember is not a reason to trap the visitor.
    }
    setShow(false);
  }, []);

  if (!show) return null;
  return <KsnIntro onDone={handleDone} />;
}
