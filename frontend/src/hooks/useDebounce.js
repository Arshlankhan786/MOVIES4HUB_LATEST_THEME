import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounced value hook.
 * @param {*} value - The value to debounce
 * @param {number} delay - Debounce delay in ms 
 */
export default function useDebounce(value, delay = 400) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
