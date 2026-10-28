import Link from "next/link";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { HeroPearl, OrbitBadge, PearlDivider } from "@/components/site/Ornaments";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CompassIcon,
  CrystalIcon,
  DocumentIcon,
  MoonIcon,
  OrbitIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  SunIcon,
  UserIcon,
} from "@/components/icons";
import { FaqList } from "@/components/site/FaqList";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const settings = getSettings();
  const { specialist, reviews, faq } = settings;

  return (
    <>
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="relative overflow-hidden pb-10 pt-8 sm:pt-12 lg:pb-16">
        <div className="container grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="animate-in">
            <p className="eyebrow">Натальная карта · Матрица судьбы</p>
            <h1 className="h-display mt-5">
              Открой свою карту.
              <br />
              <span className="italic text-[var(--turquoise-deep)]">Узнай себя глубже</span>
            </h1>
            <p className="lead mt-6 max-w-xl">
              Рассчитайте натальную карту по времени и месту рождения или Матрицу судьбы по дате —
              и получите персональную расшифровку. Это не гороскоп из интернета: расчёт идёт по вашим данным,
              а сложные места разбирает специалист.
            </p>

            <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
              <DirectionCard
                href="/astrology"
                icon={<OrbitIcon className="h-6 w-6" />}
                title="Астрология"
                text="Планеты, знаки, дома и аспекты по дате, времени и месту рождения."
                meta="Нужны дата, время и город"
              />
              <DirectionCard
                href="/matrix"
                icon={<CrystalIcon className="h-6 w-6" />}
                title="Матрица судьбы"
                text="22 аркана, личный и родовой квадрат, линии денег и отношений."
                meta="Нужна только дата рождения"
                tone="lilac"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.82rem] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-[var(--turquoise-deep)]" /> Бесплатный результат
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-[var(--turquoise-deep)]" /> Без регистрации
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-[var(--turquoise-deep)]" /> Данные не публикуются
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] animate-in" style={{ animationDelay: "0.12s" }}>
            <div className="absolute inset-0 -z-10 animate-[shimmer_12s_ease-in-out_infinite_alternate] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(184,221,224,0.55),transparent_62%)] blur-2xl" />
            <HeroPearl className="h-auto w-full drop-shadow-[0_30px_60px_rgba(37,61,75,0.12)]" />
          </div>
        </div>
      </section>

      {/* ---------------------------- ЗНАКОМСТВО ---------------------------- */}
      <section className="section section--tight">
        <div className="container">
          <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--line-gold)] bg-white/70 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[var(--line-gold)] bg-[linear-gradient(150deg,#fff,#f4ece2)]">
                <StarIcon className="h-6 w-6 text-[#9c7b4c]" />
              </span>
              <div>
                <p className="font-[family-name:var(--font-display)] text-[1.25rem] leading-tight text-[var(--ocean)]">
                  {specialist.name}
                </p>
                <p className="text-[0.82rem] text-[var(--ink-soft)]">{specialist.title}</p>
              </div>
            </div>
            <p className="text-[0.92rem] leading-relaxed text-[var(--ink-soft)] md:border-x md:border-[var(--line)] md:px-8">
              {specialist.bio}
            </p>
            <Link href="/full-reading" className="btn btn--secondary btn--sm justify-self-start md:justify-self-end">
              Заказать разбор
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------ КАК ЭТО ------------------------------ */}
      <section className="section" id="how">
        <div className="container">
          <div className="max-w-2xl reveal">
            <p className="eyebrow">Как это работает</p>
            <h2 className="h-section mt-4">Четыре шага от даты рождения до понятной расшифровки</h2>
            <p className="lead mt-4">
              Никакой мистики в расчётах: координаты, часовой пояс и положения планет вычисляются точно.
              Мистика начинается там, где начинается интерпретация, — и мы честно разделяем эти два слоя.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <CompassIcon className="h-5 w-5" />,
                title: "Выберите направление",
                text: "Астрология — если знаете время и место рождения. Матрица — если есть только дата.",
              },
              {
                icon: <CalendarIcon className="h-5 w-5" />,
                title: "Укажите данные",
                text: "Дата, время (или «не знаю») и город рождения. Подскажем, если данных не хватает.",
              },
              {
                icon: <SparkleIcon className="h-5 w-5" />,
                title: "Получите расчёт",
                text: "Схема строится по реальным формулам: планеты, дома, арканы и позиции матрицы.",
              },
              {
                icon: <DocumentIcon className="h-5 w-5" />,
                title: "Закажите разбор",
                text: "Полная версия с разбором всех позиций и ответами на ваши вопросы — у специалиста.",
              },
            ].map((step, i) => (
              <li key={step.title} className="card card--hover reveal">
                <div className="flex items-center justify-between">
                  <span className="icon-badge">{step.icon}</span>
                  <span className="font-[family-name:var(--font-display)] text-[1.6rem] text-[var(--line-strong)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="h-card mt-5">{step.title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------- БЕСПЛАТНО / ПОЛНОЕ ---------------------------- */}
      <section className="section section--pearl">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card reveal">
              <div className="flex items-center gap-3">
                <span className="icon-badge"><MoonIcon className="h-5 w-5" /></span>
                <h2 className="h-card">Бесплатный результат</h2>
              </div>
              <p className="mt-4 text-[0.94rem] leading-relaxed text-[var(--ink-soft)]">
                Рассчитанная схема, ключевые показатели и несколько персональных расшифровок с короткими
                рекомендациями. Без регистрации и оплаты.
              </p>
              <div className="mt-5 flex gap-2.5">
                <Link href="/astrology" className="btn btn--secondary btn--sm flex-1">Натальная карта</Link>
                <Link href="/matrix" className="btn btn--secondary btn--sm flex-1">Матрица судьбы</Link>
              </div>
            </div>

            <div className="card card--turquoise reveal">
              <div className="flex items-center gap-3">
                <span className="icon-badge icon-badge--gold"><SunIcon className="h-5 w-5" /></span>
                <h2 className="h-card">Полный персональный разбор</h2>
              </div>
              <p className="mt-4 text-[0.94rem] leading-relaxed text-[var(--ink-soft)]">
                Все позиции методики, подробные интерпретации, ответы на ваши вопросы и консультация
                специалиста. Состав и формат уточняются у специалиста.
              </p>
              <ul className="mt-4 grid gap-2 text-[0.9rem] text-[var(--ink)]">
                {settings.services.fullReadingIncludes.slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/full-reading" className="btn btn--primary btn--sm mt-5 w-full">
                Узнать про полный разбор
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ МЕТОДИКА ------------------------------ */}
      <section className="section" id="method">
        <div className="container">
          <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="reveal">
              <p className="eyebrow">Прозрачность</p>
              <h2 className="h-section mt-4">Видно, как считается результат</h2>
              <p className="lead mt-4">
                Мы не прячем формулы и не выдаём шаблон за персональный прогноз. В каждом результате
                указаны методика, версия алгоритма и исходные данные расчёта.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  {
                    icon: <OrbitIcon className="h-4 w-4" />,
                    label: "Астрономия",
                    value: settings.methodology.astrologyEphemeris,
                  },
                  {
                    icon: <CompassIcon className="h-4 w-4" />,
                    label: "Дома и зодиак",
                    value: `${settings.methodology.astrologyHouseSystem}, ${settings.methodology.astrologyZodiac}`,
                  },
                  {
                    icon: <CrystalIcon className="h-4 w-4" />,
                    label: "Матрица",
                    value: settings.methodology.matrixMethodology,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/70 px-4 py-3">
                    <span className="mt-0.5 text-[var(--turquoise-deep)]">{row.icon}</span>
                    <div>
                      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{row.label}</p>
                      <p className="text-[0.88rem] leading-relaxed text-[var(--ink)]">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: <ClockIcon className="h-5 w-5" />,
                  title: "Честно о времени",
                  text: "Если время рождения неизвестно, асцендент и дома не выдаются как достоверные — вместо этого показываем диапазон.",
                },
                {
                  icon: <PinIcon className="h-5 w-5" />,
                  title: "Исторические пояса",
                  text: "Локальное время рождения пересчитывается с учётом часового пояса и исторического летнего времени.",
                },
                {
                  icon: <ShieldIcon className="h-5 w-5" />,
                  title: "Данные под контролем",
                  text: "Бесплатный расчёт можно выполнить анонимно. Заявка сохраняется только по вашему действию.",
                },
                {
                  icon: <UserIcon className="h-5 w-5" />,
                  title: "Человек в финале",
                  text: "Автоматические тексты — это база. Итоговые выводы и рекомендации даёт специалист на консультации.",
                },
              ].map((item) => (
                <div key={item.title} className="card card--hover reveal">
                  <span className="icon-badge">{item.icon}</span>
                  <h3 className="mt-4 font-[family-name:var(--font-sans)] text-[0.98rem] font-semibold text-[var(--ocean)]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="note note--info mt-8 reveal">
            <StarIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Астрология и Матрица судьбы — инструменты самопознания, а не научно доказанные методы
              предсказания событий. Мы не обещаем гарантированных результатов и не даём медицинских,
              юридических или финансовых рекомендаций.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------ ОТЗЫВЫ ------------------------------ */}
      {reviews.length > 0 ? (
        <section className="section section--pearl" id="reviews">
          <div className="container">
            <div className="max-w-2xl reveal">
              <p className="eyebrow">Отзывы</p>
              <h2 className="h-section mt-4">Что говорят клиенты</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {reviews.map((review) => (
                <figure key={review.id} className="card reveal">
                  <PearlDivider className="mb-4 h-5 w-24" />
                  <blockquote className="text-[0.95rem] leading-relaxed text-[var(--ink)]">{review.text}</blockquote>
                  <figcaption className="mt-4 text-[0.85rem] text-[var(--ink-soft)]">
                    <strong className="font-semibold text-[var(--ocean)]">{review.author}</strong>
                    {review.context ? <span> · {review.context}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------- FAQ -------------------------------- */}
      <section className="section" id="faq">
        <div className="container container--narrow">
          <div className="reveal">
            <p className="eyebrow">Частые вопросы</p>
            <h2 className="h-section mt-4">Коротко о главном</h2>
          </div>
          <div className="mt-8">
            <FaqList items={faq} />
          </div>
        </div>
      </section>

      {/* -------------------------------- CTA -------------------------------- */}
      <section className="section section--tight pb-16">
        <div className="container">
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[rgba(201,167,119,0.4)] bg-[linear-gradient(135deg,#2b4756_0%,#253d4b_52%,#1e3440_100%)] px-6 py-10 text-white sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(184,221,224,0.5),transparent_65%)] blur-2xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(220,197,217,0.4),transparent_65%)] blur-2xl" aria-hidden="true" />
            <div className="relative grid gap-8 md:grid-cols-[1.4fr_0.6fr] md:items-center">
              <div>
                <p className="eyebrow eyebrow--light">Следующий шаг</p>
                <h2 className="h-section mt-4 max-w-xl text-white">Начните с бесплатного расчёта</h2>
                <p className="mt-3 max-w-xl text-[0.98rem] leading-relaxed text-white/75">
                  Он уже покажет ваши сильные стороны и точки внимания. Если захочется глубже — специалист
                  подготовит полный разбор с ответами на ваши вопросы.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/astrology" className="btn btn--gold btn--lg justify-center">
                  Рассчитать карту
                </Link>
                <Link href="/matrix" className="btn btn--onDark btn--lg justify-center">
                  Открыть Матрицу
                </Link>
              </div>
            </div>
            <OrbitBadge className="pointer-events-none absolute -left-10 bottom-0 hidden h-40 w-40 opacity-40 md:block" />
          </div>
        </div>
      </section>
    </>
  );
}

function DirectionCard({
  href,
  icon,
  title,
  text,
  meta,
  tone = "turquoise",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  meta: string;
  tone?: "turquoise" | "lilac";
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] ${
        tone === "lilac"
          ? "border-[rgba(220,197,217,0.85)] bg-[linear-gradient(158deg,#fdf7fc_0%,#f6ecf4_100%)]"
          : "border-[rgba(184,221,224,0.9)] bg-[linear-gradient(158deg,#f8fdfd_0%,#eaf5f6_100%)]"
      }`}
    >
      <div>
        <span className="grid h-11 w-11 place-items-center rounded-[13px] border border-white/80 bg-white/80 text-[var(--ocean)] shadow-sm">
          {icon}
        </span>
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-[1.45rem] leading-tight text-[var(--ocean)]">
          {title}
        </h2>
        <p className="mt-2 text-[0.87rem] leading-relaxed text-[var(--ink)]">{text}</p>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[0.75rem] text-[var(--ink-soft)]">{meta}</span>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line-gold)] bg-white/80 text-[#9c7b4c] transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
