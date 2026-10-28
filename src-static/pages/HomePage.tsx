import { getConfig } from "../config";
import { ArrowRightIcon } from "../components/icons";
import { MoonIcon, SparkleIcon, StarIcon, SunIcon } from "../components/icons-extra";
import { LeadForm } from "../components/LeadForm";

export function HomePage() {
  const config = getConfig();

  return (
    <div>
      <section className="relative overflow-hidden pb-10 pt-10 sm:pt-14">
        <div className="container grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="eyebrow">Астрология · Матрица судьбы</p>
            <h1 className="h-display mt-3 max-w-[16ch]">Натальная карта и Матрица судьбы по вашей дате</h1>
            <p className="lead mt-4 max-w-[52ch]">
              Реальные расчёты по проверенным алгоритмам и понятная расшифровка: что даёт опору, где зоны роста и какие
              вопросы стоит разобрать со специалистом. Бесплатный результат — сразу, без регистрации.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href="astrology.html" className="btn btn--primary btn--lg">
                Рассчитать натальную карту <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a href="matrix.html" className="btn btn--secondary btn--lg">
                Открыть Матрицу судьбы
              </a>
            </div>
            <p className="mt-4 text-[0.8rem] text-[var(--ink-soft)]">
              Никаких случайных чисел: версия алгоритма указана в каждом результате. Всё считается в браузере — данные
              рождения не отправляются на сервер.
            </p>
          </div>

          <div className="grid gap-3">
            <DirectionCard
              href="astrology.html"
              icon={<SunIcon className="h-5 w-5" />}
              title="Натальная карта"
              text="Солнце, Луна, асцендент, дома и аспекты. Учитываются исторические часовые пояса и переходы на летнее время."
              bullets={["Планеты и знаки по эфемеридам", "Дома, асцендент, MC", "Аспекты с орбисами"]}
            />
            <DirectionCard
              href="matrix.html"
              icon={<MoonIcon className="h-5 w-5" />}
              title="Матрица судьбы"
              text="22 старших аркана: личный квадрат, родовые программы, каналы денег и отношений, энергия года."
              bullets={["Центр и личный квадрат", "Родовой квадрат и сила рода", "Каналы денег и отношений"]}
            />
          </div>
        </div>
      </section>

      <section className="section section--tight" id="how">
        <div className="container">
          <h2 className="h-section">Как это работает</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Данные рождения",
                text: "Дата, время и место. Если время неизвестно — дома и асцендент не выдаются как достоверные.",
              },
              {
                title: "Расчёт",
                text: "Эфемериды для натальной карты и арифметика 22 арканов для Матрицы. Результат воспроизводим.",
              },
              {
                title: "Бесплатная расшифровка",
                text: "Ключевые разделы открыты сразу. Остальное — в полном разборе у специалиста.",
              },
            ].map((item, index) => (
              <article key={item.title} className="card">
                <span className="icon-badge">{index + 1}</span>
                <h3 className="mt-3 h-card">{item.title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="card gold-frame p-6">
            <img
              src={config.specialist.photoUrl}
              alt={`Фотография специалиста: ${config.specialist.name}`}
              className="mx-auto h-40 w-40 rounded-full border border-[var(--line-gold)] object-cover"
              loading="lazy"
            />
            <h2 className="mt-4 h-card text-center">{config.specialist.name}</h2>
            <p className="mt-1 text-center text-[0.86rem] text-[var(--turquoise-deep)]">{config.specialist.title}</p>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--ink)]">{config.specialist.bio}</p>
            <p className="mt-3 text-[0.76rem] text-[var(--ink-faint)]">{config.specialist.note}</p>
          </div>

          <div className="grid gap-3">
            <h2 className="h-section">Что входит в полный разбор</h2>
            <ul className="grid gap-2">
              {config.services.fullReadingIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.92rem] leading-relaxed text-[var(--ink)]">
                  <StarIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a777]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[0.86rem] text-[var(--ink-soft)]">
              {config.services.priceNote || "Стоимость и сроки специалист подтверждает в переписке."}
              {config.services.turnaround ? ` · ${config.services.turnaround}` : ""}
            </p>
            <a href="full-reading.html" className="btn btn--secondary btn--sm w-fit">
              Подробнее о полном разборе <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {config.reviews.length > 0 ? (
        <section className="section section--tight">
          <div className="container">
            <h2 className="h-section">Отзывы</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.reviews.map((review) => (
                <blockquote key={`${review.author}-${review.text.slice(0, 12)}`} className="card">
                  <SparkleIcon className="h-5 w-5 text-[#c9a777]" />
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">{review.text}</p>
                  <footer className="mt-3 text-[0.8rem] text-[var(--ink-soft)]">
                    {review.author}
                    {review.context ? ` · ${review.context}` : ""}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--tight" id="faq">
        <div className="container container--narrow">
          <h2 className="h-section">Частые вопросы</h2>
          <div className="mt-4 grid gap-2">
            {config.faq.map((item) => (
              <details key={item.question} className="card">
                <summary className="cursor-pointer text-[0.95rem] font-semibold text-[var(--ocean)]">{item.question}</summary>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container container--measure">
          <h2 className="h-section">Остались вопросы — напишите</h2>
          <p className="mt-2 text-[0.92rem] text-[var(--ink-soft)]">
            Заявка формируется как сообщение: вы сами отправляете его в Telegram или письмом.
          </p>
          <div className="mt-4">
            <LeadForm direction="astrology" summary="Заявка с главной страницы (без расчёта)" compact />
          </div>
        </div>
      </section>
    </div>
  );
}

function DirectionCard({
  href,
  icon,
  title,
  text,
  bullets,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  bullets: string[];
}) {
  return (
    <a href={href} className="card card--hover block">
      <div className="flex items-center gap-2.5">
        <span className="icon-badge icon-badge--gold">{icon}</span>
        <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] text-[var(--ocean)]">{title}</h2>
      </div>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">{text}</p>
      <ul className="mt-3 grid gap-1 text-[0.84rem] text-[var(--ink-soft)]">
        {bullets.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[0.86rem] font-medium text-[var(--turquoise-deep)]">
        Перейти <ArrowRightIcon className="h-4 w-4" />
      </span>
    </a>
  );
}
