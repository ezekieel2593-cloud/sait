import Link from "next/link";
import { listLeads } from "@/lib/repositories/leads";
import { StatusBadge } from "@/components/cabinet/StatusBadge";
import { CHANNEL_LABELS, DIRECTION_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type Direction } from "@/lib/types";
import { SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  direction?: string;
  q?: string;
  sort?: string;
  page?: string;
}

const PAGE_SIZE = 20;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const status = (LEAD_STATUSES as string[]).includes(params.status ?? "") ? (params.status as LeadStatus) : "all";
  const direction = ["astrology", "matrix"].includes(params.direction ?? "") ? (params.direction as Direction) : "all";
  const search = params.q ?? "";
  const sort = params.sort === "old" ? "old" : "new";
  const page = Math.max(Number(params.page ?? 1) || 1, 1);

  const { items, total } = listLeads({
    status,
    direction,
    search,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const buildQuery = (patch: Partial<SearchParams>) => {
    const query = new URLSearchParams();
    const next = { status, direction, q: search, sort, page: String(page), ...patch };
    if (next.status && next.status !== "all") query.set("status", next.status);
    if (next.direction && next.direction !== "all") query.set("direction", next.direction);
    if (next.q) query.set("q", next.q);
    if (next.sort && next.sort !== "new") query.set("sort", next.sort);
    if (next.page && next.page !== "1") query.set("page", next.page);
    const stringified = query.toString();
    return stringified ? `?${stringified}` : "";
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--ocean)]">Заявки</h1>
          <p className="mt-1 text-[0.84rem] text-[var(--ink-soft)]">
            Найдено: {total}. Данные доступны только в кабинете; ссылки на клиентские страницы не содержат персональных данных.
          </p>
        </div>
      </div>

      <form method="get" className="rounded-[14px] border border-[var(--line)] bg-white p-3">
        <div className="grid gap-2 md:grid-cols-[1.6fr_1fr_1fr_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Имя, контакт или номер заявки"
              aria-label="Поиск по заявкам"
              className="input py-2 pl-9 text-[0.88rem]"
            />
          </div>
          <select name="status" defaultValue={status} aria-label="Фильтр по статусу" className="select py-2 text-[0.88rem]">
            <option value="all">Все статусы</option>
            {LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>
                {LEAD_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
          <select name="direction" defaultValue={direction} aria-label="Фильтр по направлению" className="select py-2 text-[0.88rem]">
            <option value="all">Оба направления</option>
            <option value="astrology">Астрология</option>
            <option value="matrix">Матрица судьбы</option>
          </select>
          <div className="flex gap-2">
            <select name="sort" defaultValue={sort} aria-label="Сортировка" className="select py-2 text-[0.88rem]">
              <option value="new">Сначала новые</option>
              <option value="old">Сначала старые</option>
            </select>
            <button type="submit" className="btn btn--primary btn--sm">
              Найти
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-white">
        {items.length === 0 ? (
          <p className="px-4 py-12 text-center text-[0.88rem] text-[var(--ink-soft)]">
            Заявок по этим условиям нет. Измените фильтры или сбросьте поиск.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {items.map((lead) => (
              <li key={lead.id}>
                <Link href={`/specialist/leads/${lead.id}`} className="grid gap-2 px-4 py-3 transition-colors hover:bg-[rgba(184,221,224,0.12)] md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[0.92rem] font-medium text-[var(--ocean)]">
                      {lead.name}
                      <span className="text-[0.72rem] font-normal text-[var(--ink-faint)]">{lead.publicRef}</span>
                    </p>
                    <p className="text-[0.76rem] text-[var(--ink-soft)]">
                      {DIRECTION_LABELS[lead.direction]}
                      {lead.serviceTitle ? ` · ${lead.serviceTitle}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0 text-[0.8rem] text-[var(--ink)]">
                    <p className="truncate">{CHANNEL_LABELS[lead.channel]}: {lead.contact}</p>
                  </div>
                  <div>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="text-[0.74rem] text-[var(--ink-faint)] md:text-right">{formatDate(lead.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Постраничная навигация">
          <Link
            href={`/specialist/leads${buildQuery({ page: String(Math.max(page - 1, 1)) })}`}
            aria-disabled={page <= 1}
            className={`btn btn--secondary btn--sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Назад
          </Link>
          <p className="text-[0.8rem] text-[var(--ink-soft)]">
            Страница {page} из {totalPages}
          </p>
          <Link
            href={`/specialist/leads${buildQuery({ page: String(Math.min(page + 1, totalPages)) })}`}
            aria-disabled={page >= totalPages}
            className={`btn btn--secondary btn--sm ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            Вперёд
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
