import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/config/api'

interface Monster {
  id: number
  name: string
  element: string
  naturalStars: number
  imageUrl: string
  buildArchetypes: string[]
}

/** Fetch monsters matching the given build archetypes */
export function useMonstersByBuild(archetypes: string[]) {
  return useQuery({
    queryKey: ['monsters', 'by-build', archetypes],
    queryFn: async () => {
      if (archetypes.length === 0) return []
      const response = await callApi<{ monsters: Monster[]; count: number }>(
        `/monsters/for-rune?archetypes=${archetypes.join(',')}`
      )
      return response.ok ? response.data.monsters : []
    },
    enabled: archetypes.length > 0,
    staleTime: 1000 * 60 * 60, // 1h — monsters rarely change
  })
}
