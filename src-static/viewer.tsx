import { useEffect, useState } from "react";

import { openSection } from "./components/section-open";

/**
 * Кто смотрит сайт: гость, клиент с подпиской или владелец.
 * Клиентская подписка хранится на сервере (api/auth.php, cookie-сессия),
 * поэтому все калькуляторы получают её через один маленький запрос.
 */
export type Viewer = { authed: boolean; subscribed: boolean; name: string } | null;

const cache: { value: Viewer; promise: Promise<Viewer> | null } = {
  value: null,
  promise: null,
};

function readApiBase(): string | null {
  const config = (window as unknown as { ASTRA_CONFIG?: { api?: { enabled?: boolean; base?: string } } })
    .ASTRA_CONFIG;
  if (!config?.api?.enabled) return null;
  return (config.api.base || "api").replace(/\/$/, "");
}

export function fetchViewer(): Promise<Viewer> {
  if (cache.promise) return cache.promise;
  const base = readApiBase();
  cache.promise = (async () => {
    if (!base) return null;
    try {
      const response = await fetch(`${base}/auth.php`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        authed?: boolean;
        user?: { subscribed?: boolean; name?: string };
      };
      cache.value = data.authed
        ? {
            authed: true,
            subscribed: Boolean(data.user?.subscribed),
            name: data.user?.name ?? "",
          }
        : null;
    } catch {
      cache.value = null;
    }
    return cache.value;
  })();
  return cache.promise;
}

/** Реагирует на статус подписки: у подписчика все разделы открыты. */
export function useViewer(): Viewer {
  const [viewer, setViewer] = useState<Viewer>(cache.value);
  useEffect(() => {
    let alive = true;
    void fetchViewer().then((value) => {
      if (alive) setViewer(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return viewer;
}

export interface LifeBlock {
  title: string;
  subtitle: string;
  /** id разделов разбора, которые открываются по клику на блок. */
  ids?: string[];
  /** Внешняя ссылка вместо раздела (например, страница чакр). */
  href?: string;
}

/**
 * «Жизненные блоки» — результат расчёта простым языком. Каждый блок —
 * вопрос из жизни, а не эзотерический термин; клик раскрывает
 * соответствующий раздел разбора. Закрытый блок ведёт в кабинет
 * (подписка открывает все тексты).
 */
export function LifeBlocks({
  blocks,
  freeIds,
  intro = "Главные вопросы — простыми словами. Нажмите на блок, чтобы открыть свой разбор:",
}: {
  blocks: LifeBlock[];
  freeIds: string[];
  intro?: string;
}) {
  const [paywall, setPaywall] = useState(false);
  return (
    <section className="life-blocks" aria-label="Разбор по жизненным вопросам">
      <p className="life-blocks__intro">{intro}</p>
      <div className="life-blocks__grid">
        {blocks.map((block) => {
          const targets = block.ids ?? [];
          const locked =
            targets.length > 0 && !targets.some((id) => freeIds.includes(id));
          const open = () => {
            for (const id of targets) {
              if (openSection(id)) return;
            }
          };
          const inner = (
            <>
              <span className={`life-block__lock${locked ? " is-locked" : ""}`}>
                {locked ? "🔒" : "✓"}
              </span>
              <strong>{block.title}</strong>
              <small>{block.subtitle}</small>
              <span className="life-block__hint">
                {locked ? "Открыть полный доступ" : "Открыть разбор"}
              </span>
            </>
          );
          if (locked) {
            return (
              <button
                key={block.title}
                type="button"
                className="life-block is-locked"
                onClick={() => setPaywall(true)}
              >
                {inner}
              </button>
            );
          }
          if (block.href) {
            return (
              <a key={block.title} className="life-block" href={block.href}>
                {inner}
              </a>
            );
          }
          return (
            <button key={block.title} type="button" className="life-block" onClick={open}>
              {inner}
            </button>
          );
        })}
      </div>
      {paywall ? <PaywallModal onClose={() => setPaywall(false)} /> : null}
    </section>
  );
}
/**
 * Красивое окно при клике на замочек: подписка на все разделы
 * или персональный PDF-гайд. Без еды текстом — два пути и закрытие.
 */
function PaywallModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="paywall-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="paywall-modal__close" aria-label="Закрыть" onClick={onClose}>
          ×
        </button>
        <span className="paywall-modal__seal" aria-hidden="true">
          Ж
        </span>
        <h3>Открой полный доступ ко всем разделам и прогнозам</h3>
        <p>
          Подписка открывает сразу все закрытые блоки по астрологии, матрице
          и чакрам. Или начни с персонального PDF-гайда на 20 страниц.
        </p>
        <div className="paywall-modal__actions">
          <a className="paywall-modal__btn paywall-modal__btn--primary" href="cabinet.html?paywall=1">
            Подписка — все разделы
          </a>
          <a className="paywall-modal__btn" href="store.html">
            PDF-гайд на 20 страниц
          </a>
        </div>
        <small>Отменить подписку можно в любой момент в личном кабинете.</small>
      </div>
    </div>
  );
}
