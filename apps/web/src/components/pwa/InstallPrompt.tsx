'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Icon from '@/components/Icon';

// The browser fires this (Chromium) before showing its own install UI; we
// intercept it (in the early capture script in layout.tsx) so the user installs
// on *their* terms via our button.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type WindowWithEvent = Window & { __ssInstallEvent?: BeforeInstallPromptEvent | null };

// Session-scoped so "Not now" stops nagging this visit but the prompt returns
// on a future visit. An actual install hides it for good via isStandalone().
const DISMISS_KEY = 'sketchstrike:install-dismissed';

function getStoredEvent(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return (window as WindowWithEvent).__ssInstallEvent ?? null;
}
function clearStoredEvent() {
  if (typeof window !== 'undefined') (window as WindowWithEvent).__ssInstallEvent = null;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ masquerades as desktop Safari.
  const iPadOS = navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
  return iOSDevice || iPadOS;
}

function isDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
function markDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* private mode — ignore */
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // The capture script may have already stashed the event before this
    // component mounted — pick it up immediately if so.
    const existing = getStoredEvent();
    if (existing) {
      setDeferred(existing);
      setVisible(true);
    } else if (isIos()) {
      // iOS never fires beforeinstallprompt — surface manual instructions.
      setShowIosHelp(true);
      setVisible(true);
    }

    function onAvailable() {
      if (isDismissed()) return;
      const e = getStoredEvent();
      if (!e) return;
      setDeferred(e);
      setShowIosHelp(false);
      setVisible(true);
    }
    function onInstalled() {
      markDismissed();
      clearStoredEvent();
      setDeferred(null);
      setVisible(false);
    }

    window.addEventListener('ss:install-available', onAvailable);
    window.addEventListener('ss:app-installed', onInstalled);
    return () => {
      window.removeEventListener('ss:install-available', onAvailable);
      window.removeEventListener('ss:app-installed', onInstalled);
    };
  }, []);

  function dismiss() {
    markDismissed();
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // A deferred prompt can only be used once.
    clearStoredEvent();
    setDeferred(null);
    setVisible(false);
    if (outcome !== 'accepted') markDismissed();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-label="Install SketchStrike"
          // Mobile: a banner above the settings/leave FABs. Desktop: a card in
          // the bottom-left, clear of the bottom-right FABs.
          className="fixed bottom-20 left-4 right-4 sm:bottom-4 sm:right-auto sm:w-[340px] z-40 bx bg-[var(--paper)] p-4"
        >
          <div className="flex items-start gap-3">
            <div
              className="bx-sm bg-[var(--primary)] text-[var(--primary-fg)] w-10 h-10 shrink-0 grid place-items-center tilt-l"
              aria-hidden
            >
              <Icon name="download" />
            </div>
            <div className="min-w-0">
              <div className="font-black tracking-tight">Install SketchStrike</div>
              <p className="text-sm text-[var(--ink-soft)] mt-0.5">
                {showIosHelp
                  ? 'Add it to your Home Screen for a full-screen, app-like experience.'
                  : 'Get a full-screen app with a launcher icon — no app store needed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="bx-sm bx-press w-8 h-8 shrink-0 grid place-items-center bg-[var(--bg-tile)] text-[var(--ink)]"
            >
              <Icon name="xmark" className="text-sm" />
            </button>
          </div>

          {showIosHelp ? (
            <div className="mt-3 text-sm font-medium flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[var(--ink-soft)]">
              <span>Tap</span>
              <Icon name="shareUp" className="text-[var(--ink)]" />
              <span>then</span>
              <span className="inline-flex items-center gap-1 font-bold text-[var(--ink)]">
                <Icon name="squarePlus" /> Add to Home Screen
              </span>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <Button onClick={install} size="sm" variant="primary" fullWidth>
                <Icon name="download" />
                Install app
              </Button>
              <Button onClick={dismiss} size="sm" variant="ghost">
                Not now
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
