'use client';

import { useEffect, useState } from 'react';
import { Calendar, Check, X, Clock } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { 
  getUpcomingLastThursdays, 
  formatEventDate,
  getMonthName,
  isSameDay,
  dateToISO
} from '@/lib/date-utils';

const client = generateClient<Schema>();

interface LastThursdaySelectorProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  disabled?: boolean;
}

interface DateOption {
  date: Date;
  formatted: string;
  month: string;
  year: number;
  isAvailable: boolean;
  hasEvent: boolean;
  eventTitle?: string;
}

export default function LastThursdaySelector({
  selectedDate,
  onDateSelect,
  disabled = false,
}: LastThursdaySelectorProps) {
  const [dates, setDates] = useState<DateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableDates();
  }, []);

  async function loadAvailableDates() {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Calcular los próximos 12 últimos jueves
      const upcomingThursdays = getUpcomingLastThursdays(12);

      // 2️⃣ Obtener todos los eventos existentes
      const { data: events } = await client.models.Event.list();

      // 3️⃣ Obtener todas las propuestas aprobadas con fecha
      const { data: proposals } = await client.models.TalkProposal.list({
        filter: {
          status: { eq: 'APPROVED' },
        },
      });

      // 4️⃣ Verificar disponibilidad de cada fecha
      const dateOptions: DateOption[] = upcomingThursdays.map((thursday) => {
        // Buscar si ya existe un evento en esta fecha
        const existingEvent = events?.find((event) => {
          if (!event.startDate) return false;
          const eventDate = new Date(event.startDate);
          return isSameDay(eventDate, thursday);
        });

        // Buscar si ya hay una propuesta aprobada para esta fecha
        const existingProposal = proposals?.find((proposal) => {
          if (!proposal.proposedDate) return false;
          const proposalDate = new Date(proposal.proposedDate);
          return isSameDay(proposalDate, thursday);
        });

        const hasEvent = !!existingEvent;
        const hasProposal = !!existingProposal;
        const isAvailable = !hasEvent && !hasProposal;

        return {
          date: thursday,
          formatted: formatEventDate(thursday),
          month: getMonthName(thursday),
          year: thursday.getFullYear(),
          isAvailable,
          hasEvent: hasEvent || hasProposal,
          eventTitle: existingEvent?.title || existingProposal?.title,
        };
      });

      setDates(dateOptions);
    } catch (err) {
      console.error('Error loading dates:', err);
      setError('Error al cargar fechas disponibles');
    } finally {
      setLoading(false);
    }
  }

  function handleDateClick(dateOption: DateOption) {
    if (disabled || !dateOption.isAvailable) return;
    onDateSelect(dateOption.date);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">Selecciona la fecha (último jueves del mes)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 border border-gray-200 rounded-lg animate-pulse bg-gray-50"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadAvailableDates}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        <p className="font-semibold">No hay fechas disponibles</p>
        <p className="text-sm">Todas las fechas próximas ya tienen eventos programados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">Selecciona la fecha</h3>
        </div>
        <div className="text-sm text-gray-500">
          <Clock className="w-4 h-4 inline mr-1" />
          6:30-7:30 PM
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span className="text-gray-600">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Seleccionado</span>
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
                relative p-4 border-2 rounded-lg text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : dateOption.isAvailable
                    ? 'border-green-200 bg-white hover:border-green-400 hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
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
                <p className="font-semibold text-gray-900">
                  {dateOption.formatted}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  6:30-7:30 PM
                </p>
                {!dateOption.isAvailable && dateOption.eventTitle && (
                  <p className="text-xs text-red-600 mt-2 line-clamp-1">
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
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-900">
            ✅ Fecha seleccionada:
          </p>
          <p className="text-blue-700 mt-1">
            {formatEventDate(selectedDate)} • 6:30-7:30 PM
          </p>
        </div>
      )}
    </div>
  );
}
