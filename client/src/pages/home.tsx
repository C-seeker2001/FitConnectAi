import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import QuickStart from "@/components/workout/QuickStart";
import PostItem from "@/components/social/PostItem";
import { useLocation, Link } from "wouter";
import { Loader } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, navigate] = useLocation();

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts'],
    enabled: !!user,
  });

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
      {/* Quick Start Section */}
      <QuickStart />

      {/* Social Feed */}
      <div className="space-y-6">
        {postsLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4">
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
              <div className="flex justify-between mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))
        ) : posts?.length > 0 ? (
          posts.map((post: any) => <PostItem key={post.id} post={post} />)
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Your feed is empty</h3>
            <p className="text-secondary mb-4">
              Follow other users or start posting your workouts to see content here.
            </p>
            <div className="flex justify-center">
              <Link to="/discover" className="text-accent font-medium">
                Discover users to follow
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
