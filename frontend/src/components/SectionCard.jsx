/**
 * SectionCard — reusable card component for dashboard sections.
 * Props:
 *   icon         – Lucide icon component
 *   heading      – uppercase heading string
 *   headingColor – Tailwind text-color class + optional glow class
 *   borderColor  – Tailwind border-color class
 *   bgGradient   – inline style string for background gradient (optional)
 *   children     – card body content
 *   className    – extra Tailwind classes
 *   animDelay    – CSS animation-delay class suffix (optional)
 */
export default function SectionCard({
  icon: Icon,
  heading,
  headingColor = 'text-blue-400',
  borderColor = 'border-blue-900/50',
  bgGradient,
  children,
  className = '',
  animDelay = '',
}) {
  return (
    <div
      className={`relative rounded-xl border bg-[#080d1e]/90 backdrop-blur-sm p-6 card-hover-glow transition-all duration-300 fade-in-up ${animDelay} ${borderColor} ${className}`}
      style={bgGradient ? { background: bgGradient } : undefined}
    >
      {/* Subtle inner top-left corner gradient accent */}
      <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20 rounded-t-xl" />

      {/* Heading row */}
      <div className="flex items-center gap-2.5 mb-4">
        {Icon && (
          <span className={`flex-shrink-0 ${headingColor}`}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
        <h2 className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${headingColor} mono`}>
          {heading}
        </h2>
      </div>

      {/* Body */}
      <div>{children}</div>
    </div>
  );
}
