import type { SimpleGuideItem } from "@/lib/interpretation/simple";
import { LockIcon } from "@/components/icons";

/**
 * «Матрица простыми словами»: бытовые ответы к точкам схемы.
 *
 * Каждый пункт — кнопка: при нажатии соответствующая точка подсвечивается
 * в схеме выше (`onHighlight`). Так видно, откуда взят ответ. Закрытые пункты
 * показывают только тему и где она в схеме.
 */
export function SimpleGuideGrid({
  items,
  active,
  onHighlight,
  onRequest,
}: {
  items: SimpleGuideItem[];
  active: string[] | null;
  onHighlight: (keys: string[] | null) => void;
  /** Открыть форму запроса гайда (для закрытых пунктов). */
  onRequest?: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const isActive = active?.includes(item.pointKey) ?? false;
        if (item.premium) {
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-white/60 p-3.5"
            >
              <p className="text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">{item.where}</p>
              <p className="mt-1 flex items-start gap-2 font-[family-name:var(--font-display)] text-[1.02rem] leading-snug text-[var(--ocean)]">
                <LockIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-[#9c7b4c]" />
                {item.title}
              </p>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
                Ответ по энергии {item.label} открывается в полном гайде.
              </p>
              {onRequest ? (
                <button
                  type="button"
                  className="mt-2 text-[0.82rem] text-[var(--turquoise-deep)] underline decoration-dotted underline-offset-2"
                  onClick={onRequest}
                >
                  Получить гайд
                </button>
              ) : null}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onHighlight(isActive ? null : [item.pointKey])}
            className={`rounded-[var(--radius-md)] border p-3.5 text-left transition ${
              isActive
                ? "border-[rgba(59,123,131,0.75)] bg-[rgba(240,250,251,0.95)]"
                : "border-[var(--line)] bg-white hover:border-[rgba(59,123,131,0.4)]"
            }`}
          >
            <p className="text-[0.72rem] uppercase tracking-[0.1em] text-[var(--ink-faint)]">
              {item.where} · {item.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[1.02rem] leading-snug text-[var(--ocean)]">
              {item.title}
            </p>
            <p className="mt-1.5 text-[0.86rem] leading-relaxed text-[var(--ink)]">{item.text}</p>
            <p className="mt-1.5 text-[0.74rem] text-[var(--turquoise-deep)]">
              {isActive ? "Показано в схеме ↑" : "Показать в схеме ↑"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
