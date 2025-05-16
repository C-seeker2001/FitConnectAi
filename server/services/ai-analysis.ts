
import { workouts } from "@shared/schema";

export async function analyzeWorkoutProgress(workouts: typeof workouts.$inferSelect[]) {
  const API_KEY = process.env.NVIDIA_NIM_KEY;
  
  // Format workout data for analysis
  const workoutData = workouts.map(w => ({
    name: w.name,
    date: w.createdAt,
    exercises: w.exerciseCount,
    volume: w.volume
  }));

  try {
    const response = await fetch('https://api.nvcf.nvidia.com/v2/endpoint', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Analyze this workout history and provide insights: ${JSON.stringify(workoutData)}`
        }]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing workouts:', error);
    return 'Unable to analyze workouts at this time.';
  }
}
