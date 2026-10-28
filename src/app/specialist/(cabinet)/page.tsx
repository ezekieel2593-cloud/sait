import Link from "next/link";
import { leadCounters, recentLeads } from "@/lib/repositories/leads";
import { channelConfigs, notificationStats } from "@/lib/notifications";
import { knowledgeStats } from "@/lib/knowledge/queries";
import { DIRECTION_LABELS, CHANNEL_LABELS } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, InboxIcon, MessageIcon, SendIcon } from "@/components/icons";
import { StatusBadge } from "@/components/cabinet/StatusBadge";

export const dynamic = "force-dynamic";

export default function CabinetDashboard() {
  const counters = leadCounters();
  const leads = recentLeads(6);
  const channels = channelConfigs();
  const notifications = notificationStats();
  const knowledge = knowledgeStats();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--ocean)]">Обзор</h1>
        <p className="mt-1 text-[0.86rem] text-[var(--ink-soft)]">
          Сводка по заявкам, уведомлениям и состоянию базы знаний.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CounterCard label="Новые" value={counters.new} accent="turquoise" href="/specialist/leads?status=new" />
        <CounterCard label="В работе" value={counters.in_progress} accent="gold" href="/specialist/leads?status=in_progress" />
        <CounterCard label="Ждут ответа клиента" value={counters.awaiting_client} accent="lilac" href="/specialist/leads?status=awaiting_client" />
        <CounterCard label="Завершены" value={counters.done} accent="neutral" href="/specialist/leads?status=done" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
              <InboxIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              Последние обращения
            </h2>
            <Link href="/specialist/leads" className="inline-flex items-center gap-1 text-[0.78rem] text-[var(--turquoise-deep)] hover:text-[var(--ocean)]">
              все заявки <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>

          {leads.length === 0 ? (
            <p className="mt-6 rounded-[10px] border border-dashed border-[var(--line-strong)] px-4 py-8 text-center text-[0.86rem] text-[var(--ink-soft)]">
              Пока нет заявок. Когда клиент оставит обращение, оно появится здесь и в уведомлениях.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/specialist/leads/${lead.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-[rgba(184,221,224,0.12)]">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[0.9rem] font-medium text-[var(--ocean)]">{lead.name}</span>
                        <span className="text-[0.72rem] text-[var(--ink-faint)]">{lead.publicRef}</span>
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-[var(--ink-soft)]">
                        <span>{DIRECTION_LABELS[lead.direction]}</span>
                        <span>·</span>
                        <span>{CHANNEL_LABELS[lead.channel]}: {lead.contact}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <StatusBadge status={lead.status} />
                      <span className="mt-1 block text-[0.7rem] text-[var(--ink-faint)]">{formatDate(lead.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4">
          <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
              <SendIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              Каналы уведомлений
            </h2>
            <ul className="mt-3 grid gap-2">
              {channels.map((channel) => (
                <li key={channel.channel} className="flex items-start justify-between gap-2 text-[0.82rem]">
                  <span>
                    <span className="block font-medium text-[var(--ocean)]">{CHANNEL_LABELS[channel.channel]}</span>
                    <span className="block text-[0.74rem] text-[var(--ink-soft)]">{channel.reason}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                      channel.configured ? "bg-[rgba(184,221,224,0.45)] text-[#2f6570]" : "bg-[rgba(37,61,75,0.07)] text-[var(--ink-soft)]"
                    }`}
                  >
                    {channel.configured ? "вкл" : "выкл"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-center">
              <Stat label="Отправлено" value={notifications.sent} />
              <Stat label="Ошибки" value={notifications.failed} />
              <Stat label="Пропущено" value={notifications.skipped} />
            </div>
          </section>

          <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
              <CheckIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
              База знаний
            </h2>
            <p className="mt-2 text-[0.82rem] text-[var(--ink-soft)]">
              Записей: <strong className="text-[var(--ocean)]">{knowledge.entries}</strong>, источников:{" "}
              <strong className="text-[var(--ocean)]">{knowledge.sources}</strong>
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(knowledge.byDomain).map(([domain, count]) => (
                <li key={domain} className="rounded-full bg-[rgba(37,61,75,0.06)] px-2 py-0.5 text-[0.72rem] text-[var(--ink)]">
                  {domainLabel(domain)}: {count}
                </li>
              ))}
            </ul>
            <Link href="/specialist/knowledge" className="mt-3 inline-flex items-center gap-1 text-[0.78rem] text-[var(--turquoise-deep)] hover:text-[var(--ocean)]">
              открыть базу <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </section>
        </div>
      </div>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">
          <MessageIcon className="h-4 w-4 text-[var(--turquoise-deep)]" />
          Что дальше
        </h2>
        <ul className="mt-2 grid gap-1.5 text-[0.84rem] text-[var(--ink)]">
          <li>· Новые заявки: откройте карточку, проверьте расчёт и смените статус на «В работе».</li>
          <li>· Полные результаты и интерпретации доступны только здесь — клиент видит бесплатную часть.</li>
          <li>· Внутренние заметки не показываются клиенту никогда.</li>
        </ul>
      </section>
    </div>
  );
}

function CounterCard({ label, value, accent, href }: { label: string; value: number; accent: string; href: string }) {
  const accents: Record<string, string> = {
    turquoise: "border-[rgba(184,221,224,0.9)] bg-[linear-gradient(150deg,#f7fdfd,#eaf5f6)]",
    gold: "border-[rgba(201,167,119,0.5)] bg-[linear-gradient(150deg,#fffdfa,#f8f1e7)]",
    lilac: "border-[rgba(220,197,217,0.9)] bg-[linear-gradient(150deg,#fdf9fc,#f6eef4)]",
    neutral: "border-[var(--line)] bg-white",
  };
  return (
    <Link href={href} className={`rounded-[14px] border p-4 transition-transform hover:-translate-y-0.5 ${accents[accent]}`}>
      <p className="text-[0.76rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1.5 font-[family-name:var(--font-display)] text-[2rem] leading-none text-[var(--ocean)]">{value}</p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-display)] text-[1.15rem] text-[var(--ocean)]">{value}</p>
      <p className="text-[0.68rem] uppercase tracking-[0.08em] text-[var(--ink-faint)]">{label}</p>
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

function domainLabel(domain: string): string {
  const map: Record<string, string> = {
    sign: "знаки",
    planet: "планеты",
    house: "дома",
    aspect: "аспекты",
    element: "стихии",
    modality: "кресты",
    arcana: "арканы",
    position: "позиции",
  };
  return map[domain] ?? domain;
}
