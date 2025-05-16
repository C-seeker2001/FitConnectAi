
import { workouts } from "@shared/schema";

// Generate a mock analysis based on real workout data
// This is a fallback when the API is unavailable
function generateLocalAnalysis(workoutData: any[]) {
  if (workoutData.length === 0) {
    return "No workout data available to analyze. Complete some workouts to get AI insights.";
  }

  // Sort workouts by date
  const sortedWorkouts = [...workoutData].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Calculate some basic stats
  const totalWorkouts = workoutData.length;
  const totalVolume = workoutData.reduce((sum, w) => sum + w.volume, 0);
  const avgVolume = Math.round(totalVolume / totalWorkouts);
  
  // Get the most recent workout
  const latestWorkout = sortedWorkouts[sortedWorkouts.length - 1];
  
  // Generate analysis
  return `
## Workout Analysis

Based on your ${totalWorkouts} recorded workouts, here's an analysis of your fitness journey:

### Consistency & Frequency
You've completed ${totalWorkouts} workouts in your current program. This shows dedication to your fitness goals. Try to maintain a consistent schedule of 3-4 workouts per week for optimal results.

### Volume Progression
Your average workout volume is ${avgVolume} units. Your latest workout "${latestWorkout.name}" had a volume of ${latestWorkout.volume} units, which ${latestWorkout.volume > avgVolume ? 'is above your average - great work!' : 'is below your average - consider adding more sets or intensity next time.'}

### Recommendations
1. Focus on consistent weekly workout frequency
2. Consider tracking your rest periods to ensure optimal recovery
3. Gradually increase your workout volume over time
4. Include more variety in your exercises to prevent plateaus
5. Make sure to balance pushing and pulling movements for overall development

Keep up the great work! Consistency is key to reaching your fitness goals.
`;
}

export async function analyzeWorkoutProgress(workouts: typeof workouts.$inferSelect[]) {
  const API_KEY = process.env.NVIDIA_NIM_KEY;
  
  if (!API_KEY) {
    console.error('NVIDIA_NIM_KEY is not set');
    return 'AI analysis not available. API key not configured.';
  }
  
  if (!workouts || workouts.length === 0) {
    return 'No workout data available to analyze. Complete some workouts to get AI insights.';
  }
  
  // Format workout data for analysis
  const workoutData = workouts.map(w => ({
    name: w.name,
    date: w.createdAt ? new Date(w.createdAt).toISOString().split('T')[0] : 'unknown date',
    exercises: w.exerciseCount || 0,
    volume: w.volume || 0
  }));

  try {
    // First try the NVIDIA NIM Claude model
    const response = await fetch('https://api.nvcf.nvidia.com/v2/nvcf/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "anthropic.claude-3-opus-20240229-v1:0",
        messages: [
          {
            role: "user",
            content: `You are a professional fitness coach analyzing workout data. Provide detailed insights, progress analysis, and recommendations based on the following workout history. Be encouraging but also suggest specific improvements.

Workout History:
${JSON.stringify(workoutData, null, 2)}

Analyze:
1. Workout frequency and consistency
2. Volume progression over time
3. Exercise variety and balance
4. Specific strengths and areas for improvement
5. Recommendations for future workouts to maximize results

Format your response with Markdown headings and bullet points for easy readability.`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      console.error('NVIDIA NIM API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return generateLocalAnalysis(workoutData);
    }

    const data = await response.json();
    
    // Log the full response for debugging
    console.log('NVIDIA NIM API response:', JSON.stringify(data, null, 2));
    
    // Handle the response format for Claude API
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected response format:', data);
      return generateLocalAnalysis(workoutData);
    }
  } catch (error) {
    console.error('Error analyzing workouts:', error);
    return generateLocalAnalysis(workoutData);
  }
}
