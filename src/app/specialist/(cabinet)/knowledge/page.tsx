import { loadEntries, loadSources, knowledgeStats } from "@/lib/knowledge/queries";
import { DocumentIcon, StarIcon } from "@/components/icons";
import { KnowledgeEditor } from "@/components/cabinet/KnowledgeEditor";

export const dynamic = "force-dynamic";

const DOMAIN_TITLES: Record<string, string> = {
  sign: "Знаки зодиака",
  planet: "Планеты",
  house: "Дома",
  aspect: "Аспекты",
  element: "Стихии",
  modality: "Кресты",
  arcana: "Арканы Матрицы",
  position: "Позиции Матрицы",
};

export default function KnowledgePage() {
  const stats = knowledgeStats();
  const sources = loadSources();
  const domains = ["sign", "planet", "house", "aspect", "element", "modality", "arcana", "position"];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--ocean)]">База знаний</h1>
        <p className="mt-1 text-[0.86rem] text-[var(--ink-soft)]">
          {stats.entries} записей и {stats.sources} источников. Тексты трактовок — оригинальные формулировки проекта.
        </p>
      </div>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
          <StarIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
          Источники
        </h2>
        <ul className="mt-3 grid gap-2">
          {sources.map((source) => (
            <li key={source.id} className="rounded-[10px] border border-[var(--line)] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[0.86rem] font-medium text-[var(--ocean)]">{source.title}</p>
                <p className="text-[0.72rem] text-[var(--ink-faint)]">проверено {source.accessedAt}</p>
              </div>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">{source.note}</p>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 inline-block text-[0.74rem] text-[var(--turquoise-deep)] underline"
                >
                  {source.url}
                </a>
              ) : (
                <p className="mt-1 text-[0.72rem] text-[var(--ink-faint)]">внутренний источник без внешнего URL</p>
              )}
              <p className="mt-1 text-[0.7rem] text-[var(--ink-faint)]">Издатель: {source.publisher}</p>
            </li>
          ))}
        </ul>
      </section>

      {domains.map((domain) => {
        const entries = loadEntries(domain);
        if (entries.length === 0) return null;
        return (
          <section key={domain} className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
              <DocumentIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              {DOMAIN_TITLES[domain] ?? domain}
              <span className="text-[0.72rem] font-normal text-[var(--ink-faint)]">{entries.length}</span>
            </h2>
            <details className="mt-2">
              <summary className="cursor-pointer text-[0.8rem] text-[var(--turquoise-deep)]">показать записи</summary>
              <ul className="mt-2 grid gap-2">
                {entries.map((entry) => (
                  <li key={entry.id} className="rounded-[10px] border border-[var(--line)] p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[0.86rem] font-medium text-[var(--ocean)]">{entry.title}</p>
                      <p className="text-[0.7rem] text-[var(--ink-faint)]">
                        {entry.methodology} · v{entry.version}
                      </p>
                    </div>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-[var(--ink)]">{entry.summary}</p>
                    {entry.positive.length > 0 ? (
                      <p className="mt-1.5 text-[0.76rem] text-[#2f6570]">+ {entry.positive.join("; ")}</p>
                    ) : null}
                    {entry.shadow.length > 0 ? (
                      <p className="mt-1 text-[0.76rem] text-[#8a5d7c]">− {entry.shadow.join("; ")}</p>
                    ) : null}
                    {entry.source?.title ? (
                      <p className="mt-1 text-[0.7rem] text-[var(--ink-faint)]">Источник: {entry.source.title}</p>
                    ) : null}
                    <KnowledgeEditor entry={entry} sources={sources} />
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}
