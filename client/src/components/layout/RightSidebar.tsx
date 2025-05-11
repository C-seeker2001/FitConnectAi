import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Clock,
  Dumbbell,
  Terminal,
  Activity
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDateWithDay } from "@/lib/utils";

export default function RightSidebar() {
  const { user } = useAuth();

  const { data: trendingPrograms, isLoading: loadingPrograms } = useQuery<any[]>({
    queryKey: ['/api/programs/trending'],
    enabled: !!user
  });

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery<any[]>({
    queryKey: ['/api/leaderboard'],
    enabled: !!user
  });

  const { data: upcomingWorkouts, isLoading: loadingUpcoming } = useQuery<any[]>({
    queryKey: ['/api/workouts/upcoming'],
    enabled: !!user
  });

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="hidden lg:block w-72 desktop-sidebar sticky top-20">
      {/* Trending Programs */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="font-semibold mb-3">Trending Programs</h3>
        
        <div className="space-y-3">
          {loadingPrograms ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-start">
                <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : (
            trendingPrograms?.map((program: any) => (
              <div key={program.id} className="flex items-start">
                <div className="bg-gray-100 rounded-lg w-12 h-12 flex items-center justify-center flex-shrink-0 mr-3">
                  {program.type === 'strength' && <Dumbbell className="text-accent h-6 w-6" />}
                  {program.type === 'cardio' && <Terminal className="text-accent h-6 w-6" />}
                  {program.type === 'mixed' && <Activity className="text-accent h-6 w-6" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{program.name}</h4>
                  <p className="text-xs text-secondary">by <span className="text-accent">{program.author}</span></p>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center text-yellow-400 text-xs">
                      {Array(5).fill(0).map((_, i) => (
                        <svg 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < program.rating ? 'fill-current' : 'stroke-current fill-none'}`} 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-secondary ml-1">({program.ratingCount})</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-3 text-center">
          <Link href="/discover" className="text-accent text-sm font-medium">
            View All Programs
          </Link>
        </div>
      </div>
      
      {/* Weekly Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Weekly Leaderboard</h3>
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">Friends</span>
        </div>
        
        <div className="space-y-3">
          {loadingLeaderboard ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="w-6 text-center mr-2 font-mono font-medium">{i+1}</div>
                <Skeleton className="h-8 w-8 rounded-full mr-2" />
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-1.5 w-full mt-1" />
                </div>
              </div>
            ))
          ) : (
            leaderboard?.map((entry: any, index: number) => (
              <div 
                key={entry.id} 
                className={`flex items-center ${entry.isCurrentUser ? 'bg-gray-50 p-1 rounded-lg' : ''}`}
              >
                <div className="w-6 text-center mr-2 font-mono font-medium">{index + 1}</div>
                <img 
                  className="h-8 w-8 rounded-full mr-2 object-cover" 
                  src={entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`} 
                  alt={entry.username} 
                />
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{entry.isCurrentUser ? 'You' : entry.username}</span>
                    <span className="font-mono text-sm font-medium">{entry.workouts}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-accent h-1.5 rounded-full" 
                      style={{ width: `${(entry.workouts / leaderboard[0].workouts) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Upcoming Workouts */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold mb-3">Upcoming Workouts</h3>
        
        <div className="space-y-3">
          {loadingUpcoming ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : (
            upcomingWorkouts?.map((workout: any) => {
              const workoutDate = new Date(workout.scheduledFor);
              const isToday = workoutDate.toDateString() === today.toDateString();
              const isTomorrow = workoutDate.toDateString() === tomorrow.toDateString();
              
              let dateLabel = formatDateWithDay(workoutDate).toUpperCase();
              if (isToday) dateLabel = "TODAY";
              if (isTomorrow) dateLabel = "TOMORROW";
              
              return (
                <div 
                  key={workout.id} 
                  className={`${isToday ? 'bg-accent/10 border border-accent/20' : 'bg-gray-50 border border-gray-100'} rounded-lg p-2`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${isToday ? 'text-accent' : ''}`}>{dateLabel}</span>
                    <span className="text-xs text-secondary">{workout.time}</span>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{workout.name}</h4>
                  <div className="flex items-center text-xs text-secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Est. {workout.duration}
                  </div>
                </div>
              );
            })
          )}
          
          {upcomingWorkouts?.length === 0 && (
            <div className="text-center py-3 text-sm text-secondary">
              No upcoming workouts scheduled
            </div>
          )}
          
          <div className="mt-2 text-center">
            <Link href="/workouts/schedule" className="text-accent text-sm font-medium">
              <CalendarDays className="h-4 w-4 inline mr-1" />
              Schedule Workout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
