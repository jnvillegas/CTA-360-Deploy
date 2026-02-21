import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import Appointments from "./pages/Appointments";
import MedicalRecords from "./pages/MedicalRecords";
import Prescriptions from "./pages/Prescriptions";
import CostSavingsCases from "./pages/CostSavingsCases";
import CostSavingsCaseDetail from "./pages/CostSavingsCaseDetail";
import Reports from "./pages/Reports";
import ExecutiveReports from "./pages/ExecutiveReports";
import Notifications from "./pages/Notifications";
import Adherence from "./pages/Adherence";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador']}>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patients" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador', 'administrador']}>
                <AppLayout>
                  <Patients />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/doctors" 
            element={
              <ProtectedRoute allowedRoles={['administrador', 'gestor']}>
                <AppLayout>
                  <Doctors />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/appointments" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador', 'administrador']}>
                <AppLayout>
                  <Appointments />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/medical-records" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador']}>
                <AppLayout>
                  <MedicalRecords />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/prescriptions" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador']}>
                <AppLayout>
                  <Prescriptions />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cost-savings" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador', 'gestor', 'administrador']}>
                <AppLayout>
                  <CostSavingsCases />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cost-savings/:id" 
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador', 'gestor']}>
                <AppLayout>
                  <CostSavingsCaseDetail />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute allowedRoles={['gestor', 'administrador']}>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/executive" 
            element={
              <ProtectedRoute allowedRoles={['gestor', 'administrador']}>
                <AppLayout>
                  <ExecutiveReports />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['paciente', 'medico', 'medico_evaluador', 'gestor', 'administrador']}>
                <AppLayout>
                  <Notifications />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adherence"
            element={
              <ProtectedRoute allowedRoles={['medico', 'medico_evaluador', 'gestor', 'administrador']}>
                <AppLayout>
                  <Adherence />
                </AppLayout>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
