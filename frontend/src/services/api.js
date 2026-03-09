import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const MOVIE_API_URL = API_BASE;
export const ANIME_API_URL = import.meta.env.VITE_ANIME_API_URL || 'https://animeverseapi.vercel.app';
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor — attach JWT
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('m4h_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Skip logging for cancelled requests (AbortController)
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // Network error (backend not running) — swallow silently
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
            return Promise.reject(error);
        }

        // Timeout
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(error);
        }

        // Handle 401 — redirect to login ONLY if not already on auth pages
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || '';
            const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

            // Don't redirect if this IS the login/register request — let the error bubble up
            if (!isAuthRequest) {
                localStorage.removeItem('m4h_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
