import type { FaqItem } from "@/lib/types";
import { ChevronDownIcon } from "@/components/icons";

export function FaqList({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details
          key={item.id}
          className="group rounded-[var(--radius-md)] border border-[var(--line)] bg-white/80 px-5 py-1 transition-colors open:border-[var(--line-gold)] open:bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.97rem] font-semibold text-[var(--ocean)] [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-[var(--ink-soft)] transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="pb-4 pr-6 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
