/** In-page sections. Navigation switches between these — no routing library. */
export type TabId = 'home' | 'sevas' | 'donate' | 'about';

export const TAB_IDS: TabId[] = ['home', 'sevas', 'donate', 'about'];

export const isTabId = (value: string): value is TabId =>
  (TAB_IDS as string[]).includes(value);
