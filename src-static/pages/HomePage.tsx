import { getConfig } from "../config";

/**
 * Стартовый экран — ледяной космос и два портала-иллюстрации.
 *
 * Арт — эксклюзивные 2D-иллюстрации (public/images/portal-*.jpg) с
 * плавным 3D-параллаксом и свечением при наведении. Поверх картинки
 * лёгкий слой мерцающих частиц рисует бандл portals.js (Three.js,
 * контейнеры [data-portal-scene]). Клик — плавное погружение внутрь
 * портала и сразу рабочий раздел, без промежуточных экранов.
 */
export function HomePage() {
  const config = getConfig();

  return (
    <div className="start-portal">
      <span className="start-sparkles" aria-hidden="true" />
      <span className="start-sparkles start-sparkles--b" aria-hidden="true" />

      <header className="start-brand">
        <span className="brand-seal" aria-hidden="true">
          <span>C</span>
        </span>
        <span className="start-brand__name">{config.logoText}</span>
        <span className="start-brand__tag">cosmorox.ru</span>
      </header>

      <div className="start-head">
        <h1 className="start-title">Выбери свою вселенную</h1>
        <p className="start-subtitle">
          Открой подсказки звёзд или расшифруй код своей даты рождения
        </p>
      </div>

      <div className="portal-stage">
        <a
          href="astrology.html"
          className="portal-card portal-card--astro"
          data-portal-scene="astro"
          aria-label="Астрология — открыть мою карту"
        >
          <span className="portal-card__art" aria-hidden="true">
            <img
              className="portal-card__image"
              src="api/image.php?name=portal-astro.jpg"
              alt=""
              loading="eager"
            />
          </span>
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
          <span className="portal-card__art" aria-hidden="true">
            <img
              className="portal-card__image"
              src="api/image.php?name=portal-matrix.jpg"
              alt=""
              loading="eager"
            />
          </span>
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
