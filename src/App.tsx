import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider, useSession } from "./contexts/SessionContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import React from "react";
import Products from "./pages/Products";
import Ingredients from "./pages/Ingredients";
import Orders from "./pages/Orders";
import CakeQuoter from "./pages/CakeQuoter";
import CakeQuoterSettings from "./pages/CakeQuoterSettings";
import POS from "./pages/POS";
import SalesManagement from "./pages/SalesManagement";
import Unapproved from "./pages/Unapproved"; // Import the new Unapproved page

const queryClient = new QueryClient();

// Un componente wrapper para proteger rutas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, isApproved } = useSession(); // Get isApproved from session context

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    // SessionContext already handles navigation to /login
    return null;
  }

  if (!isApproved) {
    // If user is authenticated but not approved, redirect to unapproved page
    return <Unapproved />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unapproved" element={<Unapproved />} /> {/* New route for unapproved users */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Index />} />
              <Route path="products" element={<Products />} />
              <Route path="ingredients" element={<Ingredients />} />
              <Route path="orders" element={<Orders />} />
              <Route path="cake-quoter" element={<CakeQuoter />} />
              <Route path="cake-quoter-settings" element={<CakeQuoterSettings />} />
              <Route path="pos" element={<POS />} />
              <Route path="sales-management" element={<SalesManagement />} />
              {/* AÑADE TODAS LAS RUTAS PERSONALIZADAS AQUÍ COMO RUTAS ANIDADAS */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;