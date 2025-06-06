import { useAuth } from "@/hooks/use-auth";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dumbbell, 
  LineChart, 
  Users, 
  Bookmark, 
  Settings 
} from "lucide-react";
import UserStatsDisplay from "@/components/shared/UserStatsDisplay";

export default function LeftSidebar() {
  const { user } = useAuth();
  
  const { data: workoutStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/workouts/stats'],
    enabled: !!user
  });

  return (
    <div className="hidden md:block w-64 desktop-sidebar sticky top-20">
      <div className="bg-card rounded-lg shadow-sm p-4 mb-4 text-card-foreground">
        {user && (
          <>
            <Link href={`/profile/${user.id}`} className="flex items-center mb-4">
              <div className="h-12 w-12 rounded-full mr-3 overflow-hidden">
                <img 
                  src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.username} 
                  alt={user.username}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold">{user.username}</h3>
                <p className="text-sm text-secondary">@{user.username.toLowerCase()}</p>
              </div>
            </Link>

            {loadingStats ? (
              <div className="grid grid-cols-3 text-center mb-4 text-sm">
                <div>
                  <Skeleton className="h-6 w-12 mx-auto mb-1" />
                  <div className="text-secondary text-xs">Workouts</div>
                </div>
                <div>
                  <Skeleton className="h-6 w-12 mx-auto mb-1" />
                  <div className="text-secondary text-xs">Following</div>
                </div>
                <div>
                  <Skeleton className="h-6 w-12 mx-auto mb-1" />
                  <div className="text-secondary text-xs">Followers</div>
                </div>
              </div>
            ) : (
              <UserStatsDisplay 
                workoutCount={workoutStats?.totalWorkouts || 0}
                followingCount={workoutStats?.following || 0}
                followerCount={workoutStats?.followers || 0}
                className="mb-4 text-sm"
              />
            )}

            <div className="mb-2 pb-4 border-b border-border">
              <div className="text-sm font-medium mb-1 text-foreground">This Week's Progress</div>
              <div className="flex items-center">
                {loadingStats ? (
                  <Skeleton className="h-8 w-8 rounded-full mr-2" />
                ) : (
                  <div className="relative h-8 w-8 mr-2">
                    <ProgressRing 
                      progress={
                        workoutStats?.weeklyWorkouts 
                          ? Math.min(100, (workoutStats.weeklyWorkouts / workoutStats.weeklyGoal) * 100) 
                          : 0
                      } 
                      size={30} 
                      strokeWidth={3}
                    />
                  </div>
                )}
                <div>
                  {loadingStats ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <>
                      <span className="font-mono font-medium">{workoutStats?.weeklyWorkouts || 0}</span>
                      <span className="text-secondary text-sm">/{workoutStats?.weeklyGoal || 0} workouts</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <ul className="space-y-2 mt-4">
          <li>
            <Link href="/workouts" className="flex items-center p-2 text-secondary hover:bg-muted rounded-lg">
              <Dumbbell className="h-5 w-5 mr-3" />
              <span>My Workouts</span>
            </Link>
          </li>
          <li>
            <Link href="/progress" className="flex items-center p-2 text-secondary hover:bg-muted rounded-lg">
              <LineChart className="h-5 w-5 mr-3" />
              <span>Progress</span>
            </Link>
          </li>
          <li>
            <Link href="/discover" className="flex items-center p-2 text-secondary hover:bg-muted rounded-lg">
              <Users className="h-5 w-5 mr-3" />
              <span>Discover</span>
            </Link>
          </li>
          <li>
            <Link href="/programs" className="flex items-center p-2 text-secondary hover:bg-muted rounded-lg">
              <Bookmark className="h-5 w-5 mr-3" />
              <span>Saved Programs</span>
            </Link>
          </li>
          <li>
            <Link href="/settings" className="flex items-center p-2 text-secondary hover:bg-muted rounded-lg">
              <Settings className="h-5 w-5 mr-3" />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
