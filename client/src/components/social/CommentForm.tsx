import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface CommentFormProps {
  postId: number;
  parentId?: number;
  onSuccess?: () => void;
}

export default function CommentForm({ postId, parentId, onSuccess }: CommentFormProps) {
  const [comment, setComment] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/posts/${postId}/comments`, {
        content: comment,
        parentId,
      });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      if (onSuccess) onSuccess();
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && !commentMutation.isPending) {
      commentMutation.mutate();
    }
  };

  if (!user) {
    return (
      <div className="text-center py-2 text-sm text-secondary">
        Please log in to comment
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <Avatar className="h-8 w-8 mr-2">
        <AvatarImage src={user.avatar} alt={user.username} />
        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-grow relative">
        <Input
          type="text"
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-full py-2 pr-10"
        />
        <Button 
          type="submit" 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-accent h-6 w-6"
          disabled={comment.trim() === "" || commentMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
