import { StrictMode, Suspense, lazy, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "./components/Header";
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

const page = document.body.dataset.page ?? "home";
const background =
  getConfig().assets?.background || "images/pearl-background.jpg";
const backgroundMobile = getConfig().assets?.backgroundMobile || background;
const Page = PAGES[page] ?? PAGES.home;
document.title = document.body.dataset.title || document.title;
const root = document.getElementById("root");
if (!root) throw new Error("Не найден контейнер #root");

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
      <Header active={page === "home" ? undefined : `${page}.html`} />
      <main id="main">
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
      <Footer />
      <SoftInvite page={page} />
    </AdminProvider>
  </StrictMode>,
);
