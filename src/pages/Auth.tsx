import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wallet, ClipboardCheck, Users, FolderOpen } from "lucide-react";
import SightlineMark from "@/components/SightlineMark";

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirmMessage("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setConfirmMessage("Check your email for a password reset link.");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setConfirmMessage("");
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, displayName || email);
      if (error) setError(error.message);
      else setConfirmMessage("Check your email to confirm your account.");
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const features = [
    { icon: Wallet, text: "Full budget, cost & invoice tracking" },
    { icon: ClipboardCheck, text: "Punch out lists with homeowner sign-off" },
    { icon: Users, text: "Real-time team collaboration" },
    { icon: FolderOpen, text: "Photos, blueprints, plans & change orders" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 p-12 bg-card overflow-hidden">
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

        <div className="relative space-y-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1827] ring-1 ring-white/10 shadow-sm text-white">
              <SightlineMark size={22} />
            </div>
            <span className="font-heading text-lg font-semibold text-foreground">
              Sightline
            </span>
          </div>

          <div className="space-y-5 max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Construction Project Management
            </p>
            <h1 className="font-heading text-4xl xl:text-5xl font-bold text-foreground leading-[1.05] tracking-tight">
              Every job,
              <br />
              start to finish.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Built for contractors who need a command center, not a spreadsheet.
            </p>
          </div>

          <ul className="space-y-3 max-w-md">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sightline. Built for the field.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1827] ring-1 ring-white/10 shadow-sm text-white">
              <SightlineMark size={22} />
            </div>
            <span className="font-heading text-base font-semibold text-foreground">
              Sightline
            </span>
          </div>

          {isForgotPassword ? (
            <>
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
                  Reset password
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email to receive a reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                {confirmMessage && (
                  <p className="text-xs text-success">{confirmMessage}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl shadow-sm"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError("");
                  setConfirmMessage("");
                }}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
                  {isSignUp ? "Create account" : "Welcome back"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSignUp
                    ? "Start managing your projects today."
                    : "Sign in to your project dashboard."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName" className="text-xs font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium">
                      Password
                    </Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError("");
                          setConfirmMessage("");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
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

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
                {confirmMessage && (
                  <p className="text-xs text-success">{confirmMessage}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl shadow-sm"
                >
                  {loading
                    ? "Please wait…"
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground text-center">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setConfirmMessage("");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
