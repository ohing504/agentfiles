import { AppHeader } from "@/components/layout/AppHeader"
import { StatusBar } from "@/components/layout/StatusBar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      <StatusBar />
    </div>
  )
}
