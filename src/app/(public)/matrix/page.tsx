import type { Metadata } from "next";
import Link from "next/link";
import { MatrixForm } from "@/components/forms/MatrixForm";
import { getSettings } from "@/lib/settings";
import { PearlDivider } from "@/components/site/Ornaments";
import { CheckIcon, CrystalIcon, DocumentIcon, SparkleIcon, StarIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Матрица судьбы по дате рождения",
  description:
    "Рассчитайте Матрицу судьбы по 22 арканам: личный и родовой квадрат, денежный канал, канал отношений и энергии года. Бесплатный расчёт по формуле метода.",
  alternates: { canonical: "/matrix" },
  openGraph: {
    title: "Матрица судьбы по дате рождения",
    description: "Расчёт по 22 старшим арканам: центр, личный и родовой квадрат, каналы денег и отношений.",
    url: "/matrix",
  },
};

export default function MatrixPage() {
  const settings = getSettings();

  const positions = [
    { label: "Центр", text: "Зона комфорта и главная энергия" },
    { label: "Точка дня", text: "Характер и способ действовать" },
    { label: "Точка месяца", text: "Таланты, данные от рождения" },
    { label: "Точка года", text: "Родовые программы" },
    { label: "Нижняя точка", text: "Кармическая задача" },
    { label: "Родовой квадрат", text: "Линии отца и матери" },
    { label: "Денежный канал", text: "Как приходят и удерживаются деньги" },
    { label: "Канал отношений", text: "Как строятся близость и партнёрство" },
  ];

  return (
    <>
      <section className="relative overflow-hidden pb-6 pt-6 sm:pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_70%_0%,rgba(220,197,217,0.55),transparent_70%),radial-gradient(50%_50%_at_20%_0%,rgba(184,221,224,0.45),transparent_70%)]" />
        <div className="container grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="animate-in">
            <p className="eyebrow">Матрица судьбы · 22 аркана</p>
            <h1 className="h-display mt-4">
              Ваш код
              <br />
              <span className="italic text-[#a8799b]">по дате рождения</span>
            </h1>
            <p className="lead mt-5 max-w-xl">
              Дата рождения сводится к числам от 1 до 22 — старшим арканам Таро. Из них строится схема:
              центр, личный и родовой квадрат, каналы денег и отношений. Нужна только дата.
            </p>

            <div className="mt-6 rounded-[var(--radius-lg)] border border-[rgba(220,197,217,0.9)] bg-[linear-gradient(158deg,#fdf9fc_0%,#f7eff5_100%)] p-5">
              <p className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#8a5d7c]">
                <CrystalIcon className="h-4 w-4" /> Как считается
              </p>
              <ol className="mt-3 grid gap-2 text-[0.88rem] leading-relaxed text-[var(--ink)]">
                <li>
                  <strong className="text-[var(--ocean)]">A</strong> — день рождения, сведённый до 22 сложением цифр.
                </li>
                <li>
                  <strong className="text-[var(--ocean)]">B</strong> — месяц рождения.
                </li>
                <li>
                  <strong className="text-[var(--ocean)]">C</strong> — сумма цифр года рождения.
                </li>
                <li>
                  <strong className="text-[var(--ocean)]">D</strong> — сумма A + B + C, нижняя точка.
                </li>
                <li>
                  <strong className="text-[var(--ocean)]">Центр</strong> — сумма всех четырёх углов.
                </li>
              </ol>
              <div className="mt-3 rounded-[var(--radius-sm)] bg-white/70 px-3 py-2 text-[0.8rem] text-[var(--ink-soft)]">
                Пример: 23.06.1992 → A = 2+3 = 5, B = 6, C = 1+9+9+2 = 21, D = 5+6+21 = 32 → 5, центр = 10.
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-[0.86rem] text-[var(--ink-soft)]">
              <p className="flex items-start gap-2">
                <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#a8799b]" />
                Редукция — сложением цифр. Школы, вычитающие 22, получают другие значения для дней 23–31; мы фиксируем
                один вариант и указываем его в результате.
              </p>
              <p className="flex items-start gap-2">
                <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#a8799b]" />
                Порядок арканов — Марсельский: 8 — Справедливость, 11 — Сила, 22 — Шут.
              </p>
            </div>
          </div>

          <div>
            <MatrixForm />
            <div className="mt-4 flex items-center justify-center gap-2 text-[0.78rem] text-[var(--ink-faint)]">
              <CheckIcon className="h-3.5 w-3.5" /> Бесплатный результат и схема сразу на экране
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="flex flex-col items-center text-center">
            <PearlDivider className="h-5 w-40" />
            <p className="eyebrow mt-4">Состав схемы</p>
            <h2 className="h-section mt-3 max-w-2xl">Что показывает матрица</h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {positions.map((position) => (
              <div key={position.label} className="card card--hover reveal">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#a8799b]">{position.label}</p>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[var(--ink)]">{position.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--deep">
        <div className="container grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow eyebrow--light">Честно о методе</p>
            <h2 className="h-section mt-3 text-white">Что матрица не делает</h2>
            <ul className="mt-5 grid gap-3 text-[0.95rem] leading-relaxed text-white/80">
              <li>Не предсказывает конкретные события и даты.</li>
              <li>Не учитывает время и место рождения — это принцип методики.</li>
              <li>Не заменяет психолога, врача или финансового консультанта.</li>
              <li>Не даёт «единственно верного» ответа: трактовки в разных школах различаются.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/full-reading" className="btn btn--gold btn--lg justify-center">
              Полный разбор матрицы
            </Link>
            <Link href="/astrology" className="btn btn--onDark justify-center">
              Перейти к натальной карте
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          <p className="eyebrow">Методика</p>
          <h2 className="h-section mt-3">Источники и версия расчёта</h2>
          <div className="mt-5 grid gap-3 text-[0.9rem] leading-relaxed text-[var(--ink)]">
            <div className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/80 p-4">
              <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
              <p>
                Методика: {settings.methodology.matrixMethodology}. Версия алгоритма: {settings.methodology.matrixVersion}.
                Формулы позиций и ограничения опубликованы в документации проекта; полный список источников —
                в базе знаний специалиста.
              </p>
            </div>
            <div className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/80 p-4">
              <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#a8799b]" />
              <p>
                Тексты трактовок — оригинальные формулировки проекта, написанные по мотивам общепринятых значений
                старших арканов. Защищённые авторские материалы не копируются.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
