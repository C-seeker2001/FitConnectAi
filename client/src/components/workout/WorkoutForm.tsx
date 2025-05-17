import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, PlusCircle, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import ExerciseItem from "./ExerciseItem";

// Exercise templates for quick start
const EXERCISE_TEMPLATES = {
  "Upper Body": [
    { name: "Bench Press", sets: [{ weight: 60, reps: 10 }] },
    { name: "Shoulder Press", sets: [{ weight: 40, reps: 10 }] },
    { name: "Pull-Ups", sets: [{ weight: 0, reps: 8 }] },
    { name: "Barbell Row", sets: [{ weight: 50, reps: 10 }] },
  ],
  "Lower Body": [
    { name: "Squats", sets: [{ weight: 80, reps: 10 }] },
    { name: "Deadlift", sets: [{ weight: 100, reps: 8 }] },
    { name: "Leg Press", sets: [{ weight: 120, reps: 10 }] },
    { name: "Calf Raises", sets: [{ weight: 60, reps: 15 }] },
  ],
  "Cardio": [
    { name: "Treadmill", sets: [{ duration: 20, distance: 3 }] },
    { name: "Cycling", sets: [{ duration: 15, distance: 5 }] },
  ],
  "Custom": [],
};

// Form validation schema
const workoutFormSchema = z.object({
  name: z.string().min(3, { message: "Workout name is required" }),
  exercises: z.array(
    z.object({
      name: z.string().min(1, { message: "Exercise name is required" }),
      sets: z.array(
        z.object({
          weight: z.number().optional(),
          reps: z.number().optional(),
          duration: z.number().optional(),
          distance: z.number().optional(),
        })
      ).min(1, { message: "At least one set is required" }),
    })
  ).min(1, { message: "At least one exercise is required" }),
  shareToFeed: z.boolean().default(true),
});

type WorkoutFormValues = z.infer<typeof workoutFormSchema>;

interface WorkoutFormProps {
  open: boolean;
  onClose: () => void;
  initialTemplate?: string | any | null;
}

export default function WorkoutForm({ open, onClose, initialTemplate }: WorkoutFormProps) {
  const [useMetric, setUseMetric] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      name: "",
      exercises: [{ name: "", sets: [{ weight: 0, reps: 0 }] }],
      shareToFeed: true,
    },
  });

  // Set template exercises when a template is selected
  useEffect(() => {
    if (initialTemplate && open) {
      if (typeof initialTemplate === 'string') {
        // Handle string type (predefined template name)
        const template = EXERCISE_TEMPLATES[initialTemplate as keyof typeof EXERCISE_TEMPLATES] || [];
        form.reset({
          name: initialTemplate === "Custom" ? "" : `${initialTemplate} Workout`,
          exercises: template.length > 0 ? template : [{ name: "", sets: [{ weight: 0, reps: 0 }] }],
          shareToFeed: true,
        });
      } else {
        // Handle object type (template from API)
        const exerciseArray = initialTemplate.exercises.map((exercise: string) => {
          return {
            name: exercise,
            sets: [{ weight: 40, reps: 10 }] // Default values
          };
        });
        
        form.reset({
          name: initialTemplate.name,
          exercises: exerciseArray.length > 0 ? exerciseArray : [{ name: "", sets: [{ weight: 0, reps: 0 }] }],
          shareToFeed: true,
        });
      }
    }
  }, [initialTemplate, open, form]);

  const addExercise = () => {
    const currentExercises = form.getValues().exercises;
    form.setValue("exercises", [
      ...currentExercises,
      { name: "", sets: [{ weight: 0, reps: 0 }] },
    ]);
  };

  const removeExercise = (index: number) => {
    const currentExercises = form.getValues().exercises;
    if (currentExercises.length > 1) {
      form.setValue(
        "exercises",
        currentExercises.filter((_, i) => i !== index)
      );
    }
  };

  const workoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormValues) => {
      const response = await apiRequest('POST', '/api/workouts', {
        ...data,
        useMetric,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout started",
        description: "Your workout has been started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start workout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkoutFormValues) => {
    workoutMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start Workout</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Upper Body Strength" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Exercises</FormLabel>
              {form.watch("exercises").map((exercise, exerciseIndex) => (
                <ExerciseItem
                  key={exerciseIndex}
                  form={form}
                  exerciseIndex={exerciseIndex}
                  onRemove={() => removeExercise(exerciseIndex)}
                  useMetric={useMetric}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addExercise}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="shareToFeed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Share to feed</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <span className="text-sm">Units:</span>
                <Switch
                  checked={useMetric}
                  onCheckedChange={setUseMetric}
                  id="unit-toggle"
                />
                <span className={`text-sm font-medium ${useMetric ? "text-accent" : ""}`}>
                  {useMetric ? "kg" : "lbs"}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={workoutMutation.isPending}>
                {workoutMutation.isPending ? "Starting..." : "Start Workout"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
