import * as React from 'react';
import { Appearance, ColorSchemeName, Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const THEME_PREFERENCE_KEY = 'oikentra_theme_preference';

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'light',
  preference: 'system',
  setPreference: () => {},
});

function resolveTheme(preference: ThemePreference, systemTheme: Theme | null): Theme {
  return preference === 'system' ? (systemTheme ?? 'light') : preference;
}

function applyNativeTheme(preference: ThemePreference) {
  if (Platform.OS === 'web') return;
  if (preference === 'system') {
    Appearance.setColorScheme(null as unknown as ColorSchemeName);
  } else {
    Appearance.setColorScheme(preference);
  }
}

function applyWebClass(theme: Theme) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const rawSystemTheme = useColorScheme();
  const systemTheme: Theme | null =
    rawSystemTheme === 'light' || rawSystemTheme === 'dark' ? rawSystemTheme : null;
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = SecureStore.getItem(THEME_PREFERENCE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setPreferenceState(stored);
    }
    setHydrated(true);
  }, []);

  const theme = React.useMemo(
    () => resolveTheme(preference, systemTheme),
    [preference, systemTheme]
  );

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    SecureStore.setItemAsync(THEME_PREFERENCE_KEY, next).catch(() => {
      // Persistence is best-effort.
    });
    applyNativeTheme(next);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    applyNativeTheme(preference);
    applyWebClass(theme);
  }, [preference, theme, hydrated]);

  const value = React.useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  return React.useContext(ThemeContext);
}
