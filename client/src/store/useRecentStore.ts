import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
}

const MAX_RECENT = 8;

interface RecentState {
  items: RecentItem[];
  /** Puts a style at the front of the list; viewing the same one again just moves it up. */
  add: (item: RecentItem) => void;
  clear: () => void;
}

// Kept in this browser only: nothing about what someone looked at is sent anywhere
export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => ({ items: [item, ...state.items.filter((i) => i.id !== item.id)].slice(0, MAX_RECENT) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'footzi-recently-viewed' }
  )
);
