import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, ChevronLeft, ChevronRight, Filter, Loader, Plus, X, ClipboardList, Clock, Dumbbell, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutForm from "@/components/workout/WorkoutForm";
import { formatDateWithDay } from "@/lib/utils";

export default function Workouts() {
  const { user, isLoading: authLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [tab, setTab] = useState("history");
  const [filter, setFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Get current date for calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['/api/workouts', filter, selectedDate?.toISOString()],
    enabled: !!user,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/workouts/templates'],
    enabled: !!user && tab === "templates",
  });
  
  const { data: workoutDetails, isLoading: workoutDetailsLoading } = useQuery({
    queryKey: ['/api/workouts', selectedWorkout?.id],
    enabled: !!selectedWorkout?.id,
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

  // Calendar navigation
  const prevMonth = () => {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - 1);
    setCurrentDate(date);
  };

  const nextMonth = () => {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() + 1);
    setCurrentDate(date);
  };

  // Calendar rendering
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add weekday headers
    weekdays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="text-center text-xs font-medium text-secondary py-1">
          {day}
        </div>
      );
    });
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      
      // Check if there's a workout on this day
      const hasWorkout = workouts?.some((workout: any) => {
        const workoutDate = new Date(workout.createdAt);
        return workoutDate.toDateString() === date.toDateString();
      });
      
      days.push(
        <button
          key={`day-${i}`}
          onClick={() => setSelectedDate(date)}
          className={`p-2 rounded-full w-8 h-8 flex items-center justify-center text-sm ${
            isSelected 
              ? 'bg-accent text-white' 
              : isToday 
                ? 'bg-accent/10 text-accent' 
                : hasWorkout
                  ? 'border border-accent/30 text-primary'
                  : 'text-primary hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <Button onClick={() => setShowWorkoutForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Workout
        </Button>
      </div>

      <Tabs defaultValue="history" className="w-full" onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="history">Workout History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-1" />
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex items-center">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="mr-1">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderCalendar()}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {selectedDate ? formatDateWithDay(selectedDate) : "Recent Workouts"}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter("all")}>
                  All Workouts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("strength")}>
                  Strength
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("cardio")}>
                  Cardio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {workoutsLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workouts?.length > 0 ? (
            <div className="space-y-3">
              {workouts.map((workout: any) => (
                <Card key={workout.id}>
                  <CardHeader className="pb-2">
                    <CardTitle>{workout.name}</CardTitle>
                    <CardDescription>{new Date(workout.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-secondary">Duration</div>
                        <div className="font-mono font-medium">{workout.duration}</div>
                      </div>
                      <div>
                        <div className="text-secondary">Volume</div>
                        <div className="font-mono font-medium">{workout.volume}{workout.useMetric ? ' kg' : ' lbs'}</div>
                      </div>
                      <div>
                        <div className="text-secondary">Exercises</div>
                        <div className="font-mono font-medium">{workout.exerciseCount}</div>
                      </div>
                    </div>

                    {workout.exercises && workout.exercises.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1">
                          {workout.exercises.map((exercise: string, index: number) => (
                            <span key={index} className="bg-gray-200 text-secondary text-xs px-2 py-1 rounded-full">
                              {exercise}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-auto"
                      onClick={() => setSelectedWorkout(workout)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-secondary mb-4">
                  {selectedDate 
                    ? `No workouts on ${formatDateWithDay(selectedDate)}`
                    : "No workouts found"
                  }
                </p>
                <Button onClick={() => setShowWorkoutForm(true)}>
                  Start a Workout
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates?.map((template: any) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>
                      {template.exerciseCount} exercises • {template.createdBy}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {template.exercises.slice(0, 4).map((exercise: string, index: number) => (
                        <span key={index} className="bg-gray-200 text-secondary text-xs px-2 py-1 rounded-full">
                          {exercise}
                        </span>
                      ))}
                      {template.exercises.length > 4 && (
                        <span className="bg-gray-200 text-secondary text-xs px-2 py-1 rounded-full">
                          +{template.exercises.length - 4} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowWorkoutForm(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2">
                <Plus className="h-8 w-8 text-secondary mb-2" />
                <h3 className="font-medium mb-1">Create New Template</h3>
                <p className="text-secondary text-sm text-center mb-4">
                  Save your workout routine as a template for easy access
                </p>
                <Button>Create Template</Button>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <WorkoutForm 
        open={showWorkoutForm} 
        onClose={() => {
          setShowWorkoutForm(false);
          setIsEditing(false);
          setSelectedTemplate(null);
        }} 
        initialTemplate={selectedTemplate}
        workoutToEdit={isEditing ? selectedWorkout : null}
        isEditing={isEditing}
      />

      {/* Workout Details Dialog */}
      <Dialog open={!!selectedWorkout} onOpenChange={(open) => !open && setSelectedWorkout(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWorkout?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedWorkout && (
            <div className="space-y-4">
              <div className="text-sm text-secondary">
                {new Date(selectedWorkout.createdAt).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-accent" />
                    <div>
                      <p className="font-medium">Duration</p>
                      <p className="text-secondary">{selectedWorkout.duration || "In progress"}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center">
                    <Dumbbell className="h-5 w-5 mr-2 text-accent" />
                    <div>
                      <p className="font-medium">Volume</p>
                      <p className="text-secondary">{selectedWorkout.volume} {selectedWorkout.useMetric ? 'kg' : 'lbs'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                    <div className="space-y-3">
                      {selectedWorkout.exercises.map((exercise: string, index: number) => (
                        <div key={index} className="flex items-center p-2 bg-gray-50 rounded-md">
                          <ClipboardList className="h-4 w-4 mr-2 text-accent" />
                          <span>{exercise}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary text-sm">No exercises recorded for this workout</p>
                  )}
                </CardContent>
              </Card>
              
              {selectedWorkout.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-secondary text-sm">{selectedWorkout.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedWorkout(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsEditing(true);
              setShowWorkoutForm(true);
              // Keep the dialog open until the form closes
            }}>
              Edit Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
