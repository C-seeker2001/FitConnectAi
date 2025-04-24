import { useState } from "react";
import { formatTimeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import CommentForm from "./CommentForm";

interface CommentItemProps {
  comment: any;
  postId: number;
}

export default function CommentItem({ comment, postId }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const canDelete = user?.id === comment.user.id;

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/posts/${postId}/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not delete comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteComment = () => {
    deleteCommentMutation.mutate();
  };

  const toggleReplyForm = () => {
    if (!user) return;
    setShowReplyForm(!showReplyForm);
  };

  return (
    <div className="flex mb-3">
      <Avatar className="h-8 w-8 mr-2 mt-1">
        <AvatarImage src={comment.user.avatar} alt={comment.user.username} />
        <AvatarFallback>{comment.user.username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="bg-white rounded-lg px-3 py-2 flex-grow shadow-sm">
        <div className="flex justify-between items-start">
          <span className="font-medium text-sm">{comment.user.username}</span>
          <div className="flex items-center">
            <span className="text-xs text-secondary mr-1">{formatTimeAgo(new Date(comment.createdAt))}</span>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3 text-secondary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canDelete && (
                    <DropdownMenuItem onClick={handleDeleteComment}>
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={toggleReplyForm}>
                    Reply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
        
        {showReplyForm && (
          <div className="mt-2">
            <CommentForm 
              postId={postId} 
              parentId={comment.id} 
              onSuccess={() => setShowReplyForm(false)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
