import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
}

export const SalesAnalytics: React.FC = () => {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user?.id;

  const [dailySales, setDailySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [selectedDaySales, setSelectedDaySales] = useState(0);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string | null>(null); // 0 for Sunday, 1 for Monday, etc.

  const daysOfWeek = [
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
    { value: '0', label: 'Domingo' },
  ];

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['salesOrders', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed'); // Solo ventas completadas
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !sessionLoading,
  });

  useEffect(() => {
    if (orders) {
      const now = new Date();

      // Ventas del día actual
      const startOfToday = startOfDay(now);
      const endOfToday = endOfDay(now);
      const currentDailySales = orders.reduce((sum, order) => {
        const orderDate = new Date(order.created_at);
        if (isWithinInterval(orderDate, { start: startOfToday, end: endOfToday })) {
          return sum + order.total_amount;
        }
        return sum;
      }, 0);
      setDailySales(currentDailySales);

      // Ventas de la semana actual (lunes a domingo)
      const startOfCurrentWeek = startOfWeek(now, { locale: es });
      const endOfCurrentWeek = endOfWeek(now, { locale: es });
      const currentWeeklySales = orders.reduce((sum, order) => {
        const orderDate = new Date(order.created_at);
        if (isWithinInterval(orderDate, { start: startOfCurrentWeek, end: endOfCurrentWeek })) {
          return sum + order.total_amount;
        }
        return sum;
      }, 0);
      setWeeklySales(currentWeeklySales);

      // Ventas del mes actual
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      const currentMonthlySales = orders.reduce((sum, order) => {
        const orderDate = new Date(order.created_at);
        if (isWithinInterval(orderDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
          return sum + order.total_amount;
        }
        return sum;
      }, 0);
      setMonthlySales(currentMonthlySales);

      // Ventas del día de la semana seleccionado
      if (selectedDayOfWeek !== null) {
        const dayIndex = parseInt(selectedDayOfWeek);
        const salesForSelectedDay = orders.reduce((sum, order) => {
          const orderDate = new Date(order.created_at);
          // Check if the order date falls within the current week and matches the selected day of the week
          if (isWithinInterval(orderDate, { start: startOfCurrentWeek, end: endOfCurrentWeek }) && getDay(orderDate) === dayIndex) {
            return sum + order.total_amount;
          }
          return sum;
        }, 0);
        setSelectedDaySales(salesForSelectedDay);
      } else {
        setSelectedDaySales(0); // Reset if no day is selected
      }
    }
  }, [orders, selectedDayOfWeek]);

  if (isLoading || sessionLoading) return <div>Cargando datos de ventas...</div>;
  if (error) return <div>Error al cargar datos de ventas: {error.message}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${dailySales.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total de ventas completadas hoy</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas de la Semana</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${weeklySales.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total de ventas completadas esta semana</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${monthlySales.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total de ventas completadas este mes</p>
        </CardContent>
      </Card>

      {/* Nueva tarjeta para ventas por día de la semana */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas por Día de la Semana</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Select onValueChange={setSelectedDayOfWeek} value={selectedDayOfWeek || ''}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecciona un día" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-2xl font-bold">
            ${selectedDaySales.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Ventas completadas para el día seleccionado en la semana actual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};