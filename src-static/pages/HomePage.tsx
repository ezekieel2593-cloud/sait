import { useState, type PointerEvent } from "react";
import { ArrowRightIcon } from "../components/icons";
import { getConfig } from "../config";

export function HomePage() {
  const config = getConfig();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const move = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const box = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientX - box.left) / box.width - 0.5) * 7,
      y: ((event.clientY - box.top) / box.height - 0.5) * -7,
    });
  };
  const reset = () => setTilt({ x: 0, y: 0 });
  return (
    <div className="entry-world">
      <section className="portal-landing" aria-labelledby="entry-title">
        <div className="portal-landing__glow" aria-hidden="true" />
        <div className="portal-landing__intro">
          <p className="portal-kicker">
            cosmorox.ru · два способа увидеть себя
          </p>
          <h1 id="entry-title">Выберите свою вселенную</h1>
          <p>
            Два самостоятельных пространства. Начните с того, которое
            откликается сегодня.
          </p>
        </div>
        <div
          className="universe-grid"
          onPointerMove={move}
          onPointerLeave={reset}
        >
          <a
            href="astrology.html"
            className="universe-card universe-card--astro"
            style={
              {
                "--tilt-x": `${tilt.x}deg`,
                "--tilt-y": `${tilt.y}deg`,
              } as React.CSSProperties
            }
          >
            <div className="universe-card__art astro-art" aria-hidden="true">
              <div className="astro-orbit astro-orbit--one" />
              <div className="astro-orbit astro-orbit--two" />
              <div className="astro-core">
                <span />
              </div>
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
              <span className="astro-label">NATALIS · 01</span>
            </div>
            <div className="universe-card__copy">
              <p className="universe-eyebrow">Мир I · небесная механика</p>
              <h2>
                Астрология
                <br />
                <em>и натальная карта</em>
              </h2>
              <p>
                Планеты, дома и аспекты — карта рождения с расчётом по времени и
                месту.
              </p>
              <span className="universe-link">
                Войти в космос <ArrowRightIcon className="h-4 w-4" />
              </span>
            </div>
            <span className="universe-card__number">01</span>
          </a>
          <a
            href="matrix.html"
            className="universe-card universe-card--matrix"
            style={
              {
                "--tilt-x": `${-tilt.x}deg`,
                "--tilt-y": `${-tilt.y}deg`,
              } as React.CSSProperties
            }
          >
            <div className="universe-card__art ice-art" aria-hidden="true">
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
            <div className="universe-card__copy">
              <p className="universe-eyebrow">Мир II · геометрия пути</p>
              <h2>
                Матрица
                <br />
                <em>судьбы</em>
              </h2>
              <p>
                22 энергии, родовые линии, денежный канал и отношения — в одной
                интерактивной схеме.
              </p>
              <span className="universe-link">
                Открыть матрицу <ArrowRightIcon className="h-4 w-4" />
              </span>
            </div>
            <span className="universe-card__number">02</span>
          </a>
        </div>
        <div className="portal-landing__foot">
          <span>Расчёты выполняются на основе введённых данных</span>
          <span>Без регистрации для первого расчёта</span>
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
