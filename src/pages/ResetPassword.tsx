import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SightlineLogo from "@/components/SightlineLogo";
import { friendlyAuthError } from "@/lib/authErrors";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setCheckingToken(false);
      }
    });
    // Also fall back to a short window so we know whether a recovery
    // session ever fired. Supabase emits PASSWORD_RECOVERY on initial load
    // when the URL contains a valid recovery token.
    const timer = setTimeout(() => setCheckingToken(false), 1500);
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isRecovery) {
      setError("This reset link is invalid or has expired.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(friendlyAuthError(error.message));
    } else {
      setSuccess(true);
      successTimerRef.current = setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-4 overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex items-center gap-2.5 w-fit">
            <SightlineLogo size={44} />
            <span className="font-heading text-base font-semibold text-foreground">Sightline</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Every job, start to finish.
          </p>
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-6">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <p className="text-sm text-foreground font-medium">Password updated successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
            <Button
              type="button"
              onClick={() => navigate("/auth")}
              className="w-full h-11 rounded-xl shadow-sm mt-2"
            >
              Continue to login
            </Button>
          </div>
        ) : checkingToken ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            Verifying reset link…
          </div>
        ) : !isRecovery ? (
          <div className="text-center space-y-3 py-6">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">
              This link is invalid or has expired
            </p>
            <p className="text-xs text-muted-foreground">
              Request a new password reset email to continue.
            </p>
            <Link
              to="/auth"
              className="inline-block text-sm text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-medium">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 rounded-xl"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11 rounded-xl shadow-sm" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
