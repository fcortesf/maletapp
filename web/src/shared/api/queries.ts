import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './transport'
export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: (count, error) => count < 2 && error instanceof ApiError && ['network', 'busy'].includes(error.code), retryDelay: (attempt, error) => error instanceof ApiError && error.retryAfter ? error.retryAfter : Math.min(1000 * 2 ** attempt, 4000), refetchOnWindowFocus: true }, mutations: { retry: false } } })
}
