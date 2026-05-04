import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBrandingContext } from "@/context/BrandingContext";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import { useRole } from "@/hooks/useRole";
import SightlineLogo from "@/components/SightlineLogo";
import {
  LayoutDashboard, Users,
  LogOut, WifiOff, ChevronLeft, SlidersHorizontal, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backTo?: string;
  actions?: React.ReactNode;
}

const AppLayout = ({ children, title, subtitle, backTo, actions }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { brand } = useBrandingContext();
  const isOnline = useOnlineStatus();
  const { canAccessSettings, canInviteMembers } = useRole();

  const slimNav: { label: string; icon: typeof LayoutDashboard; path: string; show: boolean }[] = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", show: true },
    { label: "Command Center", icon: Zap, path: "/command-center", show: true },
    { label: "Team", icon: Users, path: "/team", show: canInviteMembers },
    { label: "Settings", icon: SlidersHorizontal, path: "/settings", show: canAccessSettings },
  ].filter((i) => i.show);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" && !location.hash;
    return location.pathname.startsWith(path);
  };

  const userInitials = (() => {
    const name = (user?.user_metadata as any)?.display_name || user?.email || "?";
    return name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "?";
  })();

  return (
    <div className="min-h-screen bg-page-bg flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Slim icon-only sidebar */}
      <TooltipProvider delayDuration={150}>
        <aside className="hidden md:flex sticky top-0 left-0 z-50 h-screen w-14 bg-[#0f172a] flex-col items-center py-4">
          <button
            onClick={() => navigate("/")}
            aria-label="Sightline"
            className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <SightlineLogo size={22} />
          </button>

          <nav className="flex-1 mt-6 flex flex-col items-center gap-2">
            {slimNav.map((item) => {
              const active = isActive(item.path);
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigate(item.path)}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
                        active ? "bg-white/10 opacity-100" : "opacity-50 hover:opacity-100 hover:bg-white/5"
                      )}
                    >
                      <item.icon className="h-5 w-5 stroke-white" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {!isOnline && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-warning" aria-label="Offline">
                  <WifiOff className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Offline Mode</TooltipContent>
            </Tooltip>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label="Account menu"
                className="mt-2 rounded-full focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Avatar className="h-9 w-9 border border-white/10">
                  <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-44 p-1">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </PopoverContent>
          </Popover>
        </aside>
      </TooltipProvider>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                aria-label="Go back"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate leading-tight">
                {brand.brandName || "Sightline"}
              </div>
              {title && (
                <div className="text-xs text-muted-foreground truncate leading-tight">
                  {title}{subtitle ? ` · ${subtitle}` : ""}
                </div>
              )}
              {!title && subtitle && (
                <div className="text-xs text-muted-foreground truncate leading-tight">{subtitle}</div>
              )}
            </div>

            {actions && (
              <div className="flex items-center gap-2 shrink-0 min-w-0">{actions}</div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-4 lg:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around items-center h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {[
          { label: "Dashboard", icon: LayoutDashboard, onClick: () => navigate("/"), active: location.pathname === "/" },
          { label: "Command Center", icon: Zap, onClick: () => navigate("/command-center"), active: location.pathname.startsWith("/command-center") },
          ...(canInviteMembers ? [{ label: "Team", icon: Users, onClick: () => navigate("/team"), active: location.pathname.startsWith("/team") }] : []),
          ...(canAccessSettings ? [{ label: "Settings", icon: SlidersHorizontal, onClick: () => navigate("/settings"), active: location.pathname.startsWith("/settings") }] : []),
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={tab.onClick}
            aria-label={tab.label}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 mx-1 my-1.5 rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              tab.active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className={cn("h-5 w-5", tab.active && "text-primary")} />
            <span className="truncate max-w-full leading-tight">
              {tab.label === "Command Center" ? (
                <>
                  <span className="hidden sm:inline">Command Center</span>
                  <span className="sm:hidden">Command</span>
                </>
              ) : (
                tab.label
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
