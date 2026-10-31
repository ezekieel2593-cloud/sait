import { CHAKRAS, CHAKRAS_INTRO, CHAKRAS_MATRIX_NOTE } from "@/lib/knowledge/chakras";
import { CheckIcon, SparkleIcon } from "@/components/icons";

/**
 * Отдельная страница «Чакры».
 *
 * Справочник по семи основным чакрам: где расположены, за что отвечают
 * в традиции, как выглядят в балансе и в дисбалансе, что помогает и в каких
 * точках схемы Матрицы судьбы смотреть эту тему.
 *
 * Страница общая: расчёта по дате здесь нет, потому что числовые формулы
 * чакр в школе описаны по-разному (см. ограничения в engine.ts).
 */

const SHORT_LABELS: Record<string, string> = {
  muladhara: "опора",
  svadhisthana: "желания",
  manipura: "воля",
  anahata: "любовь",
  vishuddha: "голос",
  ajna: "ясность",
  sahasrara: "смысл",
};

const COLOR_HEX: Record<string, string> = {
  "Красный": "#d98a8a",
  "Оранжевый": "#e6b183",
  "Жёлтый": "#e6cf84",
  "Зелёный": "#a9cfa9",
  "Голубой": "#9fc6dc",
  "Синий": "#9aa8d6",
  "Фиолетовый": "#bca6d6",
};

