import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SightlineLogo from "@/components/SightlineLogo";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
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
    return () => subscription.unsubscribe();
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
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-fit">
            <SightlineLogo size={48} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-6">
            <CheckCircle className="h-12 w-12 text-accent mx-auto" />
            <p className="text-sm text-foreground font-medium">Password updated successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
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
            <div>
              <Label htmlFor="password" className="text-sm text-muted-foreground">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
