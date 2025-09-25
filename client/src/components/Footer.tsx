
import { Mail } from "lucide-react";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`border-t bg-muted/30 py-6 ${className}`} role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <p className="text-muted-foreground">
              &copy; 2024 TrailWave SEO. Built with ❤️ on Replit.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>Support:</span>
            <a 
              href="mailto:support@trailwaveseo.com" 
              className="text-primary hover:text-primary/80 transition-colors"
            >
              support@trailwaveseo.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
