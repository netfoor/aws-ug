'use client';

import { useEffect, useState } from 'react';
import { Calendar, Check, X, Clock, Loader2, AlertCircle } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { 
  getUpcomingLastThursdays, 
  formatEventDate,
  getMonthName,
  isSameDay
} from '@/lib/date-utils';

const client = generateClient<Schema>();

/**
 * 🗓️ DateSelector - Componente unificado para selección de fechas
 * 
 * Modos:
 * - adminMode=false: Grid visual con últimos jueves (para speakers/users)
 * - adminMode=true: Dropdown compacto con últimos jueves + input de hora (para admins)
 * 
 * Ambos modos verifican disponibilidad contra eventos y propuestas existentes
 */

interface DateSelectorProps {
  // Modo usuario vs admin
  adminMode?: boolean;
  
  // Para modo usuario (Date object)
  selectedDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  
  // Para modo admin (strings YYYY-MM-DD y HH:MM)
  selectedDateString?: string;
  selectedTime?: string;
  onDateChange?: (date: string) => void;
  onTimeChange?: (time: string) => void;
  
  // Configuración
  currentProposalId?: string; // Para no contar la propuesta actual como ocupada
  disabled?: boolean;
  showTimeInput?: boolean; // Si se muestra el input de hora (default: true en adminMode)
}

interface DateOption {
  date: Date;
  isoDate: string; // YYYY-MM-DD
  formatted: string;
  month: string;
  year: number;
  isAvailable: boolean;
  hasEvent: boolean;
  eventTitle?: string;
  reason?: string;
}

