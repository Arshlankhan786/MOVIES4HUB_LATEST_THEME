import { createContext, useState, useEffect, useCallback } from 'react';
import { themes } from '../config/theme';
import api from '../services/api';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('m4h_theme');
        return stored === 'light' ? 'light' : 'dark';
    });

    const applyTheme = useCallback((themeName) => {
        const vars = themes[themeName];
        const root = document.documentElement;

        Object.entries(vars).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        root.setAttribute('data-theme', themeName);
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    const toggleTheme = useCallback(async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('m4h_theme', newTheme);

        // Persist to database if logged in
        const token = localStorage.getItem('m4h_token');
        if (token) {
            try {
                await api.patch('/auth/theme', { theme: newTheme });
            } catch (_) {
                // Silently fail — localStorage is the fallback
            }
        }
    }, [theme]);

    const setThemeDirectly = useCallback((themeName) => {
        if (themes[themeName]) {
            setTheme(themeName);
            localStorage.setItem('m4h_theme', themeName);
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeDirectly }}>
            {children}
        </ThemeContext.Provider>
    );
}
