import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('m4h_token');
        if (token) {
            api.get('/auth/me')
                .then((res) => {
                    setUser(res.data.data);
                })
                .catch(() => {
                    localStorage.removeItem('m4h_token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: userData, token } = res.data.data;
        localStorage.setItem('m4h_token', token);
        setUser(userData);
        return userData;
    }, []);

    const register = useCallback(async (email, password, username) => {
        const res = await api.post('/auth/register', { email, password, username });
        const { user: userData, token } = res.data.data;
        localStorage.setItem('m4h_token', token);
        setUser(userData);
        return userData;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('m4h_token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}
