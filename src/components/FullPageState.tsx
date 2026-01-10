import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type FullPageStateVariant = "loading" | "info" | "error";

interface FullPageStateProps {
  title: string;
  description?: string;
  variant?: FullPageStateVariant;
  action?: {
    label: string;
    to: string;
    variant?: "default" | "outline";
  };
  className?: string;
}

export function FullPageState({
  title,
  description,
  variant = "loading",
  action,
  className,
}: FullPageStateProps) {
  const showSpinner = variant === "loading";

  return (
    <div className={cn("min-h-[60vh] flex items-center justify-center px-4", className)}>
      <div className="w-full max-w-md bg-card/80 backdrop-blur border border-border rounded-xl shadow-lg p-6 text-center">
        {showSpinner && (
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        )}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}

        {action ? (
          <div className="mt-5">
            <Link to={action.to}>
              <Button size="sm" variant={action.variant ?? "outline"}>
                {action.label}
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
