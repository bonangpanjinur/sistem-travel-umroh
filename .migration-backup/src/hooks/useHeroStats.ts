export interface HeroStat {
  id: string;
  settings_id: string;
  stat_value: string;
  stat_label: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hero stats hook — temporarily disabled (table not in DB).
 * Returns empty array without making any network request.
 * Re-enable by restoring the useQuery implementation once the
 * `hero_stats` table migration is applied.
 */
export function useHeroStats() {
  return {
    data: [] as HeroStat[],
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => ({ data: [] as HeroStat[] }),
  };
}
