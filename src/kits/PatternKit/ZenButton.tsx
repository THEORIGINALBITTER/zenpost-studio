/**
 * 🎛 ZenButton
 * Minimaler Button mit Fokus auf Klarheit und Haptik.
 */
export const ZenButton = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="px-4 py-2 rounded-md border border-neutral-700 bg-neutral-800 
               text-neutral-200 hover:border-neutral-400 hover:bg-neutral-700 transition-all duration-150"
  >
    {icon && <span className="mr-2">{icon}</span>}
    {label}
  </button>
);
