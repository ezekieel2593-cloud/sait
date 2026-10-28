/* =========================================================
   SAIT — main.js
   Vanilla, no dependencies. Progressive enhancement only.
   ========================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  const THEME_KEY = "sait-theme";
  const themeToggle = document.getElementById("theme-toggle");

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (themeToggle) themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#0a0b10" : "#f7f8fb"
    );
  };

  const storedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();

  if (storedTheme === "light" || storedTheme === "dark") {
    applyTheme(storedTheme);
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  });

  /* ---------- Sticky header ---------- */
  const header = document.getElementById("header");
  let lastStuck = false;

  const onScroll = () => {
    const stuck = window.scrollY > 8;
    if (stuck !== lastStuck) {
      header?.classList.toggle("is-stuck", stuck);
      lastStuck = stuck;
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  const closeNav = () => {
    nav?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  };

  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    nav?.classList.toggle("is-open", open);
  });

  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeNav();
  });

  /* ---------- Reveal on scroll ---------- */
  const revealItems = document.querySelectorAll(".reveal");

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const siblings = [...(el.parentElement?.children || [])];
          const index = Math.min(siblings.indexOf(el), 6);
          el.style.transitionDelay = `${Math.max(index, 0) * 70}ms`;
          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealItems.forEach((el) => io.observe(el));
  }

  /* ---------- Counters ---------- */
  const counters = document.querySelectorAll("[data-count]");

  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    if (prefersReduced || target === 0) {
      el.textContent = String(target);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
    } else {
      const counterIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            counterIO.unobserve(entry.target);
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((el) => counterIO.observe(el));
    }
  }

  /* ---------- Card spotlight ---------- */
  if (!prefersReduced) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- Active nav link ---------- */
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll('.nav__link[href^="#"]')];

  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      navLinks.forEach((link) =>
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`)
      );
    };

    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- FAQ: single open ---------- */
  const faqItems = [...document.querySelectorAll("#faq-list details")];
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");

  const showError = (field, message) => {
    const input = form.querySelector(`[name="${field}"]`);
    const slot = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (slot) slot.textContent = message || "";
    return !message;
  };

  const validators = {
    name: (v) => (v.trim().length >= 2 ? "" : "Укажите имя — минимум 2 символа"),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Проверьте формат email"),
    message: (v) => (v.trim().length >= 10 ? "" : "Опишите задачу подробнее — от 10 символов"),
  };

  form?.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("blur", () => {
      const validate = validators[input.name];
      if (validate) showError(input.name, validate(input.value));
    });
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        const validate = validators[input.name];
        if (validate) showError(input.name, validate(input.value));
      }
    });
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let valid = true;

    Object.entries(validators).forEach(([field, validate]) => {
      const ok = showError(field, validate(String(data.get(field) || "")));
      if (!ok) valid = false;
    });

    if (!valid) {
      if (status) {
        status.textContent = "Проверьте выделенные поля.";
        status.className = "form__status is-error";
      }
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправляем…";
    }

    /* Демо-отправка: замените на реальный API / Formspree / Telegram-бот. */
    window.setTimeout(() => {
      if (status) {
        status.textContent = "Спасибо! Заявка отправлена — ответим в течение рабочего дня.";
        status.className = "form__status is-ok";
      }
      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заявку";
      }
    }, 700);
  });

  /* ---------- Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
