import { useLocation } from "wouter";
import Header from "./Header";
import MobileNav from "./MobileNav";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import { useAuth } from "@/hooks/use-auth";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Don't show sidebars on auth page
  const showSidebars = location !== "/auth" && user;
  const isAuthPage = location === "/auth";

  // Mobile tabs navigation for authenticated pages
  const showMobileTabs = !isAuthPage && user;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {!isAuthPage && <Header />}

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Mobile Navigation Tabs */}
          {showMobileTabs && (
            <div className="block md:hidden mb-6">
              <div className="flex justify-between items-center">
                <div className="flex overflow-x-auto pb-2 space-x-6">
                  <a href="/" className={location === '/' ? "tab-active whitespace-nowrap px-1 py-2 text-sm font-medium" : "text-secondary whitespace-nowrap px-1 py-2 text-sm font-medium"}>Feed</a>
                  <a href="/workouts" className={location === '/workouts' ? "tab-active whitespace-nowrap px-1 py-2 text-sm font-medium" : "text-secondary whitespace-nowrap px-1 py-2 text-sm font-medium"}>Workouts</a>
                  <a href="/discover" className={location === '/discover' ? "tab-active whitespace-nowrap px-1 py-2 text-sm font-medium" : "text-secondary whitespace-nowrap px-1 py-2 text-sm font-medium"}>Discover</a>
                  <a href="/progress" className={location === '/progress' ? "tab-active whitespace-nowrap px-1 py-2 text-sm font-medium" : "text-secondary whitespace-nowrap px-1 py-2 text-sm font-medium"}>Progress</a>
                </div>
              </div>
            </div>
          )}

          {/* Layout with optional sidebars */}
          <div className="flex flex-col md:flex-row gap-6">
            {showSidebars && <LeftSidebar />}
            <div className="flex-grow">
              {children}
            </div>
            {showSidebars && location === "/" && <RightSidebar />}
          </div>
        </div>
      </main>

      {showMobileTabs && <MobileNav />}
    </div>
  );
}