/** Вертикальная колонка чакр: простая схема «снизу вверх», как читают матрицу. */
function ChakraColumn() {
  const step = 64;
  const height = step * CHAKRAS.length + 60;
  return (
    <svg
      viewBox={`0 0 320 ${height}`}
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label="Семь чакр снизу вверх: муладхара, свадхистана, манипура, анахата, вишудха, аджна, сахасрара"
    >
      <line x1="60" y1="30" x2="60" y2={height - 30} stroke="rgba(122,108,112,0.3)" strokeWidth="1.2" />
      {CHAKRAS.map((chakra, index) => {
        const y = height - 40 - index * step;
        const color = COLOR_HEX[chakra.color] ?? "#cbb8c9";
        return (
          <g key={chakra.id}>
            <circle cx="60" cy={y} r="19" fill={color} stroke="rgba(90,70,80,0.22)" />
            <text
              x="60"
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontWeight="600"
              fontSize="16"
              fill="#3f3242"
            >
              {chakra.number}
            </text>
            <text x="90" y={y - 3} fontSize="13" fontWeight="600" fill="#3a4a52">
              {chakra.sanskrit}
            </text>
            <text x="90" y={y + 13} fontSize="11" fill="#7b6c73">
              {SHORT_LABELS[chakra.id]} · {chakra.color.toLowerCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChakrasPage() {
  return (
    <div className="container py-8 sm:py-12">
      <div className="container--measure mx-auto">
        <p className="eyebrow">Справочник</p>
        <h1 className="h-display mt-3">Семь чакр: опора, желания, воля, сердце, голос, ясность и смысл</h1>
        <p className="lead mt-4">{CHAKRAS_INTRO}</p>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
          В классической системе семь основных чакр. Кроме них в традициях упоминают восьмую точку над макушкой и
          малые чакры — на ладонях и стопах; в этой школе работают с семью, поэтому здесь описаны именно они.
        </p>

        <nav className="mt-5 flex flex-wrap gap-1.5" aria-label="Чакры">
          {CHAKRAS.map((chakra) => (
            <a
              key={chakra.id}
              href={`#chakra-${chakra.number}`}
              className="rounded-full border border-[var(--line)] bg-white/70 px-3 py-1.5 text-[0.82rem] text-[var(--ink)] transition-colors hover:border-[var(--turquoise-deep)] hover:text-[var(--ocean)]"
            >
              <span className="font-semibold text-[var(--turquoise-deep)]">{chakra.number}</span> {chakra.sanskrit}
            </a>
          ))}
        </nav>
      </div>

      <section className="container--measure mx-auto mt-8 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/70 p-4 sm:p-5">
        <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
          <ChakraColumn />
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] leading-snug text-[var(--ocean)]">
              Как чакры связаны с Матрицей судьбы
            </h2>
            <p className="mt-2 text-[0.94rem] leading-relaxed text-[var(--ink)]">{CHAKRAS_MATRIX_NOTE}</p>
            <ul className="mt-3 grid gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
              <li className="flex gap-2">
                <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7b83]" />
                <span>
                  <span className="font-semibold">Низ схемы</span> — опора, тело и род: муладхара.
                </span>
              </li>
              <li className="flex gap-2">
                <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7b83]" />
                <span>
                  <span className="font-semibold">Нижние каналы</span> — желания, партнёрство и деньги: свадхистана.
                </span>
              </li>
              <li className="flex gap-2">
                <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7b83]" />
                <span>
                  <span className="font-semibold">Центр</span> — воля, сила и комфорт: манипура; сердце схемы — анахата.
                </span>
              </li>
              <li className="flex gap-2">
                <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7b83]" />
                <span>
                  <span className="font-semibold">Верхняя ось</span> — голос, талант, видение и смысл: вишудха, аджна,
                  сахасрара.
                </span>
              </li>
            </ul>
            <a href="matrix.html" className="btn btn--secondary btn--sm mt-4">
              Посмотреть свою схему
            </a>
          </div>
        </div>
      </section>

      <div className="container--measure mx-auto mt-8 grid gap-4">
        {CHAKRAS.map((chakra) => (
          <article
            key={chakra.id}
            id={`chakra-${chakra.number}`}
            className="card scroll-mt-24 p-4 sm:p-5"
          >
            <header className="flex items-start gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] text-[1.2rem] font-semibold"
                style={{ background: COLOR_HEX[chakra.color] ?? "#cbb8c9", color: "#3f3242" }}
                aria-hidden="true"
              >
                {chakra.number}
              </span>
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-[1.32rem] leading-snug text-[var(--ocean)]">
                  {chakra.title}
                </h2>
                <p className="mt-0.5 text-[0.82rem] text-[var(--ink-soft)]">
                  {chakra.sanskrit} · {chakra.russian}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-[1rem] italic leading-relaxed text-[var(--turquoise-deep)]">
                  {chakra.essence}
                </p>
              </div>
            </header>

            <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Где в теле", chakra.place],
                ["Сфера жизни", chakra.sphere],
                ["Стихия", chakra.element],
                ["Цвет традиции", chakra.color],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 px-3 py-2">
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[0.88rem] leading-snug text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-sm)] border border-[rgba(184,221,224,0.9)] bg-[rgba(244,251,251,0.8)] p-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#3b7b83]">В балансе</p>
                <ul className="mt-2 grid gap-1.5">
                  {chakra.balance.map((item) => (
                    <li key={item} className="flex gap-2 text-[0.88rem] leading-snug text-[var(--ink)]">
                      <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b7b83]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 p-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Признаки дисбаланса
                </p>
                <ul className="mt-2 grid gap-1.5">
                  {chakra.imbalance.map((item) => (
                    <li key={item} className="flex gap-2 text-[0.88rem] leading-snug text-[var(--ink-soft)]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ink-faint)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 p-3">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Что помогает
              </p>
              <ul className="mt-2 grid gap-1.5">
                {chakra.practice.map((item) => (
                  <li key={item} className="flex gap-2 text-[0.88rem] leading-relaxed text-[var(--ink)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--turquoise-deep)]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 rounded-[var(--radius-sm)] border-l-2 border-[rgba(184,221,224,0.95)] bg-[rgba(246,240,236,0.7)] px-3 py-2 text-[0.86rem] leading-relaxed text-[var(--ink-soft)]">
              <span className="font-semibold text-[#3b7b83]">Связь с матрицей: </span>
              {chakra.matrix}
            </p>
          </article>
        ))}
      </div>

      <div className="container--measure mx-auto mt-8 rounded-[var(--radius-md)] border border-[var(--line)] bg-white/70 p-4 text-[0.86rem] leading-relaxed text-[var(--ink-soft)]">
        <p>
          <span className="font-semibold text-[var(--ocean)]">Важно.</span> Описания чакр — символическая модель
          традиции, а не медицинская информация. Признаки дисбаланса не являются симптомами болезни: со здоровьем
          работает врач. Чакровая карта в Матрице судьбы у разных авторов считается по разным формулам, поэтому мы
          не выдаём её за расчёт — на странице{" "}
          <a href="matrix.html" className="underline decoration-dotted underline-offset-2">
            Матрицы судьбы
          </a>{" "}
          показаны сами точки схемы, а эта страница объясняет, как их читают.
        </p>
      </div>
    </div>
  );
}
