import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  HelpCircle,
  Settings,
  Menu,
  Zap,
  User
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const Sidebar = () => {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const { data: recentSites = [] } = useQuery<{id: number, domain: string}[]>({
    queryKey: ['/api/analysis/recent'],
    enabled: isAuthenticated, // Only fetch recent sites if user is authenticated
  });

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5 mr-3" />,
      active: location === "/dashboard"
    },
    {
      href: "/site-history",
      label: "Site History",
      icon: <FileText className="h-5 w-5 mr-3" />,
      active: location === "/site-history"
    },
    {
      href: "/how-it-works",
      label: "How it Works",
      icon: <HelpCircle className="h-5 w-5 mr-3" />,
      active: location === "/how-it-works"
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5 mr-3" />,
      active: location === "/settings"
    },
    {
      href: "/account",
      label: "Account",
      icon: <User className="h-5 w-5 mr-3" />,
      active: location === "/account"
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-gray-200 md:min-h-screen">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-primary-700 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
          
            <h1 className="text-xl font-bold text-primary-800">TrailWave SEO</h1>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <nav className={cn("p-4 space-y-1", isOpen ? "block" : "hidden md:block")}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer",
                item.active
                  ? "text-primary-700 bg-primary-50"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {item.icon}
              {item.label}
            </div>
          </Link>
        ))}

        {isAuthenticated && recentSites && recentSites.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Recent Sites
            </h3>
            <div className="mt-2 space-y-1">
              {recentSites.map((site: { domain: string, id: number }) => (
                <Link key={site.id} href={`/analysis/${site.id}`}>
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer">
                    {site.domain}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;