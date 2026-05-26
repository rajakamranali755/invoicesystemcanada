import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Package, FileText, Receipt, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const COMPANY = "ABC_CANADA COMPANY";

const nav = [
  { to: "/", label: "Inventory", icon: Package },
  { to: "/sales", label: "New Invoice", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/reports/unsold", label: "Unsold Report", icon: BarChart3 },
];

export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      if (!session) {
        navigate({ to: "/login", replace: true });
      } else {
        setEmail(session.user.email ?? null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/login", replace: true });
      } else {
        setEmail(data.session.user.email ?? null);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">{COMPANY}</h1>
            <p className="text-xs text-muted-foreground">Invoice & Inventory Management</p>
          </div>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = pathname === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                </Link>
              );
            })}
            <div className="ml-3 pl-3 border-l flex items-center gap-2">
              {email && <span className="text-xs text-muted-foreground hidden md:inline">{email}</span>}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/login", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Sign out</span>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export { COMPANY };