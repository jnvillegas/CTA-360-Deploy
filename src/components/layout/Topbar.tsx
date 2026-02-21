import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "./UserMenu";
import { GlobalSearch } from "./GlobalSearch";
import logo from "@/assets/logo.png";

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/70 backdrop-blur-xl transition-all">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Left section: Logo and Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-8 h-8" />
            <span className="hidden md:inline-block text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              MediCloud
            </span>
          </div>
        </div>

        {/* Center section: Search */}
        <div className="flex-1 flex justify-center px-4">
          <GlobalSearch />
        </div>

        {/* Right section: Notifications and User Menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
