import React, { useEffect, useState } from 'react';
import './MediBotIntroOverlay.css';

/**
 * MediBotIntroOverlay Component
 *
 * Full-screen animated robot introduction displayed when the user clicks the
 * Assistant navigation item. Reuses the existing MediBot robot avatar asset
 * (/images/medibot-robot-avatar.png) and aligns with the SwasthSetu soft white,
 * aqua, and teal neomorphic aesthetic.
 *
 * It remains 100% opaque and fully visible covering the entire viewport until
 * navigation to the MediBot route completes, eliminating any intermediate page flash.
 */
export function MediBotIntroOverlay({ isRevealing = false, onSkip }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e) => setReducedMotion(e.matches);
    try {
      mediaQuery.addEventListener('change', handleMotionChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener?.(handleMotionChange);
    }

    // Lock body scrolling while intro overlay is visible
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Allow user to press Escape to instantly skip intro and navigate directly
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      try {
        mediaQuery.removeEventListener('change', handleMotionChange);
      } catch {
        mediaQuery.removeListener?.(handleMotionChange);
      }
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [onSkip]);

  return (
    <div
      className={`medibot-intro-overlay ${isRevealing ? 'is-revealing' : ''} ${
        reducedMotion ? 'reduced-motion' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Meet MediBot introduction"
    >
      {/* Decorative ambient background */}
      <div className="medibot-intro-backdrop" aria-hidden="true">
        <div className="medibot-intro-center-glow" />
        <div className="medibot-intro-ambient-arc arc-tl" />
        <div className="medibot-intro-ambient-arc arc-br" />
        <div className="medibot-intro-ambient-disc disc-tr" />
        <div className="medibot-intro-ambient-disc disc-bl" />
      </div>

      {/* Main Centered Content */}
      <div className="medibot-intro-container">
        {/* Stage with Glow Halo & Floating Robot */}
        <div className="medibot-intro-stage">
          {/* Outer Pulsing Aura */}
          <div className="medibot-intro-pulse-aura" />
          
          {/* Subtle Glowing Ring */}
          <div className="medibot-intro-glow-ring" />

          {/* Neomorphic Porcelain Podium */}
          <div className="medibot-intro-podium">
            {/* Smooth Floating Robot Wrapper */}
            <div className="medibot-intro-robot-wrap">
              <img
                src="/images/medibot-robot-avatar.png"
                alt="MediBot"
                className="medibot-intro-robot-img"
                loading="eager"
              />
            </div>
          </div>
        </div>

        {/* Text Presentation */}
        <div className="medibot-intro-text-group">
          {/* Status Badge */}
          <div className="medibot-intro-pill">
            <span className="medibot-intro-pill-dot" />
            <span>Healthcare Assistant</span>
          </div>

          <h1 className="medibot-intro-title">
            Meet <span className="medibot-intro-name">MediBot</span>
          </h1>

          <p className="medibot-intro-subtitle">
            Your healthcare information assistant
          </p>

          {/* Transition indicator dots */}
          <div
            className="medibot-intro-dots"
            aria-label="Opening assistant"
            title="Opening assistant..."
          >
            <span className="medibot-dot dot-1" />
            <span className="medibot-dot dot-2" />
            <span className="medibot-dot dot-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediBotIntroOverlay;
