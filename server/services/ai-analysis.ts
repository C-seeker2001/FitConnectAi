
import { workouts } from "@shared/schema";

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
    // NVIDIA NIM API endpoint for their AI model (likely using NVIDIA's Claude model)
    const response = await fetch('https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/7c4180dd-d47d-4e70-9381-8a31550e0c90', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          prompt: `You are a professional fitness coach analyzing workout data. Provide detailed insights, progress analysis, and recommendations based on the following workout history. Be encouraging but also suggest specific improvements:

Workout History:
${JSON.stringify(workoutData, null, 2)}

Analyze:
1. Workout frequency and consistency
2. Volume progression over time
3. Exercise variety and balance
4. Specific strengths and areas for improvement
5. Recommendations for future workouts to maximize results
`,
          temperature: 0.7,
          top_p: 0.7,
          max_tokens: 500
        }
      })
    });

    if (!response.ok) {
      console.error('NVIDIA NIM API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return 'Unable to analyze workouts. AI service unavailable.';
    }

    const data = await response.json();
    
    // Log the full response for debugging
    console.log('NVIDIA NIM API response:', JSON.stringify(data, null, 2));
    
    // Handle different response formats
    if (data.output && typeof data.output === 'string') {
      return data.output;
    } else if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected response format:', data);
      return 'Unable to process AI analysis response.';
    }
  } catch (error) {
    console.error('Error analyzing workouts:', error);
    return 'Unable to analyze workouts at this time. Please try again later.';
  }
}
