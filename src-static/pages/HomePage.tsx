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
            <h1 className="h-display mt-3 max-w-[17ch] uppercase tracking-[0.02em]">{config.brandTitle}</h1>
            <span className="gold-rule mt-4" aria-hidden="true" />
            <p className="lead mt-4 max-w-[52ch]">{config.manifesto.lead}</p>
            <p className="mt-3 max-w-[52ch] text-[0.94rem] leading-relaxed text-[var(--ink)]">
              Здесь начинается разговор о вас: натальная карта и Матрица судьбы считаются по вашей дате рождения,
              а расшифровка помогает увидеть свою силу спокойно и без чужих ожиданий.
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
              text="22 энергии: личный квадрат, родовые программы, каналы денег и отношений, энергия года."
              bullets={["Центр и личный квадрат", "Родовой квадрат и сила рода", "Каналы денег и отношений"]}
            />
          </div>
        </div>
      </section>

      <section className="section section--tight" id="about">
        <div className="container container--measure">
          <div className="manifesto">
            <p className="eyebrow justify-center">Манифест</p>
            <h2 className="manifesto__title mt-3">{config.brandTitle}</h2>
            <span className="manifesto__rule" aria-hidden="true" />
            <p className="manifesto__lead">{config.manifesto.lead}</p>
            {config.manifesto.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            <p className="manifesto__accent">{config.manifesto.accent}</p>
            <p className="manifesto__closing">{config.manifesto.closing}</p>
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
                text: "Эфемериды для натальной карты и арифметика 22 энергий для Матрицы. Результат воспроизводим.",
              },
              {
                title: "Расшифровка сразу",
                text: "Ключевые разделы вы читаете сразу после расчёта. Остальное — на полном разборе.",
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
        <div className="container container--measure grid gap-6">
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
            {config.api?.enabled
              ? "Специалист свяжется с вами по выбранному каналу связи."
              : "Заявка формируется как сообщение: вы сами отправляете его в Telegram или письмом."}
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
