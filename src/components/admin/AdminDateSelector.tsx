'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { 
  getUpcomingLastThursdays, 
  formatEventDate,
  isSameDay
} from '@/lib/date-utils';

const client = generateClient<Schema>();

interface AdminDateSelectorProps {
  selectedDate: string; // YYYY-MM-DD format
  selectedTime: string; // HH:MM format
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  currentProposalId?: string; // Para no contar la propuesta actual como ocupada
  disabled?: boolean;
}

interface DateOption {
  date: Date;
  isoDate: string; // YYYY-MM-DD
  formatted: string;
  isAvailable: boolean;
  reason?: string;
}

/**
 * 🗓️ Selector de fecha minimalista para admin
 * Deshabilita fechas ya ocupadas por:
 * - Eventos existentes
 * - Propuestas PENDING o APPROVED (incluso sin evento creado)
 */
export function AdminDateSelector({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  currentProposalId,
  disabled = false,
}: AdminDateSelectorProps) {
  const [dates, setDates] = useState<DateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableDates();
  }, [currentProposalId]);

  async function loadAvailableDates() {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Calcular los próximos 12 últimos jueves
      const upcomingThursdays = getUpcomingLastThursdays(12);

      // 2️⃣ Obtener todos los eventos existentes
      const { data: events } = await client.models.Event.list();

      // 3️⃣ Obtener todas las propuestas con fecha (PENDING o APPROVED)
      const { data: allProposals } = await client.models.TalkProposal.list();
      
      // Filtrar propuestas con fecha que no sean la actual
      const proposalsWithDate = allProposals?.filter(p => 
        p.proposedDate && 
        (p.status === 'PENDING' || p.status === 'APPROVED' || p.status === 'EVENT_CREATED') &&
        p.id !== currentProposalId
      ) || [];

      console.log('📅 Admin Date Selector:', {
        totalProposals: allProposals?.length,
        proposalsWithDate: proposalsWithDate.length,
        currentProposalId,
      });

      // 4️⃣ Verificar disponibilidad de cada fecha
      const dateOptions: DateOption[] = upcomingThursdays.map((thursday) => {
        const isoDate = thursday.toISOString().split('T')[0];
        
        // Buscar si ya existe un evento en esta fecha
        const existingEvent = events?.find((event) => {
          if (!event.startDate) return false;
          const eventDate = new Date(event.startDate);
          return isSameDay(eventDate, thursday);
        });

        // Buscar si ya hay una propuesta para esta fecha (excluyendo la actual)
        const existingProposal = proposalsWithDate.find((proposal) => {
          if (!proposal.proposedDate) return false;
          const proposalDate = new Date(proposal.proposedDate);
          return isSameDay(proposalDate, thursday);
        });

        let reason: string | undefined;
        if (existingEvent) {
          reason = `Ocupada: ${existingEvent.title}`;
        } else if (existingProposal) {
          reason = `Reservada: ${existingProposal.title}`;
        }

        const isAvailable = !existingEvent && !existingProposal;

        return {
          date: thursday,
          isoDate,
          formatted: formatEventDate(thursday),
          isAvailable,
          reason,
        };
      });

      setDates(dateOptions);
    } catch (err) {
      console.error('❌ Error loading dates:', err);
      setError('Error al cargar fechas disponibles');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-accent" />
        <span className="text-sm text-text-secondary">Cargando fechas disponibles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadAvailableDates}
            className="text-xs underline hover:no-underline mt-1"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const availableDates = dates.filter(d => d.isAvailable);

  if (availableDates.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
          ⚠️ No hay fechas disponibles
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          Todas las fechas próximas están reservadas
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Date Selector */}
      <div>
        <label htmlFor="eventDate" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          Fecha del Evento
        </label>
        <select
          id="eventDate"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
          required
        >
          <option value="">Selecciona una fecha</option>
          {dates.map((dateOption) => (
            <option
              key={dateOption.isoDate}
              value={dateOption.isoDate}
              disabled={!dateOption.isAvailable}
            >
              {dateOption.formatted} {!dateOption.isAvailable ? `(${dateOption.reason})` : '✅'}
            </option>
          ))}
        </select>
        
        {/* Info helper */}
        <p className="text-xs text-text-secondary mt-1.5">
          📌 Solo fechas disponibles (último jueves del mes)
        </p>
      </div>

      {/* Time Selector */}
      <div>
        <label htmlFor="eventTime" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          Hora
        </label>
        <input
          id="eventTime"
          type="time"
          value={selectedTime}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
          required
        />
        
        {/* Info helper */}
        <p className="text-xs text-text-secondary mt-1.5">
          🕐 Habitual: 6:30 PM (18:30)
        </p>
      </div>
    </div>
  );
}
