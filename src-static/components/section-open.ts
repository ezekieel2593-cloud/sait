/**
 * Открыть раздел разбора по его id из любого места страницы.
 *
 * Разделы свёрнуты в список, поэтому простого перехода по якорю мало: нужно
 * сначала раскрыть нужный пункт. Компонент списка регистрирует обработчик,
 * а карточки планет и точек пользуются этой функцией — единый путь навигации
 * и для полосы разделов, и для кнопок внутри разбора.
 */

type Opener = (sectionId: string) => boolean;

const openers: Opener[] = [];

export function registerSectionOpener(opener: Opener): () => void {
  openers.push(opener);
  return () => {
    const index = openers.indexOf(opener);
    if (index >= 0) openers.splice(index, 1);
  };
}

/** Возвращает true, если раздел найден в списке и раскрыт. */
export function openSection(sectionId: string): boolean {
  if (typeof document === "undefined") return false;
  for (const opener of openers) {
    if (opener(sectionId)) return true;
  }
  return false;
}

/**
 * Раздел по id с прокруткой: если он есть в списке — раскрываем и подводим
 * к экрану, иначе просто прокручиваем к элементу (блок «Что ещё видно» и т. п.).
 */
export function revealSection(sectionId: string) {
  if (typeof document === "undefined") return;
  const opened = openSection(sectionId);
  const scroll = () => {
    const element = document.getElementById(sectionId);
    if (element && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  if (opened) {
    // Даём React отрисовать раскрытый раздел, потом прокручиваем.
    window.setTimeout(scroll, 60);
  } else {
    scroll();
  }
}
