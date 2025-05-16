import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader, Share2, Info, Terminal, Activity, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple function to convert markdown to HTML for display
function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Convert headings: ## Heading -> <h2>Heading</h2>
  let html = markdown.replace(/## (.*$)/gim, '<h2 class="text-lg font-semibold mt-3 mb-2">$1</h2>');
  html = html.replace(/### (.*$)/gim, '<h3 class="text-base font-medium mt-2 mb-1">$1</h3>');
  
  // Convert bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Convert bullet points: - item -> <li>item</li>
  html = html.replace(/- (.*$)/gim, '<li class="ml-4">$1</li>');
  
  // Convert numbered lists: 1. item -> <li>item</li>
  html = html.replace(/\d+\. (.*$)/gim, '<li class="ml-4">$1</li>');
  
  // Convert paragraphs: blank line -> </p><p>
  html = html.replace(/\n\s*\n/gim, '</p><p class="my-2">');
  
  // Wrap in paragraphs
  html = '<p class="my-2">' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/gim, '');
  
  return html;
}

export default function Progress() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, navigate] = useLocation();

  const { data: workoutMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/metrics/workout'],
    enabled: !!user,
  });

  const { data: exerciseMetrics, isLoading: exerciseLoading } = useQuery({
    queryKey: ['/api/metrics/exercises'],
    enabled: !!user,
  });
  
  const { data: workoutAnalysis } = useQuery({
    queryKey: ['/api/analysis/workouts'],
    enabled: !!workoutMetrics,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Progress</h1>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI Coach</CardTitle>
          <CardDescription>Understand and optimize your fitness journey</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-gray-500 mr-2" />
                <div>
                  <div className="font-medium">AI Progress Analysis</div>
                  <div className="text-sm text-muted-foreground">Reviewing your sessions and predicting future progress</div>
                </div>
              </div>
              {workoutMetrics ? (
                <div className="text-sm prose prose-sm max-w-none">
                  {workoutAnalysis?.analysis ? (
                    <div className="markdown whitespace-pre-wrap">{workoutAnalysis.analysis}</div>
                  ) : (
                    'No analysis available yet.'
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Start logging workouts to get AI-powered insights
                </div>
              )}
            </div>
          </CardContent>

      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workouts</CardDescription>
            {metricsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <CardTitle className="text-3xl font-mono">
                {workoutMetrics?.totalWorkouts || 0}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Average</CardDescription>
            {metricsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <CardTitle className="text-3xl font-mono">
                {workoutMetrics?.monthlyAverage || 0}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Workout Streak</CardDescription>
            {metricsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <CardTitle className="text-3xl font-mono">
                {workoutMetrics?.currentStreak || 0}
                <span className="text-sm text-secondary ml-1">days</span>
              </CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full mb-6">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="body">Body Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Workout Frequency</CardTitle>
              <CardDescription>Number of workouts over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workoutMetrics?.frequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar name="Workouts" dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workout Volume</CardTitle>
              <CardDescription>Total weight lifted over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={workoutMetrics?.volume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="volume" stroke="hsl(var(--accent))" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exerciseLoading ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[200px] w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              exerciseMetrics?.map((exercise: any) => (
                <Card key={exercise.id}>
                  <CardHeader>
                    <CardTitle>{exercise.name}</CardTitle>
                    <CardDescription>1RM Progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={exercise.progress}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" stroke="hsl(var(--accent))" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-xs text-secondary">Current 1RM</div>
                        <div className="font-mono font-medium">{exercise.currentMax} {exercise.unit}</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary">Progress</div>
                        <div className={`font-mono font-medium flex items-center ${exercise.change > 0 ? 'text-success' : exercise.change < 0 ? 'text-destructive' : ''}`}>
                          {exercise.change > 0 ? '+' : ''}{exercise.change} {exercise.unit}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="body">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Body Measurements</CardTitle>
                <CardDescription>Track your body stats over time</CardDescription>
              </div>
              <Button variant="outline" size="sm">Add Measurement</Button>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No body measurements yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start tracking your weight, body fat percentage, and other measurements to see progress over time.
              </p>
              <Button>Add First Measurement</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}