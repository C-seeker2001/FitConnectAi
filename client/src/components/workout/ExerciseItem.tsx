import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ExerciseItemProps {
  form: UseFormReturn<any>;
  exerciseIndex: number;
  onRemove: () => void;
  useMetric: boolean;
}

export default function ExerciseItem({
  form,
  exerciseIndex,
  onRemove,
  useMetric,
}: ExerciseItemProps) {
  const exercise = form.watch(`exercises.${exerciseIndex}`);
  
  const addSet = () => {
    const currentSets = form.getValues(`exercises.${exerciseIndex}.sets`);
    form.setValue(`exercises.${exerciseIndex}.sets`, [
      ...currentSets,
      { weight: 0, reps: 0 },
    ]);
  };

  const removeSet = (setIndex: number) => {
    const currentSets = form.getValues(`exercises.${exerciseIndex}.sets`);
    if (currentSets.length > 1) {
      form.setValue(
        `exercises.${exerciseIndex}.sets`,
        currentSets.filter((_, i) => i !== setIndex)
      );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-3">
      <div className="flex justify-between mb-2">
        <div className="flex-grow mr-2">
          <Input
            placeholder="Exercise name"
            {...form.register(`exercises.${exerciseIndex}.name`)}
          />
          {form.formState.errors.exercises?.[exerciseIndex]?.name && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.exercises[exerciseIndex]?.name?.message}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Set entries */}
      {exercise.sets.map((set: any, setIndex: number) => (
        <div key={setIndex} className="bg-gray-50 rounded-lg p-2 mb-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FormLabel className="block text-xs text-secondary mb-1">Set</FormLabel>
              <div className="flex justify-center items-center h-9 bg-gray-100 rounded text-sm font-mono font-medium">{setIndex + 1}</div>
            </div>
            <div>
              <FormLabel className="block text-xs text-secondary mb-1">
                Weight ({useMetric ? "kg" : "lbs"})
              </FormLabel>
              <Input
                type="number"
                className="text-sm"
                {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.weight`, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div>
              <FormLabel className="block text-xs text-secondary mb-1">Reps</FormLabel>
              <Input
                type="number"
                className="text-sm"
                {...form.register(`exercises.${exerciseIndex}.sets.${setIndex}.reps`, {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>
          {exercise.sets.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-6 w-6 p-0 float-right"
              onClick={() => removeSet(setIndex)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addSet}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Set
      </Button>
    </div>
  );
}
