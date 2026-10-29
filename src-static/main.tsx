import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { SoftInvite } from "./components/SoftInvite";
import { HomePage } from "./pages/HomePage";
import { AstrologyPage } from "./pages/AstrologyPage";
import { MatrixPage } from "./pages/MatrixPage";
import { FullReadingPage, PrivacyPage, TermsPage } from "./pages/OtherPages";

/**
 * Точка входа статической (FTP) версии.
 * Страница выбирается по атрибуту data-page у <body> — серверный роутинг не нужен.
 */

const PAGES: Record<string, () => React.ReactElement> = {
  home: HomePage,
  astrology: AstrologyPage,
  matrix: MatrixPage,
  "full-reading": FullReadingPage,
  privacy: PrivacyPage,
  terms: TermsPage,
};

const page = document.body.dataset.page ?? "home";
const Page = PAGES[page] ?? HomePage;

// Заголовок документа для клиентских переходов по истории
document.title = document.body.dataset.title || document.title;

const root = document.getElementById("root");
if (!root) throw new Error("Не найден контейнер #root");

createRoot(root).render(
  <StrictMode>
    <a className="skip-link" href="#main">
      Перейти к содержимому
    </a>
    <div
      className="page-photo"
      aria-hidden="true"
      style={
        {
          "--page-photo": 'url("images/pearl-background.jpg")',
          "--page-photo-mobile": 'url("images/pearl-background-mobile.jpg")',
        } as React.CSSProperties
      }
    />
    <div className="page-aura" aria-hidden="true" />
    <Header active={page === "home" ? undefined : `${page}.html`} />
    <main id="main">
      <Page />
    </main>
    <Footer />
    <SoftInvite page={page} />
  </StrictMode>
);
