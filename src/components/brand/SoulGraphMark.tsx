import { cn } from '@/lib/utils';

/**
 * The SoulGraph mark: a small constellation — nodes connected by hairlines, one lit in
 * gold. A map of a person as a star chart. Decorative; aria-hidden by default.
 */
export function SoulGraphMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn('h-8 w-8', className)}
    >
      {/* edges */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round">
        <line x1="8" y1="12" x2="20" y2="7" />
        <line x1="20" y1="7" x2="32" y2="14" />
        <line x1="8" y1="12" x2="14" y2="26" />
        <line x1="14" y1="26" x2="20" y2="7" />
        <line x1="14" y1="26" x2="28" y2="30" />
        <line x1="28" y1="30" x2="32" y2="14" />
      </g>
      {/* dim nodes */}
      <g fill="currentColor" opacity="0.8">
        <circle cx="8" cy="12" r="1.6" />
        <circle cx="32" cy="14" r="1.6" />
        <circle cx="14" cy="26" r="1.6" />
        <circle cx="28" cy="30" r="1.6" />
        <circle cx="20" cy="7" r="1.6" />
      </g>
      {/* lit star (gold) */}
      <circle cx="20" cy="7" r="3" className="fill-primary" />
    </svg>
  );
}
