import { useState, type ReactNode } from "react";
import { ChevronDown, Clock } from "lucide-react";

interface Props {
  time: string;
  count: number;
  /** Texte du libellé : "commande" / "produit"... Défaut "commande" */
  label?: string;
  /** Si vrai, le bloc est déployé par défaut (typiquement quand count === 1). */
  defaultOpen?: boolean;
  /** Couleur d'accent optionnelle (classes tailwind, ex: "border-status-prepare/40"). */
  accentClass?: string;
  children: ReactNode;
}

export function TimeSlotGroup({
  time,
  count,
  label = "commande",
  defaultOpen,
  accentClass = "border-border",
  children,
}: Props) {
  const initiallyOpen = defaultOpen ?? count <= 1;
  const [open, setOpen] = useState(initiallyOpen);
  const plural = count > 1 ? `${label}s` : label;

  return (
    <section className={`mb-3 rounded-2xl border-2 ${accentClass} bg-card shadow-sm`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-bold">{time}</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-sm font-bold text-primary">
            {count} {plural}
          </span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}
