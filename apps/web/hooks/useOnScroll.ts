import { useEffect, useState } from 'react';

export function useOnScroll(throttleMs = 100): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        setScrollY(window.scrollY);
        timeout = null;
      }, throttleMs);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [throttleMs]);

  return scrollY;
}
