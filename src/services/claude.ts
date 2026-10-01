/* Claude artifact runtime yetenekleri (yalnızca uygulama claude.ai içinde açıldığında vardır).
   Kendi sunucunda barındırıldığında hepsi null döner ve uygulama yerel alternatiflerle çalışır. */

type Use = (name: string) => Promise<any>;
declare global { interface Window { claude?: { use?: Use } } }

const cache: Record<string, Promise<any>> = {};
export function capability<T = any>(name: "db" | "user" | "sample" | "downloads"): Promise<T | null> {
  const use = window.claude?.use;
  if (typeof use !== "function") return Promise.resolve(null);
  if (!cache[name]) cache[name] = use.call(window.claude, name).catch(() => null);
  return cache[name];
}
export const inClaude = () => typeof window.claude?.use === "function";
