import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AgencyDrillDown from "./pages/AgencyDrillDown";
import Anomalies from "./pages/Anomalies";
import Forecasting from "./pages/Forecasting";
import ExecutiveReports from "./pages/ExecutiveReports";
import CIPDashboard from "./pages/CIPDashboard";
import POCDemo from "./pages/POCDemo";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agency/:code" component={AgencyDrillDown} />
      <Route path="/anomalies" component={Anomalies} />
      <Route path="/forecasting" component={Forecasting} />
      <Route path="/reports" component={ExecutiveReports} />
      <Route path="/cip" component={CIPDashboard} />
      <Route path="/poc" component={POCDemo} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
