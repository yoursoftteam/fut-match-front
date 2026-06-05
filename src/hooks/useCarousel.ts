"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface UseCarouselOptions {
  totalSlides: number;
  autoPlayInterval?: number;
}

interface UseCarouselReturn {
  currentIndex: number;
  direction: number;
  isPaused: boolean;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  togglePause: () => void;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocusCapture: () => void;
    onBlurCapture: () => void;
  };
}

export function useCarousel({
  totalSlides,
  autoPlayInterval = 5000,
}: UseCarouselOptions): UseCarouselReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setDirection(clamped > currentIndex ? 1 : -1);
      setCurrentIndex(clamped);
    },
    [currentIndex, totalSlides]
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  useEffect(() => {
    if (reducedMotion.current || isPaused || totalSlides <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goNext, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [goNext, autoPlayInterval, isPaused, totalSlides]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, isPaused, totalSlides]);

  const onMouseEnter = useCallback(() => setIsPaused(true), []);
  const onMouseLeave = useCallback(() => setIsPaused(false), []);
  const onFocusCapture = useCallback(() => setIsPaused(true), []);
  const onBlurCapture = useCallback(() => setIsPaused(false), []);

  return {
    currentIndex,
    direction,
    isPaused,
    goTo,
    goNext,
    goPrev,
    togglePause,
    handlers: {
      onTouchStart,
      onTouchEnd,
      onMouseEnter,
      onMouseLeave,
      onFocusCapture,
      onBlurCapture,
    },
  };
}
