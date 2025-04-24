import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  Dumbbell,
  Heart,
  Loader,
  BarChart,
  Star,
  Terminal,
  Users
} from "lucide-react";

export default function ProgramDetail() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Extract program ID from the location
  const programId = location.split('/').pop();

  // Fetch program details
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: [`/api/programs/${programId}`],
    enabled: !!user && !!programId,
    // If there is no specific endpoint for a single program yet, handle manually:
    select: (data) => {
      // In case API returns array of all programs
      if (Array.isArray(data)) {
        return data.find((p) => p.id === Number(programId));
      }
      return data;
    }
  });

  const handleStartProgram = () => {
    toast({
      title: "Program Started",
      description: `You've successfully started "${program?.name}"`,
    });
  };

  const handleSaveProgram = () => {
    toast({
      title: "Program Saved",
      description: `"${program?.name}" has been saved to your programs`,
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || programLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">Program Not Found</h2>
        <p className="text-secondary mb-4">The program you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/discover')}>Browse Programs</Button>
      </div>
    );
  }

  // Sample program details - this would typically come from the API
  const programDetails = {
    weeks: 12,
    workoutsPerWeek: 4,
    duration: "45-60 min",
    equipment: ["Barbell", "Dumbbells", "Bench", "Squat Rack"],
    level: "Intermediate",
    goals: ["Strength", "Muscle Building"],
    description: program.description,
    schedule: [
      {
        day: "Monday",
        name: "Upper Body A",
        exercises: ["Bench Press", "Barbell Rows", "Shoulder Press", "Pull-ups"]
      },
      {
        day: "Tuesday",
        name: "Lower Body A",
        exercises: ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raises"]
      },
      {
        day: "Wednesday",
        name: "Rest Day",
        exercises: []
      },
      {
        day: "Thursday",
        name: "Upper Body B",
        exercises: ["Incline Press", "Pull-downs", "Lateral Raises", "Face Pulls"]
      },
      {
        day: "Friday",
        name: "Lower Body B",
        exercises: ["Deadlift", "Front Squat", "Lunges", "Leg Curls"]
      },
      {
        day: "Saturday/Sunday",
        name: "Rest Days",
        exercises: []
      }
    ],
    testimonials: [
      {
        name: "John D.",
        text: "This program was exactly what I needed to break through my plateau. I've gained 15 lbs of muscle in 12 weeks!",
        rating: 5
      },
      {
        name: "Sarah M.",
        text: "Challenging but very effective. I've seen great strength improvements especially on my main lifts.",
        rating: 4
      }
    ]
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              {program.type === 'strength' && <Dumbbell className="text-accent h-5 w-5" />}
              {program.type === 'cardio' && <Terminal className="text-accent h-5 w-5" />}
              {program.type === 'mixed' && <Activity className="text-accent h-5 w-5" />}
            </div>
            <Badge variant="outline" className="bg-accent/10 text-accent border-0">
              {program.type.charAt(0).toUpperCase() + program.type.slice(1)}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{program.name}</h1>
          <p className="text-secondary mt-1">by {program.author}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={handleStartProgram}>
            Start Program
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={handleSaveProgram}>
            <Heart className="mr-1 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center mb-6">
        <div className="flex items-center text-yellow-400">
          {Array(5).fill(null).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i < program.rating ? 'fill-current' : 'stroke-current fill-none'}`}
            />
          ))}
        </div>
        <span className="ml-2 font-medium">{program.rating.toFixed(1)}</span>
        <span className="text-secondary ml-1">({program.ratingCount} ratings)</span>
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-accent mr-2" />
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div className="text-2xl font-semibold">{programDetails.weeks} weeks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-accent mr-2" />
              <div>
                <div className="text-sm font-medium">Workouts/Week</div>
                <div className="text-2xl font-semibold">{programDetails.workoutsPerWeek}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-accent mr-2" />
              <div>
                <div className="text-sm font-medium">Time/Session</div>
                <div className="text-2xl font-semibold">{programDetails.duration}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center">
              <BarChart className="h-5 w-5 text-accent mr-2" />
              <div>
                <div className="text-sm font-medium">Level</div>
                <div className="text-2xl font-semibold">{programDetails.level}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>About This Program</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary whitespace-pre-line">{programDetails.description}</p>
                  
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Program Goals</h3>
                    <div className="flex flex-wrap gap-2">
                      {programDetails.goals.map((goal, index) => (
                        <Badge key={index} variant="secondary">{goal}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Required Equipment</h3>
                    <div className="flex flex-wrap gap-2">
                      {programDetails.equipment.map((item, index) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Community Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-accent mr-2" />
                        <span className="text-sm">Active Users</span>
                      </div>
                      <span className="font-medium">1,246</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-accent mr-2" />
                        <span className="text-sm">Completion Rate</span>
                      </div>
                      <span className="font-medium">76%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 text-accent mr-2" />
                        <span className="text-sm">Satisfaction</span>
                      </div>
                      <span className="font-medium">92%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Top Testimonials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {programDetails.testimonials.map((testimonial, index) => (
                    <div key={index} className="pb-4">
                      <div className="flex items-center mb-2">
                        <div className="flex text-yellow-400">
                          {Array(5).fill(null).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < testimonial.rating ? 'fill-current' : 'stroke-current fill-none'}`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 font-medium text-sm">{testimonial.name}</span>
                      </div>
                      <p className="text-sm text-secondary">{testimonial.text}</p>
                      {index < programDetails.testimonials.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>
                A breakdown of the weekly workout plan in this program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {programDetails.schedule.map((day, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg">{day.day}</h3>
                      <Badge variant={day.exercises.length ? "default" : "outline"}>
                        {day.exercises.length ? day.name : "Rest Day"}
                      </Badge>
                    </div>
                    
                    {day.exercises.length > 0 ? (
                      <div className="rounded-md border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {day.exercises.map((exercise, i) => (
                            <div key={i} className="flex items-center">
                              <Dumbbell className="h-4 w-4 text-accent mr-2" />
                              <span>{exercise}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-4 text-center text-secondary">
                        <p>Rest and recovery day</p>
                      </div>
                    )}
                    
                    {index < programDetails.schedule.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>User Reviews</CardTitle>
              <CardDescription>
                See what others are saying about this program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* This would typically come from an API with pagination */}
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="pb-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center">
                          <div className="flex text-yellow-400">
                            {Array(5).fill(null).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < 4 + (index % 2) ? 'fill-current' : 'stroke-current fill-none'}`}
                              />
                            ))}
                          </div>
                          <span className="ml-2 font-medium">User{index + 100}</span>
                        </div>
                        <div className="text-xs text-secondary mt-1">2 weeks ago</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-secondary">
                      {index % 2 === 0 
                        ? "Great program that really helped me build strength. The progressive overload approach is well designed."
                        : "I've tried many programs and this one delivers results. The schedule is flexible enough to fit into my busy life."
                      }
                    </p>
                    
                    {index < 4 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <Button variant="outline">Load More Reviews</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}