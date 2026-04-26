import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { useOnlineStatus } from "@/hooks/useOfflineSync";
import SightlineLogo from "@/components/SightlineLogo";
import {
  LayoutDashboard, BookTemplate,
  LogOut, WifiOff, Menu, X, ChevronLeft, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Templates", icon: BookTemplate, path: "/#templates" },
];

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
  const { signOut } = useAuth();
  const { brand } = useBranding();
  const isOnline = useOnlineStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentHash = location.hash;
  const isActive = (path: string) => {
    const [p, h] = path.split("#");
    if (h) return location.pathname === p && currentHash === `#${h}`;
    if (p === "/") return location.pathname === "/" && !currentHash;
    return location.pathname.startsWith(p);
  };

  const handleNav = (path: string) => {
    const [p, h] = path.split("#");
    navigate(h ? `${p}#${h}` : p);
    setSidebarOpen(false);
    if (h) {
      setTimeout(() => {
        const el = document.getElementById(h);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r flex flex-col transition-transform duration-200 ease-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Brand header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2.5">
            {brand.brandLogoUrl ? (
              <img src={brand.brandLogoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <SightlineLogo size={32} />
            )}
            <div className="min-w-0">
              <h2 className="font-heading text-sm font-medium text-foreground truncate leading-none">
                {brand.brandName || "Sightline"}
              </h2>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 rounded-md hover:bg-secondary text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive(item.path)
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 space-y-1 border-t">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 text-warning text-xs font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              Offline Mode
            </div>
          )}
          <button
            onClick={() => { navigate("/settings"); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              location.pathname.startsWith("/settings")
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Settings
          </button>
          <div className="flex items-center gap-1">
            <BrandingSettings />
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex-1 min-w-0">
              {title && <h1 className="font-heading text-lg font-bold text-foreground truncate">{title}</h1>}
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>

            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
