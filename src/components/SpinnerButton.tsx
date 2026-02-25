import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface SpinnerButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean
}

export function SpinnerButton({
  loading,
  children,
  disabled,
  className,
  ...props
}: SpinnerButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn("relative", className)}
      {...props}
    >
      <span className={loading ? "invisible" : ""}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
    </Button>
  )
}
