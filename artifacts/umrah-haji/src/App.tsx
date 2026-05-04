import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TenantProvider } from "@/contexts/TenantContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { EnvDiagnostic } from "@/components/EnvDiagnostic";
import NotFound from "./pages/NotFound";

// Route modules
import PublicRoutes from "@/routes/PublicRoutes";
import CustomerRoutes from "@/routes/CustomerRoutes";
import AdminRoutes from "@/routes/AdminRoutes";
// import OperationalRoutes from "@/routes/OperationalRoutes";
import AgentRoutes from "@/routes/AgentRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <ScrollToTop />
                <EnvDiagnostic />
                <Routes>
                  {PublicRoutes()}
                  {CustomerRoutes()}
                  {AdminRoutes()}
                  {/* {OperationalRoutes()} */}
                  {AgentRoutes()}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
