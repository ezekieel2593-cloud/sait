import { describe, expect, it } from "vitest";
import {
  createLead,
  getLead,
  listLeads,
  updateLeadStatus,
  updateLeadNotes,
  anonymizeLead,
  leadCounters,
  listLeadEvents,
} from "@/lib/repositories/leads";

const base = {
  name: "Мария",
  direction: "astrology" as const,
  channel: "telegram" as const,
  contact: "@maria_test",
  question: "Когда лучше менять работу?",
  consent: true,
  ipHash: "test-ip",
};

describe("репозиторий заявок", () => {
  it("создаёт заявку с публичным номером и событием создания", () => {
    const lead = createLead({ ...base, name: "Поиск" });
    expect(lead.publicRef).toMatch(/^AP-\d{4}-\d{3}$/);
    expect(lead.status).toBe("new");
    const events = listLeadEvents(lead.id);
    expect(events.some((event) => event.type === "created")).toBe(true);
    expect(getLead(lead.id)?.name).toBe("Поиск");
  });

  it("меняет статус и пишет историю", () => {
    const lead = createLead({ ...base, name: "Статусы" });
    const updated = updateLeadStatus(lead.id, "in_progress", "specialist@example.com", "Взяли в работу");
    expect(updated?.status).toBe("in_progress");
    const events = listLeadEvents(lead.id);
    expect(events.some((event) => event.type === "status_changed" && event.toStatus === "in_progress")).toBe(true);
  });

  it("сохраняет внутренние заметки", () => {
    const lead = createLead({ ...base, name: "Заметки" });
    const updated = updateLeadNotes(lead.id, "Перезвонить в среду", "specialist@example.com");
    expect(updated?.internalNotes).toBe("Перезвонить в среду");
  });

  it("ищет и фильтрует заявки", () => {
    createLead({ ...base, name: "УникальныйПоиск", direction: "matrix" });
    const byName = listLeads({ search: "УникальныйПоиск" });
    expect(byName.total).toBe(1);
    expect(byName.items[0]!.direction).toBe("matrix");

    const byDirection = listLeads({ direction: "astrology", limit: 5 });
    expect(byDirection.items.every((lead) => lead.direction === "astrology")).toBe(true);

    const byStatus = listLeads({ status: "new", limit: 5 });
    expect(byStatus.items.every((lead) => lead.status === "new")).toBe(true);
  });

  it("считает счётчики по статусам", () => {
    const counters = leadCounters();
    expect(counters.total).toBeGreaterThan(0);
    expect(counters.new).toBeGreaterThanOrEqual(0);
  });

  it("обезличивает заявку, не удаляя историю", () => {
    const lead = createLead({ ...base, name: "УдалитьМеня" });
    anonymizeLead(lead.id, "specialist@example.com");
    const cleared = getLead(lead.id)!;
    expect(cleared.name).not.toBe("УдалитьМеня");
    expect(cleared.contact).not.toBe("@maria_test");
    expect(listLeadEvents(lead.id).some((event) => event.type === "anonymized")).toBe(true);
  });
});
