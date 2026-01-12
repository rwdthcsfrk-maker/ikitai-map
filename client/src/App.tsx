import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Lists from "./pages/Lists";
import ListDetail from "./pages/ListDetail";
import AddPlace from "./pages/AddPlace";
import Search from "./pages/Search";
import FilterSearch from "./pages/FilterSearch";
import MyPage from "./pages/MyPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lists" component={Lists} />
      <Route path="/lists/:id" component={ListDetail} />
      <Route path="/add" component={AddPlace} />
      <Route path="/search" component={Search} />
      <Route path="/filter" component={FilterSearch} />
      <Route path="/mypage" component={MyPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
