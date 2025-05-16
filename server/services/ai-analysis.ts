
import { workouts } from "@shared/schema";
import OpenAI from 'openai';

// Generate a fallback analysis based on real workout data
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
  if (!workouts || workouts.length === 0) {
    return 'No workout data available to analyze. Complete some workouts to get AI insights.';
  }
  
  // Format workout data for analysis
  const workoutData = workouts.map(w => ({
    name: w.name || 'Unnamed Workout',
    date: w.createdAt ? new Date(w.createdAt).toISOString().split('T')[0] : 'unknown date',
    exercises: w.exerciseCount || 0,
    volume: w.volume || 0
  }));

  try {
    // Use the NVIDIA NIM API integration as recommended
    const API_KEY = process.env.NVIDIA_NIM_KEY;
    
    if (!API_KEY) {
      console.error('NVIDIA_NIM_KEY is not set');
      return generateLocalAnalysis(workoutData);
    }
    
    const openai = new OpenAI({
      apiKey: API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-r1",
      messages: [
        {
          role: "system", 
          content: "You are an expert fitness coach and personal trainer who specializes in personalized workout analysis. You provide clear, concise, and actionable advice."
        },
        {
          role: "user", 
          content: `Provide a personalized workout analysis based on this fitness data:

\`\`\`json
${JSON.stringify(workoutData, null, 2)}
\`\`\`

In your analysis, include:

1. A brief summary of overall progress (2-3 sentences)
2. Insights on workout frequency and consistency 
3. Analysis of volume progression over time
4. Specific strengths identified in their workout routine
5. Areas that need improvement
6. 3-5 actionable recommendations to maximize results

Your response should be encouraging, highlight positives, but also provide honest feedback for improvement.

Format your response in clean Markdown with:
- Clear section headers (##)
- Bullet points for lists
- Bold text for key metrics
- No preamble or thinking out loud - just give the analysis directly
- Concise language - limit to 300-400 words total`
        }
      ],
      temperature: 0.4,
      top_p: 0.85,
      max_tokens: 1200,
      stream: false
    });
    
    // Return the AI-generated analysis
    return completion.choices[0]?.message?.content || generateLocalAnalysis(workoutData);
  } catch (error) {
    console.error('Error analyzing workouts:', error);
    // Return the locally generated analysis as fallback
    return generateLocalAnalysis(workoutData);
  }
}
