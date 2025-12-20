'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AdminDateSelector } from './AdminDateSelector';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { 
  CheckCircle, 
  Clock,
  MapPin, 
  Users, 
  AlertCircle,
  Loader2,
  Rocket,
  FileText,
  HelpCircle,
  Edit3,
} from 'lucide-react';

const client = generateClient<Schema>();

interface EventCreationWizardProps {
  talkProposalId: string;
  talkTitle: string;
  proposedDate?: string; // ISO string from attachedProposal
  duration?: number; // Duration in minutes
  startTime?: string; // Format: HH:MM (e.g., "18:30")
  endTime?: string; // Format: HH:MM (e.g., "19:15")
  onEventCreated: (eventId: string, published: boolean) => void;
  onCancel: () => void;
}

type WizardStep = 'event-details' | 'questions' | 'completed';

/**
 * 🧙‍♂️ Wizard inline para crear y publicar evento después de aprobar speaker
 * Se renderiza dentro del UnifiedApplicationCard después del paso 1
 */
export function EventCreationWizard({
  talkProposalId,
  talkTitle,
  proposedDate,
  duration,
  startTime,
  endTime,
  onEventCreated,
  onCancel,
}: EventCreationWizardProps) {
  const [step, setStep] = useState<WizardStep>('event-details');
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [wasPublished, setWasPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill con proposed date si existe - evitar desfase de zona horaria
  const prefillDate = proposedDate 
    ? proposedDate.split('T')[0] // Tomar solo la parte de fecha sin conversión
    : '';
  
  // Usar startTime si está disponible, sino usar 18:30
  const prefillTime = startTime || '18:30';
  const prefillEndTime = endTime || (() => {
    // Calcular end time basado en duración si no está disponible
    const durationMin = duration || 45;
    const [hours, minutes] = prefillTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMin;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  })();

  const [formData, setFormData] = useState({
    eventDate: prefillDate,
    eventTime: prefillTime,
    eventEndTime: prefillEndTime,
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
      
      // Guardar info del evento creado y pasar al paso de preguntas
      setCreatedEventId(result.event.id);
      setWasPublished(publish);
      setStep('questions');
    } catch (err) {
      console.error('❌ Error creando evento:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDefaultQuestions = async () => {
    if (!createdEventId) return;

    setLoading(true);
    setError('');

    try {
      // Preguntas por defecto
      const defaultQuestions = [
        {
          id: '1',
          type: 'checkbox',
          label: '¿Qué te motivó a asistir a este evento?',
          required: true,
          options: ['Aprender sobre AWS y Cloud', 'Networking profesional', 'Desarrollar habilidades', 'Quiero ser speaker', 'Contenido interesante', 'Otro'],
          order: 1
        },
        {
          id: '2',
          type: 'select',
          label: '¿Es tu primera vez en AWS User Group Puebla?',
          options: ['Sí, es mi primera vez', 'No, he asistido antes'],
          required: true,
          order: 2
        },
        {
          id: '3',
          type: 'checkbox',
          label: '¿Cómo te enteraste del evento?',
          options: ['Redes sociales', 'Amigos o colegas', 'Email', 'Sitio web', 'Universidad', 'Trabajo', 'Otro'],
          required: false,
          order: 3
        }
      ];

      // Guardar preguntas en el evento
      await client.models.Event.update({
        id: createdEventId,
        registrationQuestions: JSON.stringify(defaultQuestions),
      });

      console.log('✅ Preguntas por defecto agregadas');
      finishWizard();
    } catch (err) {
      console.error('❌ Error agregando preguntas:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar preguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestions = () => {
    finishWizard();
  };

  const finishWizard = () => {
    if (createdEventId) {
      onEventCreated(createdEventId, wasPublished);
    }
  };

  // Paso 1: Detalles del evento
  if (step === 'event-details') {
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

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className="text-xs font-medium text-text-primary flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-accent" />
              Hora de fin
            </label>
            <input
              id="endTime"
              type="time"
              value={formData.eventEndTime}
              onChange={(e) => setFormData(prev => ({ ...prev, eventEndTime: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors theme-transition"
            />
            <p className="text-xs text-text-secondary mt-1.5">
              ⏰ {formData.eventTime} - {formData.eventEndTime}
            </p>
          </div>

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

  // Paso 2: Preguntas de registro
  if (step === 'questions') {
    return (
      <div className="mt-4 p-4 sm:p-5 border-t border-border bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg theme-transition">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-text-primary text-base">¿Agregar Preguntas de Registro?</h4>
            <p className="text-sm text-text-secondary mt-0.5">
              Estas preguntas aparecerán cuando los usuarios se registren al evento
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Preguntas por defecto - Preview */}
        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold text-text-primary mb-2">📋 Preguntas por defecto:</p>
          
          <div className="space-y-2">
            <div className="p-3 bg-surface border border-border rounded-lg">
              <p className="text-sm font-medium text-text-primary mb-1">1. ¿Qué te motivó a asistir? <span className="text-red-500">*</span></p>
              <p className="text-xs text-text-secondary">Múltiple selección: Aprender AWS, Networking, Desarrollar habilidades, Quiero ser speaker, etc.</p>
            </div>

            <div className="p-3 bg-surface border border-border rounded-lg">
              <p className="text-sm font-medium text-text-primary mb-1">2. ¿Es tu primera vez en AWS UG Puebla? <span className="text-red-500">*</span></p>
              <p className="text-xs text-text-secondary">Selección única: Sí / No</p>
            </div>

            <div className="p-3 bg-surface border border-border rounded-lg">
              <p className="text-sm font-medium text-text-primary mb-1">3. ¿Cómo te enteraste del evento?</p>
              <p className="text-xs text-text-secondary">Múltiple selección: Redes sociales, Amigos, Email, etc. (Opcional)</p>
            </div>
          </div>
        </div>

        {/* Info helper */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-800">
              Puedes personalizar, agregar o eliminar preguntas después en la sección de gestión del evento
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleAddDefaultQuestions}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Agregando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sí, Agregar Preguntas
              </>
            )}
          </Button>
          
          <Button
            onClick={handleSkipQuestions}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            Ahora No
          </Button>
        </div>
      </div>
    );
  }

    return null;
  }
