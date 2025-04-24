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

export default function LeftSidebar() {
  const { user } = useAuth();
  
  const { data: workoutStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/workouts/stats'],
    enabled: !!user
  });

  return (
    <div className="hidden md:block w-64 desktop-sidebar sticky top-20">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        {user && (
          <>
            <div className="flex items-center mb-4">
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
            </div>

            <div className="grid grid-cols-3 text-center mb-4 text-sm">
              {loadingStats ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <div className="font-mono font-semibold">{workoutStats?.totalWorkouts || 0}</div>
                    <div className="text-secondary text-xs">Workouts</div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold">{workoutStats?.following || 0}</div>
                    <div className="text-secondary text-xs">Following</div>
                  </div>
                  <div>
                    <div className="font-mono font-semibold">{workoutStats?.followers || 0}</div>
                    <div className="text-secondary text-xs">Followers</div>
                  </div>
                </>
              )}
            </div>

            <div className="mb-2 pb-4 border-b border-gray-100">
              <div className="text-sm font-medium mb-1">This Week's Progress</div>
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
            <Link href="/workouts">
              <a className="flex items-center p-2 text-secondary hover:bg-gray-50 rounded-lg">
                <Dumbbell className="h-5 w-5 mr-3" />
                <span>My Workouts</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/progress">
              <a className="flex items-center p-2 text-secondary hover:bg-gray-50 rounded-lg">
                <LineChart className="h-5 w-5 mr-3" />
                <span>Progress</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/friends">
              <a className="flex items-center p-2 text-secondary hover:bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 mr-3" />
                <span>Friends</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/saved">
              <a className="flex items-center p-2 text-secondary hover:bg-gray-50 rounded-lg">
                <Bookmark className="h-5 w-5 mr-3" />
                <span>Saved Programs</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/settings">
              <a className="flex items-center p-2 text-secondary hover:bg-gray-50 rounded-lg">
                <Settings className="h-5 w-5 mr-3" />
                <span>Settings</span>
              </a>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
