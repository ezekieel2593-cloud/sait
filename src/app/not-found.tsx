import Link from "next/link";
import { PearlDivider } from "@/components/site/Ornaments";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-[family-name:var(--font-display)] text-[clamp(4rem,14vw,7rem)] leading-none text-[var(--ocean)]">404</p>
        <PearlDivider className="mx-auto mt-2 h-5 w-40" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--ocean)]">Страница не найдена</h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">
          Возможно, ссылка устарела или результат расчёта был удалён по политике хранения данных.
          Начните заново — это займёт меньше минуты.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn--secondary btn--sm">На главную</Link>
          <Link href="/astrology" className="btn btn--primary btn--sm">Рассчитать карту</Link>
          <Link href="/matrix" className="btn btn--ghost btn--sm">Открыть матрицу</Link>
        </div>
      </div>
    </div>
  );
}
