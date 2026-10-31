import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { SoftInvite } from "./components/SoftInvite";
import { HomePage } from "./pages/HomePage";
import { AstrologyPage } from "./pages/AstrologyPage";
import { MatrixPage } from "./pages/MatrixPage";
import { GuidePage } from "./pages/GuidePage";
import { ChakrasPage } from "./pages/ChakrasPage";
import { FullReadingPage, PrivacyPage, TermsPage } from "./pages/OtherPages";
import { getConfig } from "./config";
import { AdminProvider } from "./admin";

/**
 * Точка входа статической (FTP) версии.
 * Страница выбирается по атрибуту data-page у <body> — серверный роутинг не нужен.
 */

const PAGES: Record<string, () => React.ReactElement> = {
  home: HomePage,
  astrology: AstrologyPage,
  matrix: MatrixPage,
  guide: GuidePage,
  chakras: ChakrasPage,
  "full-reading": FullReadingPage,
  privacy: PrivacyPage,
  terms: TermsPage,
};

const page = document.body.dataset.page ?? "home";

// Фон: пути приходят из config.js с отпечатком файла, поэтому после
// обновления архива браузер сразу берёт новую картинку.
const background = getConfig().assets?.background || "images/pearl-background.jpg";
const backgroundMobile = getConfig().assets?.backgroundMobile || background;
const Page = PAGES[page] ?? HomePage;

// Заголовок документа для клиентских переходов по истории
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
      <Page />
    </main>
    <Footer />
    <SoftInvite page={page} />
    </AdminProvider>
  </StrictMode>
);
