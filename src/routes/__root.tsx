import {
  Outlet,
  createRootRoute,
  Link,
} from '@tanstack/react-router'
import { ThemeProvider } from '~/components/theme-provider'
import { Toaster } from 'sonner'
import {
  NavigationProvider,
  AuthProvider,
  MainLayout,
  SkipLinks,
} from '~/navigation'
import { EmbeddingProvider, isEmbeddedMode } from '~/lib/embedding-context'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  // Check if running in embedded mode (inside LMHG-Workspace)
  const isEmbedded = isEmbeddedMode()

  return (
    <EmbeddingProvider>
      <ThemeProvider defaultTheme="system" storageKey="castro-ui-theme">
        <AuthProvider>
          <NavigationProvider>
            {isEmbedded ? (
              // Embedded mode: No MainLayout, just content
              <>
                <Outlet />
                <Toaster position="bottom-right" />
              </>
            ) : (
              // Standalone mode: Full navigation layout
              <>
                <SkipLinks />
                <MainLayout>
                  <Outlet />
                </MainLayout>
                <Toaster position="bottom-right" />
              </>
            )}
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </EmbeddingProvider>
  )
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <p className="text-sm text-muted-foreground max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go back home
      </Link>
    </div>
  )
}
