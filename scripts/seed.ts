/**
 * Наполняет базу начальными данными: услуги, источники базы знаний,
 * записи расшифровок. Скрипт идемпотентен — можно запускать повторно.
 * Запуск: npm run db:seed
 */
import { createStandaloneDb, newId, nowIso } from "../src/lib/db.ts";
import { seedKnowledge } from "../src/lib/knowledge/seed.ts";

const file = process.env.DATABASE_PATH || "./data/app.db";
const db = createStandaloneDb(file);
const now = nowIso();

const services = [
  {
    slug: "astrology-full",
    direction: "astrology",
    title: "Полный астрологический разбор",
    description:
      "Натальная карта целиком: все планеты и дома, асцендент, аспекты и подробные интерпретации. Ответы на ваши вопросы по карте.",
    includes: [
      "Полная натальная карта с расшифровкой",
      "Разбор характера и сильных сторон",
      "Реализация, деньги, отношения",
      "Ответы на вопросы по карте",
    ],
  },
  {
    slug: "matrix-full",
    direction: "matrix",
    title: "Полный разбор Матрицы судьбы",
    description:
      "Все позиции матрицы: личный и родовой квадрат, линии денег и отношений, кармический хвост и предназначение.",
    includes: [
      "Полная схема с расшифровкой всех 22 энергий",
      "Личный и родовой квадрат",
      "Каналы денег и отношений",
      "Предназначение и годовые энергии",
    ],
  },
  {
    slug: "consultation",
    direction: "both",
    title: "Консультация по вашему вопросу",
    description:
      "Разбор конкретной темы: отношения, выбор пути, работа и деньги. Вы сами определяете вопрос, специалист готовит ответ.",
    includes: [
      "Онлайн-встреча или развёрнутый письменный ответ",
      "Разбор выбранной темы",
      "Рекомендации и следующие шаги",
    ],
  },
];

let sort = 0;
for (const service of services) {
  const existing = db.prepare("SELECT id FROM services WHERE slug = ?").get(service.slug) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE services SET direction = ?, title = ?, description = ?, includes = ?, sort = ?, updated_at = ? WHERE id = ?"
    ).run(
      service.direction,
      service.title,
      service.description,
      JSON.stringify(service.includes),
      sort++,
      now,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO services (id, slug, direction, title, description, price, duration, includes, is_active, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 1, ?, ?, ?)"
    ).run(newId("srv"), service.slug, service.direction, service.title, service.description, JSON.stringify(service.includes), sort++, now, now);
  }
  console.log(`· услуга ${service.slug}`);
}

const knowledge = seedKnowledge(db);
console.log(`· источников: ${knowledge.sources}`);
console.log(`· записей базы знаний: ${knowledge.entries}`);

db.close();
console.log("Готово.");
