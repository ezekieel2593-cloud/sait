import { StrictMode, Suspense, lazy, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Header, type World } from "./components/Header";
import { Footer } from "./components/Footer";
import { SoftInvite } from "./components/SoftInvite";
import { getConfig } from "./config";
import { AdminProvider } from "./admin";

// Each world is a separate chunk: a visitor downloads only the page they open.
const PAGES: Record<string, React.ComponentType> = {
  home: lazy(() =>
    import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
  ),
  astrology: lazy(() =>
    import("./pages/AstrologyPage").then((m) => ({ default: m.AstrologyPage })),
  ),
  matrix: lazy(() =>
    import("./pages/MatrixPage").then((m) => ({ default: m.MatrixPage })),
  ),
  guide: lazy(() =>
    import("./pages/GuidePage").then((m) => ({ default: m.GuidePage })),
  ),
  chakras: lazy(() =>
    import("./pages/ChakrasPage").then((m) => ({ default: m.ChakrasPage })),
  ),
  "full-reading": lazy(() =>
    import("./pages/OtherPages").then((m) => ({ default: m.FullReadingPage })),
  ),
  privacy: lazy(() =>
    import("./pages/OtherPages").then((m) => ({ default: m.PrivacyPage })),
  ),
  terms: lazy(() =>
    import("./pages/OtherPages").then((m) => ({ default: m.TermsPage })),
  ),
  cabinet: lazy(() =>
    import("@/features/cabinet/PortalPages").then((m) => ({
      default: m.CabinetPage,
    })),
  ),
  store: lazy(() =>
    import("@/features/cabinet/PortalPages").then((m) => ({
      default: m.StorePage,
    })),
  ),
  forecast: lazy(() =>
    import("@/features/cabinet/PortalPages").then((m) => ({
      default: m.ForecastPage,
    })),
  ),
  blog: lazy(() =>
    import("@/features/cabinet/PortalPages").then((m) => ({
      default: m.BlogPage,
    })),
  ),
};

/** К какой вселенной относится страница: тема меню и оформление. */
const PAGE_WORLDS: Record<string, World> = {
  astrology: "astro",
  forecast: "astro",
  matrix: "matrix",
  chakras: "matrix",
  guide: "matrix",
  store: "shared",
  cabinet: "shared",
  "full-reading": "shared",
  privacy: "shared",
  terms: "shared",
  blog: "shared",
};

const page = document.body.dataset.page ?? "home";
const world = PAGE_WORLDS[page] ?? "shared";
const background =
  getConfig().assets?.background || "images/pearl-background.jpg";
const backgroundMobile = getConfig().assets?.backgroundMobile || background;
const Page = PAGES[page] ?? PAGES.home;
document.title = document.body.dataset.title || document.title;
const root = document.getElementById("root");
if (!root) throw new Error("Не найден контейнер #root");

// На стартовом портале только логотип и два мира: шапка и футер появляются
// после выбора вселенной.
const isStartPortal = page === "home";

createRoot(root).render(
  <StrictMode>
    <AdminProvider>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <div
        className="page-photo"
        aria-hidden="true"
        style={
          {
            "--page-photo": `url("${background}")`,
            "--page-photo-mobile": `url("${backgroundMobile}")`,
          } as React.CSSProperties
        }
      />
      <div className="page-aura" aria-hidden="true" />
      {isStartPortal ? null : <Header active={page === "home" ? undefined : `${page}.html`} world={world} />}
      <main id="main" className={isStartPortal ? "start-main" : undefined}>
        <Suspense
          fallback={
            <div className="container py-16" role="status">
              Открываем раздел…
            </div>
          }
        >
          {createElement(Page)}
        </Suspense>
      </main>
      {isStartPortal ? null : <Footer />}
      <SoftInvite page={page} />
    </AdminProvider>
  </StrictMode>,
);
