
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function getValue<T>(key: string, initialValue: T | (() => T)): T {
  const savedValue = localStorage.getItem(key);
  if (savedValue) {
    try {
      return JSON.parse(savedValue);
    } catch (e) {
      console.error("Failed to parse value from localStorage", e);
      localStorage.removeItem(key);
    }
  }

  if (initialValue instanceof Function) {
    return initialValue();
  }
  return initialValue;
}

// Fix: Use the imported Dispatch and SetStateAction types directly, removing the 'React.' namespace prefix to resolve the error.
export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => getValue(key, initialValue));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
