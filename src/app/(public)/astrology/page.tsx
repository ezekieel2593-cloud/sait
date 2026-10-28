import type { Metadata } from "next";
import Link from "next/link";
import { AstroBirthForm } from "@/components/forms/AstroBirthForm";
import { getSettings } from "@/lib/settings";
import { FaqList } from "@/components/site/FaqList";
import { OrbitBadge } from "@/components/site/Ornaments";
import {
  CheckIcon,
  ClockIcon,
  CompassIcon,
  OrbitIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  SunIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Натальная карта по дате рождения",
  description:
    "Рассчитайте натальную карту по дате, времени и месту рождения: положения планет, асцендент, дома и аспекты. Бесплатный персональный результат с расшифровкой.",
  alternates: { canonical: "/astrology" },
  openGraph: {
    title: "Натальная карта по дате рождения",
    description: "Реальный астрономический расчёт: планеты, дома, асцендент и аспекты с персональной расшифровкой.",
    url: "/astrology",
  },
};

export default function AstrologyPage() {
  const settings = getSettings();

  return (
    <>
      <section className="relative overflow-hidden pb-6 pt-6 sm:pt-10">
        <div className="container grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
          <div className="animate-in">
            <p className="eyebrow">Астрология · натальная карта</p>
            <h1 className="h-display mt-4">
              Ваша карта
              <br />
              <span className="italic text-[var(--turquoise-deep)]">рождения</span>
            </h1>
            <p className="lead mt-5 max-w-xl">
              Планеты, знаки, дома и аспекты — рассчитанные по реальным эфемеридам на момент вашего рождения.
              Бесплатный результат покажет главное, полный разбор открывает все позиции и консультацию.
            </p>

            <ul className="mt-6 grid gap-2.5 text-[0.92rem] text-[var(--ink)]">
              {[
                { icon: <OrbitIcon className="h-4 w-4" />, text: "Положения 10 планет в знаках и домах" },
                { icon: <CompassIcon className="h-4 w-4" />, text: "Асцендент, MC и дома Плацидуса" },
                { icon: <SparkleIcon className="h-4 w-4" />, text: "Аспекты с орбисами и трактовкой" },
                { icon: <PinIcon className="h-4 w-4" />, text: "Учёт исторических часовых поясов и летнего времени" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-[var(--turquoise-deep)]">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-[var(--radius-md)] border border-[rgba(184,221,224,0.85)] bg-[rgba(244,251,251,0.8)] p-4">
                <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#3b7b83]">
                  <ClockIcon className="h-4 w-4" /> Не знаете время?
                </p>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[var(--ink)]">
                  Это не проблема: карта будет построена, но асцендент и дома мы честно не покажем как достоверные.
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[rgba(220,197,217,0.9)] bg-[rgba(251,245,250,0.8)] p-4">
                <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-[#8a5d7c]">
                  <ShieldIcon className="h-4 w-4" /> Без регистрации
                </p>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-[var(--ink)]">
                  Расчёт можно сделать анонимно. Данные сохраняются только для показа результата.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -right-10 -top-10 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(184,221,224,0.55),transparent_65%)] blur-2xl" />
            <AstroBirthForm />
            <p className="mt-4 text-center text-[0.78rem] text-[var(--ink-faint)]">
              Бесплатно · результат сразу на экране · без SMS и подтверждений
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--line)] bg-white/70 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="eyebrow">Что внутри расчёта</p>
              <h2 className="h-section mt-3">От эфемерид до интерпретации</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <SunIcon className="h-5 w-5" />,
                    title: "Точные положения",
                    text: "Геоцентрические эклиптические долготы планет на момент рождения, ретроградность по скорости движения.",
                  },
                  {
                    icon: <CompassIcon className="h-5 w-5" />,
                    title: "Дома и асцендент",
                    text: `Система домов: ${settings.methodology.astrologyHouseSystem}. Асцендент вычисляется численно по пересечению эклиптики с горизонтом.`,
                  },
                  {
                    icon: <SparkleIcon className="h-5 w-5" />,
                    title: "Аспекты",
                    text: settings.methodology.astrologyOrbs,
                  },
                  {
                    icon: <StarIcon className="h-5 w-5" />,
                    title: "Интерпретация",
                    text: "Тексты собираются из базы знаний по рассчитанным значениям — без случайных фраз и подстановок.",
                  },
                ].map((card) => (
                  <div key={card.title} className="flex gap-3">
                    <span className="icon-badge mt-0.5 h-10 w-10 shrink-0">{card.icon}</span>
                    <div>
                      <h3 className="font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">{card.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <OrbitBadge className="mx-auto hidden h-40 w-40 lg:block" />
          </div>

          <div className="note note--info mt-5">
            <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Астрология — символическая система самопознания, а не научно доказанный метод прогнозирования.
              Мы показываем расчёт и трактовку, но не обещаем событий и не заменяем консультации специалистов.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--pearl">
        <div className="container container--narrow">
          <div className="flex items-center gap-2 text-[var(--turquoise-deep)]">
            <CheckIcon className="h-4 w-4" />
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.16em]">Возможности</p>
          </div>
          <h2 className="h-section mt-3">Что можно узнать из карты</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Как вы действуете по умолчанию и где ваша естественная сила",
              "Что вас восстанавливает и какие эмоции ведут решения",
              "Как вас видят другие и через что проявляется активность",
              "Где напряжение в отношениях и работе, а где поддержка",
              "Сильные стороны характера и привычные ловушки",
              "Темы, которые стоит разобрать со специалистом подробно",
            ].map((item) => (
              <div key={item} className="flex gap-2.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-white/80 px-4 py-3">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                <p className="text-[0.9rem] leading-relaxed text-[var(--ink)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/matrix" className="btn btn--secondary btn--sm">
              Посчитать ещё Матрицу судьбы
            </Link>
            <Link href="/full-reading" className="btn btn--ghost btn--sm">
              Узнать про полный разбор
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow">
          <p className="eyebrow">Вопросы</p>
          <h2 className="h-section mt-3">О расчёте натальной карты</h2>
          <div className="mt-6">
            <FaqList items={settings.faq} />
          </div>
        </div>
      </section>
    </>
  );
}
