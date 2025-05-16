
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
          content: "You are a data-driven fitness analyst and coach. Focus on providing precise, actionable insights based on workout metrics and progression patterns."
        },
        {
          role: "user", 
          content: `Analyze this workout data and provide strategic recommendations:

\`\`\`json
${JSON.stringify(workoutData, null, 2)}
\`\`\`

Structure your response with EXACTLY these 5 sections in this order, using the exact headings shown:

## Performance Summary
Brief overview of current fitness level, key metrics, and trends

## Workout Pattern Analysis
Analysis of workout frequency, consistency, and exercise selection

## Volume & Intensity
Insights on training volume progression and intensity levels

## Top 3 Strengths
The 3 most positive aspects of the user's workout routine

## Top 5 Areas for Optimization
The 5 most important areas for improvement

## Action Plan
3-5 specific, measurable action steps to improve results

Use markdown formatting with:
- Bullet points for lists
- **Bold text** for emphasis on key metrics and important points
- Keep the entire analysis under 400 words total`
        }
      ],
      temperature: 0.4,
      top_p: 0.85,
      max_tokens: 1200,
      stream: false
    });
    
    // Get the AI-generated analysis
    let analysisContent = completion.choices[0]?.message?.content || generateLocalAnalysis(workoutData);
    
    // Skip to the first ## heading (which should be the Performance Summary section)
    // This effectively removes any thinking process content that appears before the actual analysis
    const firstHeadingIndex = analysisContent.indexOf('## Performance Summary');
    if (firstHeadingIndex !== -1) {
      analysisContent = analysisContent.substring(firstHeadingIndex);
    }
    
    // Remove any thinking process tags and content
    analysisContent = analysisContent.replace(/<think>[\s\S]*?<\/think>/g, '');
    analysisContent = analysisContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    analysisContent = analysisContent.replace(/```thinking[\s\S]*?```/g, '');
    analysisContent = analysisContent.replace(/```think[\s\S]*?```/g, '');
    
    // Clean up any other thinking indicators
    analysisContent = analysisContent.replace(/^think:/gim, '');
    analysisContent = analysisContent.replace(/^thinking:/gim, '');
    analysisContent = analysisContent.replace(/^thought process:/gim, '');
    
    // Trim any extra whitespace that might be left after removing content
    analysisContent = analysisContent.trim();
    
    // Return the cleaned analysis
    return analysisContent;
  } catch (error) {
    console.error('Error analyzing workouts:', error);
    // Return the locally generated analysis as fallback
    return generateLocalAnalysis(workoutData);
  }
}
