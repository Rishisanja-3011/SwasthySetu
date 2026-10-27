import React from 'react';
import './Skeleton.css';

/**
 * Base Primitive Skeleton
 */
export function Skeleton({
  width,
  height,
  circle = false,
  radius,
  style = {},
  className = '',
  ...props
}) {
  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(radius ? { borderRadius: radius } : {}),
    ...style,
  };

  const classes = [
    'skeleton',
    circle ? 'skeleton-circle' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} style={inlineStyles} aria-hidden="true" {...props} />;
}

/**
 * Text Lines Skeleton
 */
export function SkeletonText({
  lines = 2,
  width = '100%',
  size = 'md',
  style = {},
  className = '',
}) {
  const lineArray = Array.from({ length: lines });
  const widths = ['100%', '82%', '65%', '90%', '75%'];

  return (
    <div style={{ width, ...style }} className={className} aria-hidden="true">
      {lineArray.map((_, idx) => {
        const lineWidth = idx === lineArray.length - 1 && lines > 1 ? '60%' : widths[idx % widths.length];
        return (
          <Skeleton
            key={idx}
            className={`skeleton-text ${size}`}
            style={{ width: lineWidth }}
          />
        );
      })}
    </div>
  );
}

/**
 * Avatar Skeleton
 */
export function SkeletonAvatar({ size = 44, style = {}, className = '' }) {
  return (
    <Skeleton
      width={size}
      height={size}
      circle
      style={style}
      className={className}
    />
  );
}

/**
 * Button Skeleton
 */
export function SkeletonButton({
  width = '100%',
  height = 44,
  radius = 'var(--radius-md, 12px)',
  style = {},
  className = '',
}) {
  return (
    <Skeleton
      width={width}
      height={height}
      radius={radius}
      style={style}
      className={`skeleton-button ${className}`}
    />
  );
}

/**
 * Badge / Pill Skeleton
 */
export function SkeletonBadge({ width = 76, height = 22, style = {}, className = '' }) {
  return (
    <Skeleton
      width={width}
      height={height}
      radius="var(--radius-full, 9999px)"
      style={style}
      className={`skeleton-badge ${className}`}
    />
  );
}

/**
 * Input Skeleton
 */
export function SkeletonInput({ height = 44, style = {}, className = '' }) {
  return (
    <Skeleton
      height={height}
      radius="var(--radius-md, 12px)"
      style={style}
      className={`skeleton-input ${className}`}
    />
  );
}

/**
 * Card Skeleton Container
 */
export function SkeletonCard({ children, style = {}, className = '', ...props }) {
  return (
    <div className={`skeleton-card ${className}`} style={style} aria-busy="true" {...props}>
      {children}
    </div>
  );
}

/* =========================================================================
   COMPOSITE DOMAIN SKELETONS MATCHING SwasthSetu EXACT LAYOUTS
   ========================================================================= */

/**
 * Doctor Profile Card Skeleton
 * Used in: DoctorConfirmScreen, DoctorAccessPermissionScreen, VisitTypeScreen
 */
export function DoctorCardSkeleton({ style = {} }) {
  return (
    <SkeletonCard style={{ padding: '24px 22px', ...style }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <Skeleton width={56} height={56} radius="var(--radius-md, 14px)" />
        <div style={{ flex: 1 }}>
          <Skeleton width="55%" height={22} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={14} style={{ marginBottom: 10 }} />
          <SkeletonBadge width={120} height={20} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Skeleton width={16} height={16} circle />
          <Skeleton width="60%" height={14} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={16} height={16} circle />
          <Skeleton width="45%" height={14} />
        </div>
      </div>
    </SkeletonCard>
  );
}

/**
 * Patient Greeting Header Skeleton
 * Used in: HomeScreen top greeting card
 */
export function PatientHeaderSkeleton({ style = {} }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-xl, 24px)',
        padding: '24px 28px',
        marginBottom: 24,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      aria-busy="true"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBadge width={110} height={24} />
          <SkeletonBadge width={130} height={24} />
        </div>
        <SkeletonBadge width={120} height={24} />
      </div>
      <Skeleton width="42%" height={26} style={{ marginBottom: 10 }} />
      <Skeleton width="75%" height={14} style={{ marginBottom: 6 }} />
      <Skeleton width="50%" height={14} />
    </div>
  );
}