export default function DateSelector({
  adminMode = false,
  selectedDate,
  onDateSelect,
  selectedDateString,
  selectedTime = '18:30',
  onDateChange,
  onTimeChange,
  currentProposalId,
  disabled = false,
  showTimeInput = true,
}: DateSelectorProps) {
  const [dates, setDates] = useState<DateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableDates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProposalId]);

  async function loadAvailableDates() {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Calcular los próximos 12 últimos jueves
      const upcomingThursdays = getUpcomingLastThursdays(12);

      // 2️⃣ Obtener todos los eventos existentes
      const { data: events } = await client.models.Event.list();

      // 3️⃣ Obtener todas las propuestas con fecha (PENDING, APPROVED)
      // NO contar EVENT_CREATED porque esas ya tienen Event y se contarían doble
      const { data: allProposals } = await client.models.TalkProposal.list();
      
      // Filtrar propuestas con fecha que no sean la actual
      // Excluir EVENT_CREATED para evitar contar la misma fecha 2 veces (Event + TalkProposal)
      const proposalsWithDate = allProposals?.filter(p => 
        p.proposedDate && 
        (p.status === 'PENDING' || p.status === 'APPROVED') && // ✅ Solo PENDING/APPROVED
        !p.eventId && // ✅ Si ya tiene evento, que el Event lo cuente
        p.id !== currentProposalId
      ) || [];

      // 4️⃣ Obtener todas las aplicaciones de speaker con fecha propuesta (PENDING)
      const { data: allApplications } = await client.models.SpeakerApplication.list();
      
      // Filtrar aplicaciones con attachedProposal.proposedDate que estén PENDING
      const applicationsWithDate = allApplications?.filter(app => {
        if (!app.hasAttachedProposal || !app.attachedProposal) return false;
        
        try {
          // attachedProposal viene como STRING JSON desde DynamoDB, necesitamos parsearlo
          const proposal = typeof app.attachedProposal === 'string' 
            ? JSON.parse(app.attachedProposal)
            : app.attachedProposal as { proposedDate?: string; talkTitle?: string };
          
          return proposal.proposedDate && app.status === 'PENDING';
        } catch (err) {
          console.error('❌ Error parsing attachedProposal:', err);
          return false;
        }
      }) || [];


      // 4️⃣ Verificar disponibilidad de cada fecha
      const dateOptions: DateOption[] = upcomingThursdays.map((thursday) => {
        const isoDate = thursday.toISOString().split('T')[0];
        
        // Buscar si ya existe un evento en esta fecha
        const existingEvent = events?.find((event) => {
          if (!event.startDate) return false;
          const eventDate = new Date(event.startDate);
          return isSameDay(eventDate, thursday);
        });

        // Buscar si ya hay una propuesta para esta fecha
        const existingProposal = proposalsWithDate.find((proposal) => {
          if (!proposal.proposedDate) return false;
          const proposalDate = new Date(proposal.proposedDate);
          return isSameDay(proposalDate, thursday);
        });

        // Buscar si ya hay una aplicación de speaker para esta fecha
        const existingApplication = applicationsWithDate.find((app) => {
          if (!app.attachedProposal) return false;
          
          try {
            const proposal = typeof app.attachedProposal === 'string'
              ? JSON.parse(app.attachedProposal)
              : app.attachedProposal as { proposedDate?: string; talkTitle?: string };
            
            if (!proposal.proposedDate) return false;
            
            const appDate = new Date(proposal.proposedDate);
            return isSameDay(appDate, thursday);
          } catch (err) {
            console.error('❌ Error parsing attachedProposal in find:', err);
            return false;
          }
        });

        const hasEvent = !!existingEvent;
        const hasProposal = !!existingProposal;
        const hasApplication = !!existingApplication;
        const isAvailable = !hasEvent && !hasProposal && !hasApplication;

        let reason: string | undefined;
        if (existingEvent) {
          reason = `Ocupada: ${existingEvent.title}`;
        } else if (existingProposal) {
          reason = `Reservada: ${existingProposal.title}`;
        } else if (existingApplication) {
          try {
            const proposal = typeof existingApplication.attachedProposal === 'string'
              ? JSON.parse(existingApplication.attachedProposal)
              : existingApplication.attachedProposal as { talkTitle?: string };
            reason = `Reservada: ${proposal.talkTitle || 'Aplicación pendiente'}`;
          } catch {
            reason = 'Reservada: Aplicación pendiente';
          }
        }

        return {
          date: thursday,
          isoDate,
          formatted: formatEventDate(thursday),
          month: getMonthName(thursday),
          year: thursday.getFullYear(),
          isAvailable,
          hasEvent: hasEvent || hasProposal,
          eventTitle: existingEvent?.title || existingProposal?.title,
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

  // Handler para modo usuario (grid)
  function handleDateClick(dateOption: DateOption) {
    if (disabled || !dateOption.isAvailable || !onDateSelect) return;
    onDateSelect(dateOption.date);
  }

  // Loading state
  if (loading) {
    if (adminMode) {
      return (
        <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-lg theme-transition">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span className="text-sm text-text-secondary">Cargando fechas disponibles...</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">Selecciona la fecha (último jueves del mes)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 border border-border rounded-lg animate-pulse bg-surface/50 theme-transition"
            >
              <div className="h-4 bg-border rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-border rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">Error</p>
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
      <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg theme-transition">
        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">
          ⚠️ No hay fechas disponibles
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          Todas las fechas próximas ya tienen eventos programados o propuestas reservadas.
        </p>
      </div>
    );
  }

  // ========================================
  // ADMIN MODE: Dropdown compacto + hora
  // ========================================
  if (adminMode) {
    return (
      <div className={`grid grid-cols-1 ${showTimeInput && onTimeChange ? 'sm:grid-cols-2' : ''} gap-3 sm:gap-4`}>
        {/* Date Selector */}
        <div>
          <label htmlFor="eventDate" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            Fecha del Evento
          </label>
          <select
            id="eventDate"
            value={selectedDateString || ''}
            onChange={(e) => onDateChange?.(e.target.value)}
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
          
          <p className="text-xs text-text-secondary mt-1.5">
            📌 Solo fechas disponibles (último jueves del mes)
          </p>
        </div>

        {/* Time Selector (si está habilitado) */}
        {showTimeInput && onTimeChange && (
          <div>
            <label htmlFor="eventTime" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Hora de inicio
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
            
            <p className="text-xs text-text-secondary mt-1.5">
              🕐 Habitual: 6:30 PM (18:30)
            </p>
          </div>
        )}
      </div>
    );
  }

  // ========================================
  // USER MODE: Grid visual de fechas
  // ========================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-primary">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">Selecciona la fecha</h3>
        </div>
        <div className="text-sm text-text-secondary">
          <Clock className="w-4 h-4 inline mr-1" />
          6:30-7:30 PM
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-text-secondary">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <span className="text-text-secondary">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-text-secondary">Seleccionado</span>
        </div>
      </div>

      {/* Grid de fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dates.map((dateOption, index) => {
          const isSelected =
            selectedDate && isSameDay(dateOption.date, selectedDate);

          return (
            <button
              type="button"
              key={index}
              onClick={() => handleDateClick(dateOption)}
              disabled={disabled || !dateOption.isAvailable}
              className={`
                relative p-4 border-2 rounded-lg text-left transition-all theme-transition
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                    : dateOption.isAvailable
                    ? 'border-green-200 dark:border-green-800 bg-surface hover:border-green-400 hover:shadow-md'
                    : 'border-border bg-surface/50 cursor-not-allowed opacity-60'
                }
                ${disabled && 'cursor-not-allowed opacity-50'}
              `}
            >
              {/* Badge de estado */}
              <div className="absolute top-2 right-2">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : dateOption.isAvailable ? (
                  <div className="w-6 h-6 rounded-full bg-green-500"></div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="pr-8">
                <p className="font-semibold text-text-primary">
                  {dateOption.formatted}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  6:30-7:30 PM
                </p>
                {!dateOption.isAvailable && dateOption.eventTitle && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 line-clamp-1">
                    📌 {dateOption.eventTitle}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fecha seleccionada */}
      {selectedDate && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg theme-transition ">
          <div className='flex items-center gap-2'>
            <Check className="w-3 h-3 text-green-700" /> <p className="text-sm font-semibold text-text-primary">
             Fecha seleccionada:
          </p> 

          </div>
          
          <p className=" text-text-primary mt-1">
            {formatEventDate(selectedDate)} • 6:30-7:30 PM
          </p>
        </div>
      )}
    </div>
  );
}
