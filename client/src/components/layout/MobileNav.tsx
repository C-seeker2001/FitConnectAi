import { Link, useLocation } from "wouter";
import { Plus } from "lucide-react";
import { useState } from "react";
import WorkoutForm from "@/components/workout/WorkoutForm";

export default function MobileNav() {
  const [location] = useLocation();
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);

  return (
    <>
      <div className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex justify-around items-center h-16">
          <Link href="/" className={`flex flex-col items-center justify-center ${location === '/' ? 'text-accent' : 'text-secondary'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-0.5 hidden xs:block sm:hidden">Home</span>
          </Link>
          <Link href="/workouts" className={`flex flex-col items-center justify-center ${location === '/workouts' ? 'text-accent' : 'text-secondary'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-0.5 hidden xs:block sm:hidden">Workouts</span>
          </Link>
          <button 
            onClick={() => setShowWorkoutForm(true)}
            className="flex flex-col items-center justify-center"
          >
            <div className="fab bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
          </button>
          <Link href="/discover" className={`flex flex-col items-center justify-center ${location === '/discover' ? 'text-accent' : 'text-secondary'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-0.5 hidden xs:block sm:hidden">Discover</span>
          </Link>
          <Link href="/progress" className={`flex flex-col items-center justify-center ${location === '/progress' ? 'text-accent' : 'text-secondary'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-0.5 hidden xs:block sm:hidden">Progress</span>
          </Link>
        </div>
      </div>
      <WorkoutForm open={showWorkoutForm} onClose={() => setShowWorkoutForm(false)} />
    </>
  );
}