/**
 * Diagnostic Report Card Skeleton
 * Used in: HomeScreen (preview), ReportsScreen (full list)
 */
export function ReportCardSkeleton({ count = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ padding: '18px 20px', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Skeleton width="48%" height={18} />
                <SkeletonBadge width={64} height={18} />
              </div>
              <Skeleton width="34%" height={13} />
            </div>
            <Skeleton width={80} height={16} radius={4} />
          </div>

          <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px 0', flexWrap: 'wrap' }}>
            <Skeleton width={110} height={28} radius={8} />
            <Skeleton width={120} height={28} radius={8} />
            <Skeleton width={105} height={28} radius={8} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <Skeleton width={130} height={13} />
            <Skeleton width={80} height={13} />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

/**
 * Report Detail Screen Skeleton
 * Used in: ReportDetailScreen
 */
export function ReportDetailSkeleton() {
  return (
    <div className="fade-in page-centered-container" style={{ maxWidth: 980, padding: '8px 0' }} aria-busy="true">
      <Skeleton width={130} height={32} radius={8} style={{ marginBottom: 16 }} />

      {/* Header Card */}
      <SkeletonCard style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Skeleton width={220} height={24} />
              <SkeletonBadge width={70} height={22} />
            </div>
            <Skeleton width={160} height={14} />
          </div>
          <Skeleton width={90} height={22} radius={6} />
        </div>

        <Skeleton height={68} radius={10} style={{ marginBottom: 16 }} />
        <SkeletonButton height={40} radius={8} />
      </SkeletonCard>

      {/* Observations Grid Card */}
      <SkeletonCard style={{ padding: '20px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Skeleton width={180} height={20} />
          <Skeleton width={110} height={14} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <Skeleton width={140} height={16} style={{ marginBottom: 6 }} />
                <Skeleton width={90} height={12} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton width={60} height={20} />
                <SkeletonBadge width={54} height={20} />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

/**
 * Health Timeline Skeleton
 * Used in: TimelineScreen
 */
export function TimelineSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ position: 'relative' }}>
          {/* Timeline Marker Dot */}
          <div
            style={{
              position: 'absolute',
              left: -24,
              top: 14,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Skeleton width={8} height={8} circle />
          </div>

          <SkeletonCard style={{ padding: '14px 18px', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton width={18} height={18} circle />
                <Skeleton width={160} height={16} />
              </div>
              <Skeleton width={70} height={12} />
            </div>
            <Skeleton width="45%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={12} />
          </SkeletonCard>
        </div>
      ))}
    </div>
  );
}

/**
 * Waiting Room Queue Card Skeleton
 * Used in: WaitingRoomScreen
 */
export function WaitingRoomQueueSkeleton() {
  return (
    <div aria-busy="true">
      {/* Top Header Placeholder */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Skeleton width={180} height={22} radius={20} style={{ margin: '0 auto 10px auto' }} />
        <Skeleton width={220} height={26} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={260} height={14} style={{ margin: '0 auto' }} />
      </div>

      <div className="waiting-room-grid">
        {/* Left Column: Live Queue Status & Consultation Step */}
        <div>
          {/* Big Queue Ticket Skeleton */}
          <SkeletonCard style={{
            textAlign: 'center',
            padding: '24px 22px',
            marginBottom: 20,
            borderRadius: 16,
          }}>
            <Skeleton width={130} height={14} style={{ margin: '0 auto 10px auto' }} />
            <Skeleton width={110} height={52} radius={12} style={{ margin: '0 auto 12px auto' }} />
            <SkeletonBadge width={160} height={24} style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <Skeleton width={190} height={14} style={{ margin: '0 auto 8px auto' }} />
            <Skeleton width={240} height={12} style={{ margin: '0 auto' }} />
          </SkeletonCard>

          {/* Consultation State Card Skeleton */}
          <SkeletonCard style={{ textAlign: 'center', padding: 24, marginBottom: 20, borderRadius: 16 }}>
            <Skeleton width={64} height={64} circle style={{ margin: '0 auto 14px auto' }} />
            <Skeleton width={180} height={20} style={{ margin: '0 auto 8px auto' }} />
            <Skeleton width={280} height={14} style={{ margin: '0 auto' }} />
          </SkeletonCard>
        </div>

        {/* Right Column: Confirmed Intake Summary & Bounded Access */}
        <div>
          {/* Confirmed Intake Card Skeleton */}
          <SkeletonCard style={{ padding: 22, marginBottom: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Skeleton width={160} height={18} />
              <SkeletonBadge width={80} height={20} />
            </div>
            <Skeleton width="65%" height={20} style={{ marginBottom: 10 }} />
            <Skeleton width="45%" height={14} style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <SkeletonBadge width={90} height={24} />
              <SkeletonBadge width={80} height={24} />
            </div>
            <Skeleton height={50} radius={8} />
          </SkeletonCard>

          {/* Privacy & Bounded Policy Skeleton */}
          <SkeletonCard style={{ padding: 18, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Skeleton width={20} height={20} circle />
              <Skeleton width={140} height={16} />
            </div>
            <SkeletonText lines={2} />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

/**
 * Doctor Dashboard Summary Stats Skeleton
 * Used in: DoctorDashboardScreen 4 stats row
 */
export function DoctorDashboardStatsSkeleton() {
  return (
    <div className="doctor-stats-grid" aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="stat-card">
          <Skeleton width={44} height={44} radius="var(--radius-md, 12px)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="45%" height={24} style={{ marginBottom: 4 }} />
            <Skeleton width="75%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Doctor Patient Queue Rows Skeleton
 * Used in: DoctorDashboardScreen left column
 */
export function DoctorQueueRowsSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md, 12px)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle, #E2E5F0)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <Skeleton width={24} height={24} circle />
              <Skeleton width="50%" height={15} />
            </div>
            <SkeletonBadge width={56} height={18} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width={70} height={12} />
            <SkeletonBadge width={65} height={18} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Doctor Selected Patient Detail Panel Skeleton
 * Used in: DoctorDashboardScreen right column
 */
export function DoctorPatientDetailSkeleton() {
  return (
    <div style={{ padding: '24px 28px' }} aria-busy="true">
      {/* Patient Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Skeleton width={180} height={24} />
            <SkeletonBadge width={70} height={20} />
            <SkeletonBadge width={90} height={20} />
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Skeleton width={80} height={14} />
            <Skeleton width={100} height={14} />
            <Skeleton width={120} height={14} />
          </div>
        </div>
        <Skeleton width={120} height={38} radius={10} />
      </div>

      {/* Lifecycle Stepper Skeleton */}
      <Skeleton height={46} radius={10} style={{ marginBottom: 24 }} />

      {/* Clinical Breakdown Card */}
      <SkeletonCard style={{ padding: 20, marginBottom: 20 }}>
        <Skeleton width={160} height={18} style={{ marginBottom: 14 }} />
        <Skeleton width="85%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Skeleton width={100} height={26} radius={6} />
          <Skeleton width={110} height={26} radius={6} />
        </div>
        <Skeleton height={60} radius={8} />
      </SkeletonCard>
    </div>
  );
}

/**
 * Landing Hero Live Status Skeleton
 * Used in: LandingPage hero clinic preview
 */
export function LandingLiveStatusSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} aria-busy="true">
      <Skeleton width={36} height={36} circle />
      <div>
        <Skeleton width={140} height={15} style={{ marginBottom: 4 }} />
        <Skeleton width={180} height={12} />
      </div>
    </div>
  );
}

/**
 * Symptom Structuring Skeleton
 * Used in: IntakeReviewScreen and SymptomIntakeScreen during speech analysis
 */
export function SymptomStructuringSkeleton() {
  return (
    <SkeletonCard style={{ padding: 22, border: '2px solid var(--border-subtle)' }} aria-busy="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Skeleton width={150} height={18} />
        <SkeletonBadge width={80} height={20} />
      </div>
      <Skeleton width="70%" height={22} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="40%" height={16} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SkeletonBadge width={90} height={26} />
        <SkeletonBadge width={100} height={26} />
        <SkeletonBadge width={85} height={26} />
      </div>
    </SkeletonCard>
  );
}

/**
 * Home Action Card Skeleton (Column 1 QR / Manual Code)
 * Used in: HomeScreen
 */
export function HomeActionCardSkeleton() {
  return (
    <SkeletonCard style={{
      padding: '26px 22px',
      textAlign: 'center',
      marginBottom: 24,
      borderRadius: 'var(--radius-lg, 16px)',
    }}>
      {/* QR Icon Box Skeleton */}
      <Skeleton
        width={76}
        height={76}
        radius="var(--radius-xl, 20px)"
        style={{ margin: '0 auto 18px auto' }}
      />
      <Skeleton width="65%" height={24} style={{ margin: '0 auto 10px auto' }} />
      <Skeleton width="85%" height={14} style={{ margin: '0 auto 6px auto' }} />
      <Skeleton width="55%" height={14} style={{ margin: '0 auto 20px auto' }} />

      {/* Primary Action Button Skeleton */}
      <SkeletonButton height={48} radius="var(--radius-md, 12px)" style={{ marginBottom: 20 }} />

      {/* Manual Code Input Row Skeleton */}
      <div style={{
        paddingTop: 18,
        borderTop: '1px solid var(--border-subtle, #E2E5F0)',
      }}>
        <Skeleton width={180} height={13} style={{ margin: '0 auto 14px auto' }} />
        <div style={{ display: 'flex', gap: 10, maxWidth: 360, margin: '0 auto' }}>
          <SkeletonInput height={44} style={{ flex: 1 }} />
          <Skeleton width={100} height={44} radius="var(--radius-md, 12px)" />
        </div>
      </div>
    </SkeletonCard>
  );
}

/**
 * Home Tip Card Skeleton (Column 2 Quick Info)
 * Used in: HomeScreen
 */
export function HomeTipCardSkeleton() {
  return (
    <div style={{
      marginTop: 18,
      padding: '16px 18px',
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-lg, 16px)',
      border: '1px solid var(--border-subtle, #E2E5F0)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
    }} aria-busy="true">
      <Skeleton width={36} height={36} circle style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton width="45%" height={15} style={{ marginBottom: 6 }} />
        <Skeleton width="90%" height={12} style={{ marginBottom: 4 }} />
        <Skeleton width="60%" height={12} />
      </div>
    </div>
  );
}

/**
 * Doctor Confirmation Screen Skeleton
 * Used in: DoctorConfirmScreen
 */
export function DoctorConfirmSkeleton() {
  return (
    <div className="page-centered-container" style={{ maxWidth: 620, padding: '12px 0' }} aria-busy="true">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SkeletonBadge width={170} height={26} style={{ margin: '0 auto 12px auto' }} />
        <Skeleton width={220} height={26} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={380} height={14} style={{ margin: '0 auto' }} />
      </div>

      <SkeletonCard style={{
        padding: '24px 22px',
        borderRadius: 'var(--radius-lg, 16px)',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
          <Skeleton width={58} height={58} radius="var(--radius-md, 14px)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="55%" height={22} style={{ marginBottom: 6 }} />
            <Skeleton width="70%" height={14} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <SkeletonBadge width={70} height={20} />
              <SkeletonBadge width={90} height={20} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle, #E2E5F0)', paddingTop: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Skeleton width={16} height={16} circle />
            <Skeleton width="60%" height={14} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton width={16} height={16} circle />
            <Skeleton width="45%" height={14} />
          </div>
        </div>

        <SkeletonButton height={48} radius="var(--radius-md, 12px)" style={{ marginBottom: 12 }} />
        <SkeletonButton height={44} radius="var(--radius-md, 12px)" />
      </SkeletonCard>
    </div>
  );
}

/**
 * Visit Type Screen Skeleton
 * Used in: VisitTypeScreen
 */
export function VisitTypeSkeleton() {
  return (
    <div className="page-centered-container" style={{ maxWidth: 840, padding: '8px 0' }} aria-busy="true">
      <Skeleton width={76} height={34} radius={8} style={{ marginBottom: 18 }} />

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Skeleton width={260} height={26} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={320} height={14} style={{ margin: '0 auto' }} />
      </div>

      <div className="visit-type-grid">
        {[1, 2].map((i) => (
          <SkeletonCard key={i} style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <Skeleton width={46} height={46} radius={12} />
              <SkeletonBadge width={76} height={22} />
            </div>
            <Skeleton width="65%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonText lines={2} style={{ marginBottom: 16 }} />
            <div style={{ borderTop: '1px solid var(--border-subtle, #E2E5F0)', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Skeleton width={14} height={14} circle />
                <Skeleton width="80%" height={13} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Skeleton width={14} height={14} circle />
                <Skeleton width="70%" height={13} />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/**
 * Doctor Access Permission Screen Skeleton
 * Used in: DoctorAccessPermissionScreen
 */
export function DoctorPermissionSkeleton() {
  return (
    <div className="page-centered-container" style={{ maxWidth: 680, padding: '8px 0' }} aria-busy="true">
      <Skeleton width={76} height={34} radius={8} style={{ marginBottom: 18 }} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SkeletonBadge width={220} height={24} style={{ margin: '0 auto 10px auto' }} />
        <Skeleton width={380} height={26} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={440} height={14} style={{ margin: '0 auto' }} />
      </div>

      <SkeletonCard style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <Skeleton width={48} height={48} circle />
          <div style={{ flex: 1 }}>
            <Skeleton width={180} height={18} style={{ marginBottom: 6 }} />
            <Skeleton width={240} height={13} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ border: '1px solid var(--border-subtle, #E2E5F0)', padding: 14, borderRadius: 12 }}>
              <Skeleton width="45%" height={16} style={{ marginBottom: 6 }} />
              <Skeleton width="80%" height={13} />
            </div>
          ))}
        </div>

        <SkeletonButton height={48} radius={12} style={{ marginBottom: 12 }} />
        <SkeletonButton height={42} radius={12} />
      </SkeletonCard>
    </div>
  );
}

/**
 * Symptom Intake Screen Skeleton
 * Used in: SymptomIntakeScreen
 */
export function SymptomIntakeScreenSkeleton() {
  return (
    <div className="page-centered-container" style={{ maxWidth: 720, padding: '8px 0' }} aria-busy="true">
      <Skeleton width={76} height={34} radius={8} style={{ marginBottom: 20 }} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SkeletonBadge width={140} height={22} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={240} height={26} style={{ margin: '0 auto 6px auto' }} />
        <Skeleton width={360} height={14} style={{ margin: '0 auto' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <Skeleton width={140} height={42} radius={10} />
        <Skeleton width={140} height={42} radius={10} />
      </div>

      <SkeletonCard style={{ padding: 28, borderRadius: 16, textAlign: 'center' }}>
        <Skeleton width={120} height={14} style={{ margin: '0 auto 16px auto' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <SkeletonBadge width={80} height={26} />
          <SkeletonBadge width={80} height={26} />
          <SkeletonBadge width={80} height={26} />
          <SkeletonBadge width={80} height={26} />
        </div>
        <Skeleton width={88} height={88} circle style={{ margin: '0 auto 20px auto' }} />
        <Skeleton width={160} height={18} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={260} height={13} style={{ margin: '0 auto' }} />
      </SkeletonCard>
    </div>
  );
}

/**
 * Intake Review Screen Skeleton
 * Used in: IntakeReviewScreen
 */
export function IntakeReviewSkeleton() {
  return (
    <div className="page-centered-container" style={{ maxWidth: 960, padding: '8px 0' }} aria-busy="true">
      <Skeleton width={76} height={34} radius={8} style={{ marginBottom: 18 }} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SkeletonBadge width={130} height={22} style={{ margin: '0 auto 8px auto' }} />
        <Skeleton width={280} height={26} style={{ margin: '0 auto 6px auto' }} />
        <Skeleton width={380} height={14} style={{ margin: '0 auto' }} />
      </div>

      <div className="intake-review-grid">
        {/* Left Column: Spoken Input Card */}
        <SkeletonCard style={{ padding: 22, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <SkeletonBadge width={110} height={22} />
            <SkeletonBadge width={60} height={18} />
          </div>
          <SkeletonText lines={4} style={{ marginBottom: 16 }} />
          <Skeleton width="60%" height={12} />
        </SkeletonCard>

        {/* Right Column: AI Structured Card */}
        <SkeletonCard style={{ padding: 22, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <SkeletonBadge width={130} height={22} />
            <Skeleton width={20} height={20} circle />
          </div>
          <Skeleton width="75%" height={22} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="40%" height={16} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <SkeletonBadge width={90} height={24} />
            <SkeletonBadge width={100} height={24} />
          </div>
          <Skeleton height={44} radius={8} />
        </SkeletonCard>
      </div>

      <SkeletonButton height={50} radius={12} style={{ marginTop: 24 }} />
    </div>
  );
}

