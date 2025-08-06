import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Utensils, ShoppingCart, Users, Settings, Home, Cake, SlidersHorizontal, Store, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUserRole } from '@/hooks/useUserRole'; // Import useUserRole

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
      isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
    )}
  >
    {icon}
    {label}
  </Link>
);

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const location = window.location.pathname;
  const { role, loading: roleLoading } = useUserRole(); // Get user role

  const navItems = [
    { to: "/", label: "Dashboard", icon: <Home className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/products", label: "Productos", icon: <Package className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/ingredients", label: "Ingredientes", icon: <Utensils className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/cake-quoter", label: "Cotizador de Pasteles", icon: <Cake className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/cake-quoter-settings", label: "Configuración Cotizador", icon: <SlidersHorizontal className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/orders", label: "Pedidos", icon: <ShoppingCart className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/pos", label: "Punto de Venta", icon: <Store className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/sales-management", label: "Gestión de Ventas", icon: <TrendingUp className="h-4 w-4" />, roles: ['admin', 'standard'] },
    { to: "/user-management", label: "Gestión de Usuarios", icon: <Users className="h-4 w-4" />, roles: ['admin'] }, // Admin-only link
    { to: "/settings", label: "Configuración", icon: <Settings className="h-4 w-4" />, roles: ['admin', 'standard'] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (roleLoading) return false; // Don't show links until role is loaded
    return item.roles.includes(role || 'standard'); // Default to 'standard' if role is null/undefined
  });

  const sidebarContent = (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {filteredNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          isActive={location === item.to}
        />
      ))}
    </nav>
  );

  return (
    <>
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Home className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col">
            <h2 className="text-lg font-semibold p-4">SweetTrack</h2> {/* Renamed */}
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : (
        <div className="hidden border-r bg-sidebar-background lg:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <span className="text-lg">SweetTrack</span> {/* Renamed */}
              </Link>
            </div>
            <div className="flex-1">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;