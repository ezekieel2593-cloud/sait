import { getConfig } from "../config";

/** Подвал: две строки вместо простыней текста. */
export function Footer() {
  const config = getConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer--slim">
      <div className="container">
        <p>
          <strong>Жемчужина</strong> · {config.brandTagline}
        </p>
        <p>
          <a href="privacy.html">Политика данных</a>
          <span aria-hidden="true"> · </span>
          <a href="terms.html">Условия</a>
          <span aria-hidden="true"> · </span>
          <a href="cabinet/index.php" rel="nofollow">
            Панель специалиста
          </a>
          <span aria-hidden="true"> · </span>
          © {year} cosmorox.ru
        </p>
      </div>
    </footer>
  );
}
