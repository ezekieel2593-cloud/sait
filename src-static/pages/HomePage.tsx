import { useEffect, useRef } from "react";
import { ArrowRightIcon } from "../components/icons";
import { getConfig } from "../config";

/**
 * Главная — выбор между двумя мирами.
 *
 * Структура: заставка → МИР I (Астрология, весь экран) → 3D-развилка
 * (пока листаешь, панели поворачиваются и сходятся; клик открывает мир)
 * → МИР II (Матрица, весь экран) → разделы портала → манифест.
 */
export function HomePage() {
  const config = getConfig();
  const chooserRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const wrapper = chooserRef.current;
      const stage = stageRef.current;
      if (!wrapper || !stage) return;
      const box = wrapper.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const progress =
        total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 1;
      stage.style.setProperty("--p", progress.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="entry-world">
      {/* Заставка поверх ледяного фото-фона */}
      <section className="world-hero" aria-labelledby="entry-title">
        <div>
          <p className="portal-kicker">cosmorox.ru · два способа увидеть себя</p>
          <h1 id="entry-title">Выберите свою вселенную</h1>
          <p>
            Два больших мира: небесная механика натальной карты и геометрия
            пути — Матрица судьбы. Листайте вниз и выберите тот, который
            откликается сегодня.
          </p>
        </div>
        <span className="hero-scroll" aria-hidden="true">
          листайте вниз
        </span>
      </section>

      {/* МИР I — Астрология */}
      <section
        className="world world--astro"
        aria-labelledby="world-astro-title"
      >
        <div className="world__art" aria-hidden="true">
          <svg className="constellation" viewBox="0 0 360 240">
            <path d="M35 175 95 115 142 146 193 70 244 100 300 38M95 115l21-72 77 27m51 30 44 73" />
            <g>
              <circle cx="35" cy="175" r="3" />
              <circle cx="95" cy="115" r="4" />
              <circle cx="142" cy="146" r="3" />
              <circle cx="193" cy="70" r="4" />
              <circle cx="244" cy="100" r="3" />
              <circle cx="300" cy="38" r="4" />
              <circle cx="116" cy="43" r="2" />
              <circle cx="288" cy="173" r="2" />
            </g>
          </svg>
          <div className="astro-orbit astro-orbit--one" />
          <div className="astro-orbit astro-orbit--two" />
          <div className="astro-core">
            <span />
          </div>
          <span className="astro-label">NATALIS · 01</span>
        </div>
        <span className="world__num" aria-hidden="true">
          01
        </span>
        <div className="world__copy">
          <p className="world__kicker">Мир I · небесная механика</p>
          <h2 className="world__title" id="world-astro-title">
            Астрология
            <br />
            <em>и натальная карта</em>
          </h2>
          <p className="world__text">
            Планеты, дома и аспекты — карта рождения с расчётом по времени и
            месту. Точные эфемериды, исторические часовые пояса, честная
            расшифровка сразу после расчёта.
          </p>
          <a className="world-cta" href="astrology.html">
            Войти в космос <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* 3D-развилка: панели сходятся, пока листаешь */}
      <div className="world-chooser" ref={chooserRef}>
        <div className="world-chooser__stage" ref={stageRef}>
          <div className="world-chooser__rift" aria-hidden="true" />
          <p className="portal-kicker">Развилка пути</p>
          <h2 className="world-chooser__title">Один вопрос — два ответа</h2>
          <div className="chooser-panels">
            <a
              href="astrology.html"
              className="chooser-panel chooser-panel--astro"
            >
              <span className="panel-num">01</span>
              <strong>
                Астрология
                <br />
                <em>карта рождения</em>
              </strong>
              <small>Солнце, Луна, асцендент, дома и аспекты по эфемеридам</small>
              <span className="world-cta">Открыть мир I</span>
            </a>
            <a
              href="matrix.html"
              className="chooser-panel chooser-panel--matrix"
            >
              <span className="panel-num">02</span>
              <strong>
                Матрица
                <br />
                <em>судьбы</em>
              </strong>
              <small>22 энергии, родовые линии, деньги и отношения</small>
              <span className="world-cta">Открыть мир II</span>
            </a>
          </div>
          <p className="world-chooser__hint" aria-hidden="true">
            листайте — панели сходятся · выберите кликом
          </p>
        </div>
      </div>

      {/* МИР II — Матрица */}
      <section
        className="world world--matrix"
        aria-labelledby="world-matrix-title"
      >
        <div className="world__art" aria-hidden="true">
          <div className="aurora aurora--one" />
          <div className="aurora aurora--two" />
          <div className="ice-crystal ice-crystal--one" />
          <div className="ice-crystal ice-crystal--two" />
          <div className="ice-wheel">
            <i />
            <b />
            <span />
          </div>
          <span className="ice-label">22 ENERGIES · 02</span>
        </div>
        <span className="world__num" aria-hidden="true">
          02
        </span>
        <div className="world__copy">
          <p className="world__kicker">Мир II · геометрия пути</p>
          <h2 className="world__title" id="world-matrix-title">
            Матрица
            <br />
            <em>судьбы</em>
          </h2>
          <p className="world__text">
            22 энергии, родовые линии, денежный канал и отношения — в одной
            интерактивной схеме. Арифметика по дате рождения без случайных
            чисел: одинаковые данные всегда дают один результат.
          </p>
          <a className="world-cta" href="matrix.html">
            Открыть матрицу <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="entry-shortcuts">
        <div className="container">
          <p className="portal-kicker">Исследуйте портал</p>
          <div className="shortcut-grid">
            <a href="store.html">
              <span>01</span>
              <strong>Витрина разборов</strong>
              <small>PDF-гайды и консультации</small>
            </a>
            <a href="forecast.html">
              <span>02</span>
              <strong>Прогноз на день</strong>
              <small>Лунный ритм и практики</small>
            </a>
            <a href="blog.html">
              <span>03</span>
              <strong>Блог</strong>
              <small>Статьи и объяснения</small>
            </a>
            <a href="cabinet.html">
              <span>04</span>
              <strong>Личный кабинет</strong>
              <small>Карты, близкие и история</small>
            </a>
          </div>
        </div>
      </section>

      <section className="entry-disclaimer">
        <p>
          Астрология и Матрица судьбы — символические системы интерпретации, а
          не научно подтверждённые методы прогноза. Результаты не заменяют
          медицинскую, финансовую или юридическую консультацию.
        </p>
      </section>

      <section className="section">
        <div className="container container--measure">
          <div className="manifesto">
            <p className="eyebrow justify-center">Жемчужина</p>
            <h2 className="manifesto__title mt-3">{config.brandTitle}</h2>
            <span className="manifesto__rule" aria-hidden="true" />
            <p className="manifesto__lead">{config.manifesto.lead}</p>
            {config.manifesto.paragraphs.map((text) => (
              <p key={text.slice(0, 28)}>{text}</p>
            ))}
            <p className="manifesto__accent">{config.manifesto.accent}</p>
            <p className="manifesto__closing">{config.manifesto.closing}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
