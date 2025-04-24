import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dumbbell,
  Terminal,
  Activity,
  Search,
  UserPlus,
  UserCheck,
  Loader,
  Star
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Discover() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['/api/programs'],
    enabled: !!user,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users', searchTerm],
    enabled: !!user && searchTerm.length > 0,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
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
    mutationFn: async (userId: number) => {
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

  const handleFollowToggle = (userId: number, isFollowing: boolean) => {
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  };

  const handleViewProgram = (programId: number) => {
    navigate(`/program/${programId}`);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Discover</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
          <Input 
            placeholder="Search users..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-6">
          {programsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-8 w-8 rounded-full mb-2" />
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-2" />
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {programs?.map((program: any) => (
                <Card key={program.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                        {program.type === 'strength' && <Dumbbell className="text-accent h-4 w-4" />}
                        {program.type === 'cardio' && <Terminal className="text-accent h-4 w-4" />}
                        {program.type === 'mixed' && <Activity className="text-accent h-4 w-4" />}
                      </div>
                      <div>
                        <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {program.type.charAt(0).toUpperCase() + program.type.slice(1)}
                        </span>
                      </div>
                    </div>
                    <CardTitle>{program.name}</CardTitle>
                    <CardDescription>by {program.author}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-secondary mb-3">{program.description}</p>
                    <div className="flex items-center">
                      <div className="flex items-center text-yellow-400">
                        {Array(5).fill(null).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < program.rating ? 'fill-current' : 'stroke-current fill-none'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-secondary ml-1">({program.ratingCount})</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleViewProgram(program.id)}
                    >
                      View Program
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          {searchTerm.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Search className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-2">Find People to Follow</h3>
                <p className="text-secondary mb-4">
                  Search for usernames to discover new people to follow
                </p>
              </CardContent>
            </Card>
          ) : usersLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full mr-3" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : users?.length > 0 ? (
            <div className="space-y-4">
              {users.map((user: any) => (
                <Card key={user.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-secondary">
                            {user.workoutCount} workouts • {user.followersCount} followers
                          </div>
                        </div>
                      </div>
                      <Button
                        variant={user.isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollowToggle(user.id, user.isFollowing)}
                        disabled={followMutation.isPending || unfollowMutation.isPending}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-secondary mb-4">
                  No users found for "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
