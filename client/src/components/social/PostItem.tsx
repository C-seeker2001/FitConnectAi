import { useState } from "react";
import { formatTimeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MessageSquare, Share, MoreHorizontal, Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";
import { ExerciseTag } from "@/components/ui/exercise-tag";

interface PostProps {
  post: any;
}

export default function PostItem({ post }: PostProps) {
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (post.liked) {
        return apiRequest('DELETE', `/api/posts/${post.id}/like`);
      } else {
        return apiRequest('POST', `/api/posts/${post.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not like/unlike post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not delete post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleLike = () => {
    if (!user) return;
    likeMutation.mutate();
  };

  const handleDeletePost = () => {
    deleteMutation.mutate();
  };

  const canDelete = user?.id === post.user.id;
  const toggleComments = () => setShowComments(!showComments);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Post Header */}
      <div className="p-4">
        <div className="flex items-start">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={post.user.avatar} alt={post.user.username} />
            <AvatarFallback>{post.user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{post.user.username}</h3>
                <p className="text-sm text-secondary">{formatTimeAgo(new Date(post.createdAt))}</p>
              </div>
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5 text-secondary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canDelete && (
                      <>
                        <DropdownMenuItem onClick={handleDeletePost}>
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem>Report</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="mt-2">{post.content}</p>
          </div>
        </div>
      </div>

      {/* Workout Summary Card (if present) */}
      {post.workout && (
        <div className="px-4 pb-2">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11"></path>
                <path d="M20 15a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"></path>
                <path d="M4 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"></path>
                <path d="M18 15h-2"></path>
                <path d="M8 15H6"></path>
                <path d="M8 9v6"></path>
                <path d="M16 9v6"></path>
              </svg>
              <h4 className="font-medium">{post.workout.name}</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-secondary">Duration</div>
                <div className="font-mono font-medium">{post.workout.duration}</div>
              </div>
              <div>
                <div className="text-secondary">Volume</div>
                <div className="font-mono font-medium">{post.workout.volume}{post.workout.useMetric ? ' kg' : ' lbs'}</div>
              </div>
              <div>
                <div className="text-secondary">Exercises</div>
                <div className="font-mono font-medium">{post.workout.exerciseCount}</div>
              </div>
            </div>
            
            {post.workout.exercises && post.workout.exercises.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="text-xs font-medium mb-1">Exercises Completed</div>
                <div className="flex flex-wrap gap-1">
                  {post.workout.exercises.map((exercise: string, index: number) => (
                    <ExerciseTag key={index} name={exercise} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Image (if present) */}
      {post.image && (
        <div className="relative aspect-video">
          <img src={post.image} alt="Post image" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center" 
            onClick={handleToggleLike}
          >
            <Heart 
              className={`h-5 w-5 mr-1 ${post.liked ? 'fill-accent text-accent' : 'text-secondary'}`} 
            />
            <span className="text-sm font-medium">{post.likeCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center" 
            onClick={toggleComments}
          >
            <MessageSquare className="h-5 w-5 mr-1 text-secondary" />
            <span className="text-sm font-medium">{post.commentCount}</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon">
          <Share className="h-5 w-5 text-secondary" />
        </Button>
      </div>

      {/* Comments Section */}
      {(showComments || post.commentCount === 0) && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          {/* Comment Form */}
          <CommentForm postId={post.id} />
          
          {/* Comments */}
          {post.commentCount > 0 && (
            <div className="mt-3 space-y-3">
              {post.comments?.map((comment: any) => (
                <CommentItem key={comment.id} comment={comment} postId={post.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
