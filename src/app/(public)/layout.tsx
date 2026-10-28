import { getSettings } from "@/lib/settings";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RevealObserver } from "@/components/site/RevealObserver";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <div className="page-aura" aria-hidden="true" />
      <Header siteName={settings.site.name} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <RevealObserver />
    </>
  );
}
