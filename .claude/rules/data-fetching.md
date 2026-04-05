## 🗄️ Data Fetching - React Query (TanStack Query)

### Quand Utiliser React Query ?

✅ **OUI - Utiliser React Query pour :**

- Apps avec beaucoup de fetching (conversations, messages, listes)
- Besoin de cache pour éviter refetch inutiles
- Optimistic updates pour UX fluide
- Pagination, infinite scroll

❌ **NON - Pas nécessaire pour :**

- Fetch simples (1-2 endpoints)
- Pages statiques (SSG)
- Données rarement changées

### Setup Standard

```tsx
// components/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min fresh
            gcTime: 10 * 60 * 1000, // 10 min cache
            retry: 1, // 1 retry
            refetchOnWindowFocus: false, // No refetch on focus
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

### Best Practices

```typescript
// ✅ BON - Queries pour reads, Mutations pour writes
const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
const mutation = useMutation({ mutationFn: createUser })

// ❌ MAUVAIS - Fetch manuel
const users = await fetch('/api/users')

// ✅ BON - QueryKeys cohérents
['conversations']              // Liste
['conversation', id]           // Item spécifique

// ❌ MAUVAIS - QueryKeys inconsistants
['convs'], ['conversation'], ['chat'] // Duplication cache

// ✅ BON - enabled flag pour queries conditionnelles
useQuery({ queryKey: ['user', id], queryFn: fetchUser, enabled: !!id })
```
