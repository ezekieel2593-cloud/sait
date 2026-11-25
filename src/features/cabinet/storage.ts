export type PersonCard = {
  id: string;
  name: string;
  relation: string;
  birthday: string;
  createdAt: string;
};
export type SavedReport = {
  id: string;
  title: string;
  kind: "astrology" | "matrix";
  birthday: string;
  createdAt: string;
  href: string;
};
export type PortalStore = { people: PersonCard[]; reports: SavedReport[] };

const KEY = "cosmorox.portal.v1";
const EMPTY: PortalStore = { people: [], reports: [] };

export function readPortalStore(): PortalStore {
  if (typeof window === "undefined") return EMPTY;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(KEY) || "{}",
    ) as Partial<PortalStore>;
    return {
      people: Array.isArray(value.people) ? value.people : [],
      reports: Array.isArray(value.reports) ? value.reports : [],
    };
  } catch {
    return EMPTY;
  }
}
export function writePortalStore(value: PortalStore): void {
  window.localStorage.setItem(KEY, JSON.stringify(value));
}
export function saveReport(
  report: Omit<SavedReport, "id" | "createdAt">,
): SavedReport {
  const store = readPortalStore();
  const saved: SavedReport = {
    ...report,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  writePortalStore({
    ...store,
    reports: [saved, ...store.reports].slice(0, 100),
  });
  return saved;
}
