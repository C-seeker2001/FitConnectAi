import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image, Dumbbell } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function CreatePostForm() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's workouts for the dropdown
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts'],
    enabled: isDialogOpen, // Only fetch when dialog is open
  });

  // Post creation mutation
  const createPostMutation = useMutation({
    mutationFn: async () => {
      const postData: any = {
        content,
      };

      if (selectedWorkoutId && selectedWorkoutId !== "none") {
        postData.workoutId = parseInt(selectedWorkoutId);
      }
      
      if (imageUrl.trim()) {
        postData.image = imageUrl.trim();
      }

      return apiRequest('POST', '/api/posts', postData);
    },
    onSuccess: () => {
      // Reset form
      setContent("");
      setSelectedWorkoutId(null);
      setImageUrl("");
      setIsDialogOpen(false);
      
      // Refresh feed
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      toast({
        title: "Post created",
        description: "Your post has been shared successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (content.trim()) {
      createPostMutation.mutate();
    } else {
      toast({
        title: "Empty post",
        description: "Please add some content to your post.",
        variant: "destructive",
      });
    }
  };

  // Quick post component for the homepage
  const QuickPostBox = () => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar} alt={user?.username} />
            <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div 
            onClick={() => setIsDialogOpen(true)}
            className="bg-muted flex-1 rounded-full px-4 py-2.5 text-secondary cursor-pointer hover:bg-muted/70 transition-colors"
          >
            What's on your mind?
          </div>
        </div>
        <div className="flex mt-4 pt-3 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-center"
            onClick={() => setIsDialogOpen(true)}
          >
            <Dumbbell className="h-5 w-5 mr-2 text-accent" />
            Share Workout
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-center"
            onClick={() => setIsDialogOpen(true)}
          >
            <Image className="h-5 w-5 mr-2 text-accent" />
            Add Photo
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <QuickPostBox />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create a post</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-start gap-3 my-2">
            <Avatar className="h-10 w-10 mt-1">
              <AvatarImage src={user?.avatar} alt={user?.username} />
              <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">{user?.username}</div>
            </div>
          </div>
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What would you like to share?"
            className="min-h-[120px] resize-none"
          />
          
          <div className="space-y-4 mt-2">
            {/* Workout selection */}
            <div>
              <Label htmlFor="workout">Attach a workout</Label>
              <Select
                value={selectedWorkoutId || ""}
                onValueChange={setSelectedWorkoutId}
              >
                <SelectTrigger id="workout">
                  <SelectValue placeholder="Select a workout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {workouts && workouts.map((workout: any) => (
                    <SelectItem key={workout.id} value={workout.id.toString()}>
                      {workout.name} ({new Date(workout.createdAt).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Image URL */}
            <div>
              <Label htmlFor="image">Image URL (optional)</Label>
              <Textarea
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter image URL"
                className="resize-none h-10"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim() || createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}