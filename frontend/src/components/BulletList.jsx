/**
 * BulletList — renders a styled bullet list with optional icon dot.
 * Props:
 *   items     – array of strings
 *   dotColor  – Tailwind bg-color class for the bullet dot
 */
export default function BulletList({ items = [], dotColor = 'bg-blue-500' }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}
            aria-hidden="true"
          />
          <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}
