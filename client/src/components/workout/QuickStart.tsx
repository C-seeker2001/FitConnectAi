import { useState } from "react";
import { 
  Dumbbell, 
  Terminal, 
  Timer, 
  Plus 
} from "lucide-react";
import WorkoutForm from "./WorkoutForm";

export default function QuickStart() {
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleTemplateClick = (template: string) => {
    setSelectedTemplate(template);
    setShowWorkoutForm(true);
  };

  return (
    <>
      <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quick Start</h2>
          <a href="/workouts/templates" className="text-accent text-sm font-medium">View All Templates</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => handleTemplateClick("Upper Body")}
            className="bg-muted hover:bg-muted/80 rounded-lg p-3 text-center"
          >
            <Dumbbell className="mb-1 text-secondary mx-auto" />
            <div className="text-sm font-medium text-foreground">Upper Body</div>
          </button>
          <button 
            onClick={() => handleTemplateClick("Lower Body")}
            className="bg-muted hover:bg-muted/80 rounded-lg p-3 text-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-1 text-secondary mx-auto"
            >
              <path d="m18 5-3-3H9L6 5" />
              <path d="M6 5v4c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V5" />
              <path d="M9 14v5" />
              <path d="M15 14v5" />
              <path d="M12 14v5" />
              <path d="M6 9v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
              <path d="M6 14h12" />
            </svg>
            <div className="text-sm font-medium text-foreground">Lower Body</div>
          </button>
          <button 
            onClick={() => handleTemplateClick("Cardio")}
            className="bg-muted hover:bg-muted/80 rounded-lg p-3 text-center"
          >
            <Terminal className="mb-1 text-secondary mx-auto" />
            <div className="text-sm font-medium text-foreground">Cardio</div>
          </button>
          <button 
            onClick={() => handleTemplateClick("Custom")}
            className="bg-muted hover:bg-muted/80 rounded-lg p-3 text-center"
          >
            <Plus className="mb-1 text-secondary mx-auto" />
            <div className="text-sm font-medium text-foreground">Custom</div>
          </button>
        </div>
      </div>

      <WorkoutForm 
        open={showWorkoutForm} 
        onClose={() => setShowWorkoutForm(false)} 
        initialTemplate={selectedTemplate} 
      />
    </>
  );
}
