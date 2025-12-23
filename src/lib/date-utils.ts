/**
 * 📅 Date Utilities - Last Thursday Calculator
 * 
 * Utilidades para calcular y trabajar con fechas de eventos
 * AWS UG Puebla siempre hace charlas el último jueves de cada mes
 */

export interface EventDate {
  date: Date;
  formatted: string; // "Jueves 26 de Febrero 2026"
  timeSlot: string; // "6:30-7:30 PM"
  isAvailable: boolean;
  month: string; // "Febrero"
  year: number;
}

/**
 * Calcula el último jueves de un mes específico
 */
export function getLastThursdayOfMonth(year: number, month: number): Date {
  // Obtener el último día del mes (month es 0-indexed)
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Obtener el día de la semana (0 = domingo, 4 = jueves)
  const lastDayWeekday = lastDayOfMonth.getDay();
  
  // Calcular cuántos días retroceder para llegar al jueves
  // Si el último día es jueves (4), retroceder 0 días
  // Si es viernes (5), retroceder 1 día
  // Si es sábado (6), retroceder 2 días
  // Si es domingo (0), retroceder 3 días
  // Si es lunes (1), retroceder 4 días
  // Si es martes (2), retroceder 5 días
  // Si es miércoles (3), retroceder 6 días
  let daysToSubtract: number;
  if (lastDayWeekday >= 4) {
    daysToSubtract = lastDayWeekday - 4;
  } else {
    daysToSubtract = lastDayWeekday + 3;
  }
  
  // Crear fecha del último jueves en UTC
  // Usamos Date.UTC para evitar conversiones de timezone
  // Hora: 18:30 en tiempo de México (UTC-6) = 00:30 UTC del día siguiente
  // Para mantener el jueves correcto, usamos las 00:30 del día jueves
  const lastThursday = new Date(Date.UTC(
    year,
    month,
    lastDayOfMonth.getDate() - daysToSubtract,
    0, // 00:30 UTC mantiene el día correcto
    30,
    0,
    0
  ));
  
  return lastThursday;
}

/**
 * Obtiene los últimos jueves de los próximos N meses
 */
export function getUpcomingLastThursdays(monthsAhead: number = 12): Date[] {
  const thursdays: Date[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  for (let i = 0; i < monthsAhead; i++) {
    const targetMonth = currentMonth + i;
    const targetYear = currentYear + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    
    const thursday = getLastThursdayOfMonth(targetYear, normalizedMonth);
    
    // Solo incluir fechas futuras (después de hoy)
    if (thursday > today) {
      thursdays.push(thursday);
    }
  }
  
  return thursdays;
}

/**
 * Formatea una fecha al estilo español bonito
 * Ejemplo: "Jueves 26 de Febrero 2026 (6:30-7:30 PM)"
 * Usa UTC para evitar problemas de timezone
 */
export function formatEventDate(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Usar UTC para obtener día/mes/año correcto
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  
  return `Jueves ${day} de ${month} ${year}`;
}

/**
 * Convierte Date a string ISO (para DynamoDB)
 */
export function dateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Convierte string ISO a Date
 */
export function isoToDate(iso: string): Date {
  return new Date(iso);
}

/**
 * Verifica si dos fechas son el mismo día (ignora hora)
 * Usa UTC para evitar problemas de timezone
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  // Normalizar ambas fechas a UTC y comparar solo YYYY-MM-DD
  const date1UTC = date1.toISOString().split('T')[0];
  const date2UTC = date2.toISOString().split('T')[0];
  
  return date1UTC === date2UTC;
}

/**
 * Obtiene el nombre del mes en español
 */
export function getMonthName(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[date.getMonth()];
}

/**
 * Convierte fecha a formato corto para UI
 * Ejemplo: "26 Feb 2026"
 */
export function formatShortDate(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
