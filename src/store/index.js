// src/store/index.js - FIXED
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken = null) => {
        localStorage.setItem('access_token', token);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        set({ user, token, refreshToken: refreshToken || null, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      getUser: () => get().user,

      hasAccess: () => Boolean(get().user),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));

const THEME_KEY = 'bonoos-ui-theme';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: typeof document !== 'undefined' && document.documentElement.dataset.theme === 'ocean' ? 'ocean' : 'bonoos',
      setTheme: (next) => {
        const t = next === 'ocean' ? 'ocean' : 'bonoos';
        document.documentElement.dataset.theme = t;
        set({ theme: t });
      },
    }),
    {
      name: THEME_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.dataset.theme = state.theme === 'ocean' ? 'ocean' : 'bonoos';
        }
      },
    }
  )
);
