import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Home } from "lucide-react";

type UnsubscribeStatus = "loading" | "success" | "error" | "invalid";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<UnsubscribeStatus>("loading");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      setStatus("invalid");
      return;
    }

    handleUnsubscribe();
  }, [email]);

  const handleUnsubscribe = async () => {
    if (!email) return;

    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("email", email)
        .is("unsubscribed_at", null);

      if (error) {
        console.error("Unsubscribe error:", error);
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (error) {
      console.error("Unsubscribe error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {(status === "error" || status === "invalid") && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {status === "loading" && "Processing..."}
            {status === "success" && "Unsubscribed Successfully"}
            {status === "error" && "Unsubscribe Failed"}
            {status === "invalid" && "Invalid Link"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we process your request."}
            {status === "success" && "You have been removed from our newsletter list."}
            {status === "error" && "We couldn't process your unsubscribe request. Please try again later."}
            {status === "invalid" && "This unsubscribe link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "success" && (
            <p className="text-sm text-muted-foreground mb-4">
              You will no longer receive newsletters from KickoffPrediction.
            </p>
          )}
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
