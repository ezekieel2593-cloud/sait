import { getConfig } from "../config";

/**
 * Плашка для владельца на странице результата.
 *
 * Показывает, что ограничения бесплатной версии не действуют, и даёт быстрый
 * переход в кабинет. Оформление — рабочее: светлая плашка с золотой рамкой,
 * без декоративных эффектов.
 */
export function AdminNote({ locked }: { locked: number }) {
  const config = getConfig();
  const cabinet = config.api?.enabled ? "cabinet/index.php" : null;

  return (
    <div className="note note--admin" role="status">
      <p className="font-semibold">Вы вошли как владелец — показана полная расшифровка.</p>
      <p className="mt-1">
        Открыты все разделы: {locked === 0 ? "закрытых нет" : `осталось закрытых — ${locked}`}.
        Ограничения бесплатной версии к вашим расчётам не применяются.
      </p>
      {cabinet ? (
        <p className="mt-2">
          <a href={cabinet} className="underline decoration-dotted underline-offset-2">
            Кабинет и заявки
          </a>
        </p>
      ) : null}
    </div>
  );
}
