import { getConfig } from "../config";

/**
 * Стартовый экран — два живых 3D-портала.
 *
 * Canvas с рендером Three.js подставляет отдельный бандл portals.js
 * в контейнеры [data-portal-scene]: вращающаяся Луна в золотых кольцах
 * и ледяная октаграмма с цифрами Арканов. Клик — плавный перелёт камеры
 * внутрь портала и сразу рабочий раздел, без промежуточных экранов.
 */
export function HomePage() {
  const config = getConfig();

  return (
    <div className="start-portal">
      <header className="start-brand">
        <span className="brand-seal" aria-hidden="true">
          <span>Ж</span>
        </span>
        <span className="start-brand__name">{config.logoText}</span>
        <span className="start-brand__tag">выбери свою вселенную</span>
      </header>

      <div className="portal-stage">
        <a
          href="astrology.html"
          className="portal-card portal-card--astro"
          data-portal-scene="astro"
          aria-label="Астрология — открыть мою карту"
        >
          <span className="portal-card__grain" aria-hidden="true" />
          <div className="portal-card__copy">
            <span className="portal-card__kicker">Портал 1 · Ночной космос</span>
            <h2 className="portal-card__title">
              Астрология
              <em>и натальная карта</em>
            </h2>
            <p className="portal-card__text">
              Сильные стороны, энергия и деньги — по дате и времени рождения
            </p>
            <span className="portal-card__cta">Открыть мою карту →</span>
          </div>
        </a>

        <a
          href="matrix.html"
          className="portal-card portal-card--matrix"
          data-portal-scene="matrix"
          aria-label="Матрица судьбы и Чакры — открыть мою матрицу"
        >
          <span className="portal-card__grain" aria-hidden="true" />
          <div className="portal-card__copy">
            <span className="portal-card__kicker">Портал 2 · Голубые ледники</span>
            <h2 className="portal-card__title">
              Матрица судьбы
              <em>и Чакры</em>
            </h2>
            <p className="portal-card__text">
              Таланты, кармические задачи и баланс энергии — по дате рождения
            </p>
            <span className="portal-card__cta">Открыть мою матрицу →</span>
          </div>
        </a>
      </div>
    </div>
  );
}
