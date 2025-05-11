import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Loader,
  UserPlus,
  UserCheck,
  Settings,
  Calendar,
  Medal,
  Dumbbell
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatTimeAgo } from "@/lib/utils";
import PostItem from "@/components/social/PostItem";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import UserStatsDisplay from "@/components/shared/UserStatsDisplay";

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
  useEffect(() => {
    // If URL has a userId parameter, use that; otherwise use the logged-in user's ID
    if (location.includes('/profile/')) {
      const pathParts = location.split('/profile/');
      if (pathParts.length > 1 && pathParts[1]) {
        const id = parseInt(pathParts[1]);
        if (!isNaN(id)) {
          setUserId(id);
          return;
        }
      }
    }
    
    // Default to current user's profile if no valid ID in URL
    if (user) {
      setUserId(user.id);
      // If we're at /profile with no ID, redirect to /profile/[userId]
      if (location === '/profile' && user.id) {
        navigate(`/profile/${user.id}`);
      }
    }
  }, [location, user, navigate]);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<any>({
    queryKey: ['/api/users', userId],
    enabled: !!userId
  });

  const { data: activityData, isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ['/api/users', userId, 'activity'],
    enabled: !!userId,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<any[]>({
    queryKey: ['/api/users', userId, 'posts'],
    enabled: !!userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      return apiRequest('POST', `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/stats'] });
      toast({
        title: "User followed",
        description: "You are now following this user",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not follow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      return apiRequest('DELETE', `/api/users/${userId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/stats'] });
      toast({
        title: "User unfollowed",
        description: "You are no longer following this user",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not unfollow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFollowToggle = () => {
    if (profile?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
      return;
    }
    
    // If URL has no userId parameter and user is logged in, redirect to their profile
    if (user && location === '/profile') {
      navigate(`/profile/${user.id}`);
    }
  }, [user, authLoading, navigate, location]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !profile || !profile.username) {
    // If user is logged in but profile couldn't be loaded, show error message
    if (user && (profileError || !profile || !profile.username)) {
      return (
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
          <p className="text-secondary mb-4">We couldn't load this profile information.</p>
          <Button onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      );
    }
    return null;
  }
  
  // Ensure all required profile data is available
  if (!profile.username || !profile.id) {
    console.error("Profile data incomplete:", profile);
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
        <p className="text-secondary mb-4">Profile data is incomplete. Please try again later.</p>
        <Button onClick={() => window.location.href = "/"}>
          Return to Home
        </Button>
      </div>
    );
  }
  
  const isCurrentUser = user.id === userId;

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar} alt={profile.username} />
              <AvatarFallback className="text-2xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold mb-1">{profile.username}</h1>
              <p className="text-secondary mb-4">{profile.bio || `@${profile.username.toLowerCase()}`}</p>
              
              <UserStatsDisplay 
                workoutCount={profile.workoutCount || 0}
                followingCount={profile.followingCount || 0}
                followerCount={profile.followerCount || 0}
                className="mb-4 text-lg"
              />
              
              {isCurrentUser ? (
                <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  variant={profile.isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="hidden md:block">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Calendar className="h-5 w-5 text-secondary mr-2" />
                  <div className="text-sm">
                    <span className="font-medium">Joined</span>
                    <span className="text-secondary ml-2">{formatTimeAgo(new Date(profile.createdAt))}</span>
                  </div>
                </div>
                <div className="flex items-center mb-3">
                  <Medal className="h-5 w-5 text-secondary mr-2" />
                  <div className="text-sm">
                    <span className="font-medium">Streak</span>
                    <span className="text-secondary ml-2">{profile.currentStreak} days</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Dumbbell className="h-5 w-5 text-secondary mr-2" />
                  <div className="text-sm">
                    <span className="font-medium">Weekly Goal</span>
                    <div className="flex items-center mt-1">
                      <div className="relative h-6 w-6 mr-2">
                        <ProgressRing
                          progress={Math.min(100, (profile.weeklyWorkouts / profile.weeklyGoal) * 100)}
                          size={24}
                          strokeWidth={3}
                        />
                      </div>
                      <span className="font-mono">{profile.weeklyWorkouts}/{profile.weeklyGoal}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <div className="space-y-6">
            {postsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center mb-4">
                    <Skeleton className="h-10 w-10 rounded-full mr-3" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-40 w-full mt-4" />
                </Card>
              ))
            ) : posts && posts.length > 0 ? (
              posts.map((post: any) => <PostItem key={post.id} post={post} />)
            ) : (
              <Card>
                <CardContent className="pt-6 pb-6 text-center">
                  <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-secondary">
                    {isCurrentUser 
                      ? "Share your workouts to see them here"
                      : `${profile.username} hasn't shared any posts yet`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <CardTitle>Workout History</CardTitle>
              <CardDescription>
                {isCurrentUser 
                  ? "Your recent workouts"
                  : `${profile.username}'s recent workouts`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="p-4 border-b">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : profile.workouts?.length > 0 ? (
                <div className="space-y-4">
                  {profile.workouts.map((workout: any) => (
                    <div key={workout.id} className="p-4 border-b last:border-0">
                      <h3 className="font-medium">{workout.name}</h3>
                      <p className="text-sm text-secondary mb-2">
                        {new Date(workout.createdAt).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-secondary">Duration</div>
                          <div className="font-mono font-medium">{workout.duration}</div>
                        </div>
                        <div>
                          <div className="text-secondary">Volume</div>
                          <div className="font-mono font-medium">{workout.volume}{workout.useMetric ? ' kg' : ' lbs'}</div>
                        </div>
                        <div>
                          <div className="text-secondary">Exercises</div>
                          <div className="font-mono font-medium">{workout.exerciseCount}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-secondary">
                    {isCurrentUser
                      ? "You haven't logged any workouts yet"
                      : `${profile.username} hasn't logged any workouts yet`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Heatmap</CardTitle>
              <CardDescription>Workout frequency over time</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      {showEditForm && profile && profile.username && (
        <ProfileEditForm 
          open={true} 
          onClose={() => setShowEditForm(false)} 
          profile={profile}
        />
      )}
    </div>
  );
}
