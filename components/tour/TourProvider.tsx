"use client";

import {
  resolvePresentTourSteps,
  TourOverlay,
} from "@/components/tour/TourOverlay";
import { dismissTour } from "@/lib/tours/actions";
import {
  getTourConfig,
  tourKeyForSegment,
  type TourConfig,
} from "@/lib/tours/tour-config";
import { pathnameToTabSegment } from "@/components/assistant/tab-suggestions";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TourContextValue = {
  startTour: (tourKey: string) => void;
  activeTourKey: string | null;
  stepIndex: number;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

type TourProviderProps = {
  projectId: string;
  /** Tour keys the user has already dismissed (completed or skipped). */
  dismissedTourKeys: string[];
  children: ReactNode;
};

export function TourProvider({
  projectId,
  dismissedTourKeys,
  children,
}: TourProviderProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(() => new Set(dismissedTourKeys));
  const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  /** Last tab we already auto-started for (prevents re-fire in the same visit). */
  const autoStartedRef = useRef<string | null>(null);

  useEffect(() => {
    setDismissed(new Set(dismissedTourKeys));
  }, [dismissedTourKeys]);

  const segment = pathnameToTabSegment(pathname, projectId);
  const tourKeyForTab = tourKeyForSegment(segment);

  const finishTour = useCallback(
    async (status: "completed" | "skipped") => {
      const key = activeTourKey;
      if (!key) return;
      setActiveTourKey(null);
      setActiveConfig(null);
      setStepIndex(0);
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        await dismissTour(key, status);
      } catch {
        // Keep local dismiss so we don't re-auto-fire on a write blip;
        // reload will re-sync from the server.
      }
    },
    [activeTourKey],
  );

  const startTour = useCallback((tourKey: string) => {
    const config = getTourConfig(tourKey);
    if (!config) return;

    const present = resolvePresentTourSteps(config.steps);
    if (present.length === 0) {
      // No addressable targets yet (empty checklist, pre-create website, etc.).
      // Do not write a dismissal row — anchors may appear later this session.
      return;
    }

    setActiveTourKey(tourKey);
    setActiveConfig({ ...config, steps: present });
    setStepIndex(0);
  }, []);

  // Auto-fire once per tourable tab when no dismissal row exists.
  useEffect(() => {
    if (!tourKeyForTab) {
      autoStartedRef.current = null;
      if (activeTourKey) {
        setActiveTourKey(null);
        setActiveConfig(null);
        setStepIndex(0);
      }
      return;
    }

    if (activeTourKey && activeTourKey !== tourKeyForTab) {
      setActiveTourKey(null);
      setActiveConfig(null);
      setStepIndex(0);
    }

    if (dismissed.has(tourKeyForTab)) return;
    if (autoStartedRef.current === tourKeyForTab) return;
    if (activeTourKey) return;

    const config = getTourConfig(tourKeyForTab);
    if (!config) return;
    const present = resolvePresentTourSteps(config.steps);
    if (present.length === 0) {
      // Leave autoStartedRef unset so a same-session create/populate can fire
      // after navigation remounts or the user leaves and returns.
      return;
    }

    autoStartedRef.current = tourKeyForTab;
    startTour(tourKeyForTab);
  }, [tourKeyForTab, dismissed, activeTourKey, startTour]);

  const goNext = useCallback(() => {
    if (!activeConfig) return;
    if (stepIndex >= activeConfig.steps.length - 1) {
      void finishTour("completed");
      return;
    }
    setStepIndex((i) => i + 1);
  }, [activeConfig, stepIndex, finishTour]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipTour = useCallback(() => {
    void finishTour("skipped");
  }, [finishTour]);

  const value = useMemo(
    () => ({ startTour, activeTourKey, stepIndex }),
    [startTour, activeTourKey, stepIndex],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {activeConfig ? (
        <TourOverlay
          config={activeConfig}
          stepIndex={stepIndex}
          onNext={goNext}
          onBack={goBack}
          onSkip={skipTour}
        />
      ) : null}
    </TourContext.Provider>
  );
}
