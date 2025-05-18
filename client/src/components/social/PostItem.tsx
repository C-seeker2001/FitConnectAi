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
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/posts'] });
      
      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['/api/posts']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/posts'], (old: any[]) => {
        return old.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              liked: !post.liked,
              likeCount: post.liked ? p.likeCount - 1 : p.likeCount + 1
            };
          }
          return p;
        });
      });
      
      // Return a context object with the snapshot
      return { previousPosts };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/posts'], context?.previousPosts);
      
      toast({
        title: "Error",
        description: "Could not like/unlike post. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after success or error to ensure server state
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
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
  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) {
      // Invalidate query to refresh comments
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
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
                <h3 className="font-medium text-foreground">{post.user.username}</h3>
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
            <p className="mt-2 text-foreground">{post.content}</p>
          </div>
        </div>
      </div>

      {/* Workout Summary Card (if present) */}
      {post.workout && (
        <div className="px-4 pb-2">
          <div className="bg-muted rounded-lg p-3 border border-border">
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
              <h4 className="font-medium text-foreground">{post.workout.name}</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-secondary">Duration</div>
                <div className="font-mono font-medium text-foreground">{post.workout.duration}</div>
              </div>
              <div>
                <div className="text-secondary">Volume</div>
                <div className="font-mono font-medium text-foreground">{post.workout.volume}{post.workout.useMetric ? ' kg' : ' lbs'}</div>
              </div>
              <div>
                <div className="text-secondary">Exercises</div>
                <div className="font-mono font-medium text-foreground">{post.workout.exerciseCount}</div>
              </div>
            </div>
            
            {post.workout.exercises && post.workout.exercises.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border">
                <div className="text-xs font-medium mb-1 text-foreground">Exercises Completed</div>
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
        <div className="px-4 pb-3">
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30 flex justify-center">
            <img 
              src={post.image} 
              alt="Post image" 
              className="object-contain" 
              style={{ maxHeight: "280px", maxWidth: "100%", width: "auto" }}
            />
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
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
            <span className="text-sm font-medium text-foreground">{post.likeCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center" 
            onClick={toggleComments}
          >
            <MessageSquare className="h-5 w-5 mr-1 text-secondary" />
            <span className="text-sm font-medium text-foreground">{post.commentCount}</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon">
          <Share className="h-5 w-5 text-secondary" />
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 bg-muted border-t border-border">
          {/* Comment Form */}
          <CommentForm postId={post.id} />
          
          {/* Comments */}
          <div className="mt-3 space-y-3">
            {post.comments?.length > 0 ? (
              <>
                {/* Create a function to render comments recursively */}
                {(() => {
                  // Helper function to recursively render comments and their replies
                  const renderCommentWithReplies = (parentComment: any, level: number = 0) => {
                    // Find direct replies to this comment
                    const directReplies = post.comments.filter(
                      (reply: any) => reply.parentId === parentComment.id
                    );
                    
                    return (
                      <div key={parentComment.id}>
                        {/* Render the comment */}
                        <CommentItem comment={parentComment} postId={post.id} />
                        
                        {/* Render replies if any exist */}
                        {directReplies.length > 0 && (
                          <div 
                            className={`ml-8 mt-2 space-y-3 border-l-2 border-border pl-3 ${level > 0 ? 'border-border/70' : ''}`}
                          >
                            {/* Recursively render each reply and its nested replies */}
                            {directReplies.map((reply: any) => renderCommentWithReplies(reply, level + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };
                  
                  // Start with top-level comments (no parentId)
                  const topLevelComments = post.comments.filter((comment: any) => !comment.parentId);
                  
                  // Render each top-level comment and its reply tree
                  return topLevelComments.map((comment: any) => renderCommentWithReplies(comment));
                })()}
              </>
            ) : (
              <div className="text-center text-sm text-secondary">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
