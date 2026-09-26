import { useMemo } from 'react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'late';

export function useTimeOfDay(): TimeOfDay {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'late';
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'night';
  }, []);
}