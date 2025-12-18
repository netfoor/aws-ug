'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface EventCreationWizardProps {
  talkProposalId: string;
  talkTitle: string;
  proposedDate?: string; // ISO string from attachedProposal
  onEventCreated: (eventId: string, published: boolean) => void;
  onCancel: () => void;
}

/**
 * 🧙‍♂️ Wizard inline para crear y publicar evento después de aprobar speaker
 * Se renderiza dentro del UnifiedApplicationCard después del paso 1
 */
export function EventCreationWizard({
  talkProposalId,
  talkTitle,
  proposedDate,
  onEventCreated,
  onCancel,
}: EventCreationWizardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill con proposed date si existe - evitar desfase de zona horaria
  const prefillDate = proposedDate 
    ? proposedDate.split('T')[0] // Tomar solo la parte de fecha sin conversión
    : '';
  const prefillTime = proposedDate 
    ? (() => {
        // Extraer hora del ISO string sin conversión de zona horaria
        const timePart = proposedDate.split('T')[1];
        if (timePart) {
          return timePart.slice(0, 5); // HH:MM
        }
        return '18:30';
      })()
    : '18:30';

  const [formData, setFormData] = useState({
    eventDate: prefillDate,
    eventTime: prefillTime,
    location: 'Oficinas de AWS User Group Puebla',
    capacity: 50,
    registrationDeadline: '',
  });

  const handleCreateEvent = async (publish: boolean) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/create-and-publish-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talkProposalId,
          ...formData,
          registrationDeadline: formData.registrationDeadline || `${formData.eventDate}T${formData.eventTime}:00.000Z`,
          publish,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear evento');
      }

      console.log('✅ Evento creado:', result);
      onEventCreated(result.event.id, publish);
    } catch (err) {
      console.error('❌ Error creando evento:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✅</span>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Speaker Aprobado</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Ahora crea el evento para la charla</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Talk Title (readonly) */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Charla</label>
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{talkTitle}</p>
        </div>

        {/* Event Date */}
        <div>
          <label htmlFor="eventDate" className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">📅 Fecha del Evento</label>
          <input
            id="eventDate"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
            required
            className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Event Time */}
        <div>
          <label htmlFor="eventTime" className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">🕐 Hora</label>
          <input
            id="eventTime"
            type="time"
            value={formData.eventTime}
            onChange={(e) => setFormData(prev => ({ ...prev, eventTime: e.target.value }))}
            required
            className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">📍 Ubicación</label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ej: Auditorio Principal"
            required
            className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="capacity" className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">👥 Capacidad</label>
            <input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 50 }))}
              className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="deadline" className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">⏰ Fecha límite</label>
            <input
              id="deadline"
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
              placeholder="Opcional"
              className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={() => handleCreateEvent(true)}
            disabled={loading || !formData.eventDate || !formData.eventTime || !formData.location}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {loading ? '⏳ Creando...' : '🚀 Crear y Publicar Evento'}
          </Button>
          
          <Button
            onClick={() => handleCreateEvent(false)}
            disabled={loading || !formData.eventDate || !formData.eventTime || !formData.location}
            variant="outline"
            className="flex-1"
          >
            📝 Solo Crear Borrador
          </Button>
        </div>

        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
