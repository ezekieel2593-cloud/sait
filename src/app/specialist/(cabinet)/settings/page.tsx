import { getSettings, listSettingRows } from "@/lib/settings";
import { SettingsForm } from "@/components/cabinet/SettingsForm";
import { PasswordForm } from "@/components/cabinet/PasswordForm";
import { channelConfigs } from "@/lib/notifications";
import { CHANNEL_LABELS } from "@/lib/types";
import { ShieldIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getSettings();
  const rows = listSettingRows();
  const channels = channelConfigs();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--ocean)]">Настройки</h1>
        <p className="mt-1 text-[0.86rem] text-[var(--ink-soft)]">
          Всё, что меняется без правки кода. Изменения сразу применяются на сайте.
        </p>
      </div>

      <SettingsForm initial={settings} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">Пароль</h2>
          <div className="mt-3">
            <PasswordForm />
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
          <h2 className="font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">Интеграции</h2>
          <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">
            Каналы уведомлений настраиваются переменными окружения на сервере. В кабинете видно текущее состояние.
          </p>
          <ul className="mt-3 grid gap-2">
            {channels.map((channel) => (
              <li key={channel.channel} className="flex items-start justify-between gap-2 border-b border-[var(--line)] pb-2 text-[0.82rem] last:border-0">
                <span>
                  <span className="block font-medium text-[var(--ocean)]">{CHANNEL_LABELS[channel.channel]}</span>
                  <span className="block text-[0.74rem] text-[var(--ink-soft)]">{channel.reason}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${
                    channel.configured ? "bg-[rgba(184,221,224,0.45)] text-[#2f6570]" : "bg-[rgba(37,61,75,0.07)] text-[var(--ink-soft)]"
                  }`}
                >
                  {channel.configured ? "подключено" : "не настроено"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-1.5 rounded-[10px] bg-[rgba(255,251,245,0.9)] p-2.5 text-[0.74rem] text-[#6b5a45]">
            <ShieldIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Секреты хранятся только в переменных окружения. Инструкция — docs/INTEGRATIONS.md.
          </p>
        </section>
      </div>

      <section className="rounded-[14px] border border-[var(--line)] bg-white p-4">
        <h2 className="font-[family-name:var(--font-sans)] text-[0.95rem] font-semibold text-[var(--ocean)]">История настроек</h2>
        <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">Какие разделы изменялись и когда.</p>
        <ul className="mt-2 grid gap-1 text-[0.78rem] sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-1">
              <span className="text-[var(--ink)]">{row.key}</span>
              <span className="text-[0.72rem] text-[var(--ink-faint)]">{new Date(row.updated_at).toLocaleString("ru-RU")}</span>
            </li>
          ))}
          {rows.length === 0 ? <li className="text-[var(--ink-soft)]">Изменений пока не было — используются значения по умолчанию.</li> : null}
        </ul>
      </section>
    </div>
  );
}
