import { db } from "./db";
import { exercises, sets } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function enrichWorkoutData(workoutData: any) {
  // Get the exercises for this workout
  const exercisesList = await db
    .select()
    .from(exercises)
    .where(eq(exercises.workoutId, workoutData.id));
  
  // Calculate total volume
  let totalVolume = 0;
  let allExerciseNames: string[] = [];
  
  for (const exercise of exercisesList) {
    allExerciseNames.push(exercise.name);
    
    const setsList = await db
      .select()
      .from(sets)
      .where(eq(sets.exerciseId, exercise.id));
      
    for (const set of setsList) {
      if (set.weight && set.reps) {
        totalVolume += set.weight * set.reps;
      }
    }
  }
  
  // Format duration as 1h 23m or 45m
  let duration = "";
  if (workoutData.endTime) {
    const durationMs = new Date(workoutData.endTime).getTime() - new Date(workoutData.startTime).getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    if (minutes < 60) {
      duration = `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      duration = `${hours}h ${remainingMinutes}m`;
    }
  } else {
    duration = "In progress";
  }
  
  return {
    ...workoutData,
    duration,
    volume: Math.round(totalVolume),
    exerciseCount: exercisesList.length,
    exercises: allExerciseNames,
  };
}