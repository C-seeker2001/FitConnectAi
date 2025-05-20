import { Switch, Route } from "wouter";
import Home from "@/pages/home";
import Workouts from "@/pages/workouts";
import Progress from "@/pages/progress";
import Discover from "@/pages/discover";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import ProgramDetail from "@/pages/program";
import Debug from "@/pages/debug";
import AppLayout from "@/components/layout/AppLayout";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/ui/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/workouts" component={Workouts} />
            <Route path="/progress" component={Progress} />
            <Route path="/discover" component={Discover} />
            <Route path="/profile/:id?" component={Profile} />
            <Route path="/auth" component={Auth} />
            <Route path="/program/:id" component={ProgramDetail} />
            <Route path="/debug" component={Debug} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
