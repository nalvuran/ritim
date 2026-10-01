import type { ReactNode } from "react";
const S = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{children}</svg>
);
export const Icon = {
  today: () => <S><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>,
  fast: () => <S><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" /><path d="M12 3.5v4M12 12l4-4" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></S>,
  history: () => <S><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></S>,
  stats: () => <S><path d="M5 20V12M10 20V5M15 20v-9M20 20v-5" /></S>,
  profile: () => <S><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.4-3.6 4.3-5.3 7.5-5.3s6.1 1.7 7.5 5.3" /></S>,
  coach: () => <S><path d="M4.5 18.5V7a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8z" /><path d="M9 9.5h6M9 12.5h3.5" /></S>,
  water: () => <S><path d="M12 3.5s6 6.4 6 10.6A6 6 0 0 1 6 14.1C6 9.9 12 3.5 12 3.5z" /></S>,
  meal: () => <S><path d="M7 3.5v7M5 3.5v4a2 2 0 0 0 4 0v-4M7 10.5v10M16.5 20.5v-17c-2 1.2-3 3.6-3 6.5v3h3" /></S>,
  sleep: () => <S><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" /></S>,
  hunger: () => <S><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10-7.5 10z" /></S>,
  close: () => <S><path d="M6 6l12 12M18 6L6 18" /></S>,
  chev: () => <S className="chev"><path d="M9 6l6 6-6 6" /></S>,
  left: () => <S><path d="M15 6l-6 6 6 6" /></S>,
  right: () => <S><path d="M9 6l6 6-6 6" /></S>,
  trash: () => <S><path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7" /></S>,
  send: () => <S><path d="M12 19V5M6 11l6-6 6 6" /></S>,
  stop: () => <S><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" /></S>,
  spark: () => <S><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5L9 15M15 9l2.5-2.5" /></S>,
  bell: () => <S><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></S>,
};
