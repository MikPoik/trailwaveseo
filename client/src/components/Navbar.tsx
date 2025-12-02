import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  onGetStarted?: () => void;
  showGetStarted?: boolean;
}

const Navbar = ({ onGetStarted, showGetStarted = true }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const defaultGetStarted = () => {
    window.location.href = "/handler/sign-in";
  };

  const handleGetStarted = onGetStarted || defaultGetStarted;

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TrailWave SEO</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {!isAuthenticated && (
              <>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {(user as any).name || (user as any).email}
                </span>
                <Button onClick={logout} variant="outline" size="sm">
                  Logout
                </Button>
              </div>
            ) : (
              showGetStarted && (
                <Button onClick={handleGetStarted} size="sm">
                  Login
                </Button>
              )
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-sm">
            <nav className="px-4 py-4 space-y-4">
              {!isAuthenticated && (
                <>
                  <Link 
                    href="/how-it-works" 
                    className="block text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How It Works
                  </Link>
                  <Link 
                    href="/pricing" 
                    className="block text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <Link 
                  href="/dashboard" 
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {isAuthenticated && user ? (
                <div className="space-y-3 pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {(user as any).name || (user as any).email}
                  </div>
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                showGetStarted && (
                  <Button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleGetStarted();
                    }} 
                    className="w-full"
                  >
                    Get Started
                  </Button>
                )
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;