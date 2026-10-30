import { getConfig } from "../config";
import { LeadForm } from "../components/LeadForm";
import { CheckIcon, LockIcon } from "../components/icons";
import { DocumentIcon, ShieldIcon, StarIcon } from "../components/icons-extra";

/** Страница «Полный разбор»: состав, формат, честные условия и заявка. */
export function FullReadingPage() {
  const config = getConfig();

  return (
    <div className="container container--narrow py-10 sm:py-14">
      <p className="eyebrow">Полный разбор</p>
      <h1 className="h-display mt-3">Что вы получаете в полном разборе</h1>
      <p className="lead mt-4">
        Первые разделы дают опору: ключевые планеты или энергии и понятные выводы. Полный разбор — это все разделы,
        ответы на ваши вопросы и разбор конкретной ситуации.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className="card">
          <h2 className="h-card">Что входит</h2>
          <ul className="mt-3 grid gap-2">
            {config.services.fullReadingIncludes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="h-card">Формат</h2>
          <ul className="mt-3 grid gap-2">
            {config.services.fullReadingFormat.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
                <DocumentIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--turquoise-deep)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-4">
        <h2 className="h-card">Как проходит работа</h2>
        <ol className="mt-3 grid gap-2 text-[0.9rem] leading-relaxed text-[var(--ink)]">
          <li>1. Вы отправляете заявку: имя, канал связи, вопрос и данные рождения.</li>
          <li>2. Специалист связывается с вами по выбранному каналу связи.</li>
          <li>3. Вы получаете письменный разбор и/или онлайн-встречу.</li>
        </ol>
        <div className="note note--info mt-4">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Расчёты выполняются по фиксированным алгоритмам, трактовки — эзотерическая традиция, а не научно доказанные
            утверждения. Разбор не заменяет консультацию врача, юриста или финансового специалиста.
          </p>
        </div>
      </section>

      <div className="mt-6">
        <LeadForm direction="astrology" summary="Заявка на полный разбор со страницы «Полный разбор»" />
      </div>
    </div>
  );
}

/** Политика конфиденциальности для статической версии. */
export function PrivacyPage() {
  const config = getConfig();
  return (
    <div className="container container--measure py-10 sm:py-14">
      <p className="eyebrow">Документы</p>
      <h1 className="h-display mt-3">Политика конфиденциальности</h1>
      <p className="mt-2 text-[0.84rem] text-[var(--ink-soft)]">Редакция от {config.legal.privacyUpdatedAt}</p>

      <div className="mt-6 grid gap-5 text-[0.94rem] leading-relaxed text-[var(--ink)]">
        <section>
          <h2 className="h-card">1. Какие данные обрабатываются</h2>
          <p className="mt-2">
            Дата, время и место рождения (для расчёта), а также имя, контакт в выбранном канале и текст вопроса — если вы
            отправляете заявку.
          </p>
        </section>
        <section>
          <h2 className="h-card">2. Где выполняются расчёты</h2>
          <p className="mt-2">
            Натальная карта и Матрица судьбы рассчитываются прямо в вашем браузере. Данные рождения не передаются на
            сервер, пока вы не отправите заявку: результат попадает в ссылку, которую можно сохранить или переслать.
            {config.api?.enabled
              ? " Если вы отправляете заявку, вместе с ней на сервер уходит и результат расчёта — иначе специалист не увидит, о каком разборе речь."
              : ""}
          </p>
        </section>
        <section>
          <h2 className="h-card">3. Заявка и переписка</h2>
          <p className="mt-2">
            {config.api?.enabled
              ? "Заявка сохраняется на сервере сайта: имя, выбранный канал связи, контакт для ответа, вопрос и результат расчёта, который вы сами отправили вместе с заявкой. Доступ к заявкам есть только у владельца сайта через кабинет с паролем. IP-адрес в открытом виде не сохраняется — для защиты от спама хранится только его необратимый хеш. Удалить заявку досрочно можно, написав специалисту в том же канале."
              : "Заявка формируется как текст сообщения. Она попадает к специалисту только после того, как вы сами отправите её в Telegram или на электронную почту. Дальнейшее хранение переписки регулируется правилами мессенджера или почтового сервиса."}
          </p>
        </section>
        <section>
          <h2 className="h-card">4. Сроки хранения</h2>
          <p className="mt-2">
            Переписка по заявке хранится не дольше {config.legal.dataRetentionDays} дней с момента последнего обращения,
            после чего удаляется или обезличивается.
          </p>
        </section>
        <section>
          <h2 className="h-card">5. Ваши права</h2>
          <p className="mt-2">
            Вы можете запросить копию своих данных, исправление или удаление, а также отозвать согласие. Ответственный за
            обработку: {config.legal.responsiblePerson}
            {config.contacts.email ? `. Почта для обращений: ${config.contacts.email}` : ""}.
          </p>
        </section>
        <section>
          <h2 className="h-card">6. Cookies и аналитика</h2>
          <p className="mt-2">
            Сайт не устанавливает рекламных cookies и не использует сторонние трекеры. Технические данные (например,
            выбранный город) могут храниться в памяти браузера, чтобы не вводить их повторно.
          </p>
        </section>
      </div>
    </div>
  );
}

/** Условия использования для статической версии. */
export function TermsPage() {
  const config = getConfig();
  return (
    <div className="container container--measure py-10 sm:py-14">
      <p className="eyebrow">Документы</p>
      <h1 className="h-display mt-3">Условия использования</h1>

      <div className="mt-6 grid gap-5 text-[0.94rem] leading-relaxed text-[var(--ink)]">
        <section>
          <h2 className="h-card">1. Характер материалов</h2>
          <p className="mt-2">
            Астрология и Матрица судьбы — традиционные практики, не имеющие научного подтверждения. Материалы сайта
            носят информационно-развлекательный характер и не являются медицинской, юридической, психологической или
            финансовой рекомендацией.
          </p>
        </section>
        <section>
          <h2 className="h-card">2. Точность расчётов</h2>
          <p className="mt-2">
            Расчёты выполняются по указанным вами данным. При неточном или неизвестном времени рождения дома и асцендент
            недостоверны — сайт явно об этом предупреждает и не выдаёт их как факт. Исторические часовые пояса до
            1970-х годов местами неоднозначны.
          </p>
        </section>
        <section>
          <h2 className="h-card">3. Полный разбор</h2>
          <p className="mt-2">
            Стоимость, сроки и объём полного разбора согласуются со специалистом до начала работы
            {config.services.priceNote ? `: ${config.services.priceNote}` : ""}. Заявка не является договором сама по
            себе.
          </p>
        </section>
        <section>
          <h2 className="h-card">4. Ограничение ответственности</h2>
          <p className="mt-2">
            Решения, принятые на основе материалов сайта, остаются вашей ответственностью. Специалист не даёт гарантий
            относительно событий будущего.
          </p>
        </section>
        <section>
          <h2 className="h-card">5. Интеллектуальная собственность</h2>
          <p className="mt-2">
            Тексты расшифровок — оригинальные формулировки проекта. Внешние источники, на которые опираются трактовки,
            перечислены с указанием авторов и ссылок.
          </p>
        </section>
      </div>

      <p className="mt-6 flex items-start gap-2 text-[0.84rem] text-[var(--ink-soft)]">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {config.api?.enabled
            ? "Заявки хранятся на сервере сайта ограниченное время и доступны только владельцу. Удалить заявку досрочно можно, написав специалисту в том же канале."
            : "Эта страница работает без сервера: данные не отправляются и не хранятся в базе. Если вы отправили заявку — удалить её можно, написав специалисту в том же канале."}
        </span>
      </p>
      <p className="mt-2 flex items-start gap-2 text-[0.84rem] text-[var(--ink-soft)]">
        <StarIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{config.siteName} · {config.tagline}</span>
      </p>
    </div>
  );
}
