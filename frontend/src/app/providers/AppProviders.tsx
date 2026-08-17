import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren, useState } from 'react'
import { HashRouter } from 'react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { I18nProvider } from '../../shared/i18n/I18n'
import { AdaptiveViewport } from '../AdaptiveViewport'
import { AppErrorBoundary } from './AppErrorBoundary'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  }))

  return (
    <AppErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="sensorhub-theme">
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <HashRouter>
              <AdaptiveViewport>{children}</AdaptiveViewport>
            </HashRouter>
          </I18nProvider>
        </QueryClientProvider>
        <Toaster position="top-center" richColors={false} />
      </ThemeProvider>
    </AppErrorBoundary>
  )
}
