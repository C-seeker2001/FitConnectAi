import { Switch, Route } from "wouter";
import Home from "@/pages/home";
import Workouts from "@/pages/workouts";
import Progress from "@/pages/progress";
import Discover from "@/pages/discover";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/AppLayout";
import { AuthProvider } from "@/hooks/use-auth";

function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/workouts" component={Workouts} />
          <Route path="/progress" component={Progress} />
          <Route path="/discover" component={Discover} />
          <Route path="/profile" component={Profile} />
          <Route path="/auth" component={Auth} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthProvider>
  );
}

export default App;
