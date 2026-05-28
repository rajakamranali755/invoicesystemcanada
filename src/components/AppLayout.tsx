import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, FileText, Receipt, BarChart3, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPANY = "ABC_CANADA COMPANY";

const nav = [
  { to: "/", label: "Companies", icon: Building2 },
  { to: "/sales", label: "New Invoice", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/reports/unsold", label: "Unsold Report", icon: BarChart3 },
];

export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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