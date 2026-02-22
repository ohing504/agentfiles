import { Link } from "@tanstack/react-router"
import { ArrowLeft, FileText } from "lucide-react"
import type React from "react"
import { ScopeBadge } from "@/components/ScopeBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatFileSize } from "@/lib/format"
import type { AgentFile } from "@/shared/types"

interface AgentFileDetailProps {
  item: AgentFile | undefined
  isLoading: boolean
  decoded: string
  backTo: string
  backLabel: string
  icon: React.ReactNode
  title: string
  extraBadges?: React.ReactNode
  extraDetailRows?: React.ReactNode
}

export function AgentFileDetail({
  item,
  isLoading,
  decoded,
  backTo,
  backLabel,
  icon,
  title,
  extraBadges,
  extraDetailRows,
}: AgentFileDetailProps) {
  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!item) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to={backTo}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {backLabel}
          </Link>
        </Button>
        <p className="text-muted-foreground">Not found: {decoded}</p>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={backTo}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {backLabel}
        </Link>
      </Button>

      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h1 className="text-2xl font-bold">{title}</h1>
        <ScopeBadge scope={item.scope} />
        {extraBadges}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Name</span>
              <span className="font-mono">{item.name}</span>
            </div>
            {item.namespace && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-32 shrink-0">
                  Namespace
                </span>
                <span className="font-mono">{item.namespace}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Scope</span>
              <ScopeBadge scope={item.scope} />
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Path</span>
              <span className="font-mono text-xs break-all">{item.path}</span>
            </div>
            {extraDetailRows}
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Size</span>
              <span>{formatFileSize(item.size)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">
                Last Modified
              </span>
              <span>{formatDate(item.lastModified)}</span>
            </div>
          </CardContent>
        </Card>

        {item.frontmatter && Object.keys(item.frontmatter).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Frontmatter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(item.frontmatter).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground w-32 shrink-0 capitalize">
                    {key}
                  </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                Content
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-md p-4 max-h-96 overflow-auto">
              <span className="text-muted-foreground italic">
                Open file to view content: {item.path}
              </span>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
