import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, LogOut, Settings, User, MessageSquare, Heart, UserPlus, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";

export default function Header() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Sample notifications - in a real app, these would come from an API
  const notifications = [
    {
      id: 1,
      type: 'like',
      user: 'MikeWilson',
      content: 'liked your workout "Upper Body Day"',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'comment',
      user: 'FitRunner',
      content: 'commented on your post: "Great progress!"',
      time: '1 day ago',
      read: true
    },
    {
      id: 3,
      type: 'follow',
      user: 'Transform Fitness',
      content: 'started following you',
      time: '3 days ago',
      read: true
    }
  ];

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const handleMarkAsRead = () => {
    toast({
      title: "Notifications marked as read",
      description: "All notifications have been marked as read.",
    });
    setNotificationsOpen(false);
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg className="h-8 w-8 text-accent" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              <span className="ml-2 text-xl font-bold text-primary">FitSocial</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`font-medium ${location === '/' ? 'text-accent' : 'text-primary hover:text-accent'}`}
            >
              Feed
            </Link>
            <Link 
              href="/workouts" 
              className={`font-medium ${location === '/workouts' ? 'text-accent' : 'text-primary hover:text-accent'}`}
            >
              Workouts
            </Link>
            <Link 
              href="/discover" 
              className={`font-medium ${location === '/discover' ? 'text-accent' : 'text-primary hover:text-accent'}`}
            >
              Discover
            </Link>
            <Link 
              href="/progress" 
              className={`font-medium ${location === '/progress' ? 'text-accent' : 'text-primary hover:text-accent'}`}
            >
              Progress
            </Link>
          </nav>

          {/* User Menu */}
          {user ? (
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative mr-2"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-secondary" />
                ) : (
                  <Moon className="h-5 w-5 text-secondary" />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative mr-2"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="h-5 w-5 text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-accent"></span>
                )}
              </Button>
              
              <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Notifications</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`flex items-start p-3 rounded-lg ${notification.read ? 'bg-card' : 'bg-accent/5'}`}
                        >
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {notification.type === 'like' && (
                              <Heart className="h-5 w-5 text-red-500" />
                            )}
                            {notification.type === 'comment' && (
                              <MessageSquare className="h-5 w-5 text-blue-500" />
                            )}
                            {notification.type === 'follow' && (
                              <UserPlus className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-semibold">{notification.user}</span> {notification.content}
                            </p>
                            <p className="text-xs text-secondary mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-secondary">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleMarkAsRead}
                    >
                      Mark all as read
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user.id}`} className="cursor-pointer flex w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost">
                <Link href="/auth?mode=login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth?mode=register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
