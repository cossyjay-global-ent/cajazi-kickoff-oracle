import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function parseHashTokens(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  useEffect(() => {
    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            toast.error(error.message);
            setReady(true);
            return;
          }

          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.pathname + url.search);
        } else if (window.location.hash?.includes("access_token")) {
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              toast.error(error.message);
              setReady(true);
              return;
            }
            window.history.replaceState({}, document.title, url.pathname + url.search);
          }
        }

        setReady(true);
      } catch (e) {
        toast.error("Invalid or expired reset link. Please request a new one.");
        setReady(true);
      }
    };

    init();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const validated = schema.parse({ password, confirmPassword });

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated. Please log in.");
      await supabase.auth.signOut();
      navigate("/auth?mode=login");
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach((e) => toast.error(e.message));
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-3 sm:px-4 py-8">
      <div className="w-full max-w-md bg-card/90 backdrop-blur border border-border rounded-xl shadow-xl p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground">Reset password</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Set a new password for your account.
        </p>

        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm h-10 sm:h-11"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-sm">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-sm h-10 sm:h-11"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <Button type="submit" className="w-full h-10 sm:h-11 text-sm" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate("/auth?mode=login")}
            >
              Back to login
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              If this link doesn’t work, request a new reset email from the login page.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
