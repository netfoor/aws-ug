'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AdminDateSelector } from './AdminDateSelector';
import { 
  CheckCircle, 
  Clock,
  MapPin, 
  Users, 
  AlertCircle,
  Loader2,
  Rocket,
  FileText,
} from 'lucide-react';

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
  
  // Para la hora: siempre usar 18:30 (hora habitual) a menos que haya una hora específica diferente
  const prefillTime = proposedDate 
    ? (() => {
        const timePart = proposedDate.split('T')[1];
        if (timePart) {
          const hourMin = timePart.slice(0, 5); // HH:MM
          // Si la hora es 00:00 (medianoche), usar la hora habitual 18:30
          if (hourMin === '00:00') {
            return '18:30';
          }
          return hourMin;
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
    <div className="mt-4 p-4 sm:p-5 border-t border-border bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg theme-transition">
      {/* Header con icono */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-text-primary text-base">Speaker Aprobado</h4>
          <p className="text-sm text-text-secondary mt-0.5">Completa los detalles para aprobar la propuesta y crear el evento</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Talk Title (readonly) */}
        <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <label className="text-xs font-medium text-text-secondary block mb-1">Charla</label>
          <p className="text-sm font-semibold text-text-primary">{talkTitle}</p>
        </div>

        {/* Date & Time Selector - Deshabilita fechas ocupadas */}
        <AdminDateSelector
          selectedDate={formData.eventDate}
          selectedTime={formData.eventTime}
          onDateChange={(date) => setFormData(prev => ({ ...prev, eventDate: date }))}
          onTimeChange={(time) => setFormData(prev => ({ ...prev, eventTime: time }))}
          currentProposalId={talkProposalId}
          disabled={loading}
        />

        {/* Location */}
        <div>
          <label htmlFor="location" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            Ubicación
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ej: Auditorio Principal"
            required
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
          />
        </div>

        {/* Capacity & Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="capacity" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-accent" />
              Capacidad
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 50 }))}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
            />
          </div>
          <div>
            <label htmlFor="deadline" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Fecha límite de registro
            </label>
            <input
              id="deadline"
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
              placeholder="Opcional"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
            />
            <p className="text-xs text-text-secondary mt-1.5">
              📅 Hasta cuándo se pueden inscribir (opcional)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={() => handleCreateEvent(true)}
            disabled={loading || !formData.eventDate || !formData.eventTime || !formData.location}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Crear y Publicar
              </>
            )}
          </Button>
          
          <Button
            onClick={() => handleCreateEvent(false)}
            disabled={loading || !formData.eventDate || !formData.eventTime || !formData.location}
            variant="outline"
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Solo Borrador
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
