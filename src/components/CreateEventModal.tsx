'use client';

import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, Calendar, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Label from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import DateSelector from '@/components/common/DateSelector';
import CoverImageUpload from '@/components/common/CoverImageUpload';
import LocationSelector from '@/components/common/LocationSelector';

const client = generateClient<Schema>();

type TalkProposal = Schema['TalkProposal']['type'];

interface CreateEventModalProps {
  proposal: TalkProposal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 📅 Modal: Crear Evento desde Propuesta Aprobada
 * 
 * Toma los datos de una TalkProposal aprobada y permite crear un Event.
 * Los datos del speaker se pre-llenan automáticamente.
 */
export default function CreateEventModal({
  proposal,
  isOpen,
  onClose,
  onSuccess,
}: CreateEventModalProps) {
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState(proposal.title || '');
  const [description, setDescription] = useState(proposal.description || '');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [duration, setDuration] = useState(proposal.duration || 60);
  const [locationData, setLocationData] = useState<{
    location: string;
    locationAddress?: string;
    locationMapsUrl?: string;
  }>({
    location: '',
    locationAddress: '',
    locationMapsUrl: undefined,
  });
  const [maxAttendees, setMaxAttendees] = useState<number | null>(50);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validaciones
    if (!title.trim() || !description.trim() || !startDate || !locationData.location.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Construir datetime ISO
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      // Crear slug
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + `-${Date.now()}`;

      // Crear evento
      const { data: createdEvent, errors } = await client.models.Event.create({
        title: title.trim(),
        description: description.trim(),
        slug,
        talkProposalId: proposal.id,
        speakerId: proposal.userId,
        speakerName: proposal.speakerName,
        speakerEmail: proposal.speakerEmail,
        eventType: 'TALK',
        topics: proposal.topics || [],
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        timezone: 'America/Mexico_City',
        location: locationData.location.trim(),
        locationAddress: locationData.locationAddress?.trim() || undefined,
        locationMapsUrl: locationData.locationMapsUrl?.trim() || undefined,
        isVirtual: false,
        maxAttendees: isUnlimited ? null : maxAttendees,
        isUnlimited,
        status: 'DRAFT',
        isPublic: true,
        requiresApproval: false,
        createdBy: user.userId,
        createdAt: new Date().toISOString(),
        coverImageUrl: coverImageUrl || undefined, // Agregar cover image URL si existe
        goingCount: 0,
        checkedInCount: 0,
        invitedCount: 0,
        notGoingCount: 0,
      });

      if (errors && errors.length > 0) {
        console.error('Errors creating event:', errors);
        setError('Error al crear el evento');
        return;
      }

      // Actualizar propuesta con eventId y status
      if (createdEvent?.id) {
        await client.models.TalkProposal.update({
          id: proposal.id,
          status: 'EVENT_CREATED',
          eventId: createdEvent.id,
        });
      }

      // Éxito
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Error al crear el evento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full p-6 theme-transition">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary">
            Crear Evento
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info de la propuesta */}
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-text-secondary mb-2">
            Creando evento desde propuesta:
          </p>
          <p className="font-semibold text-text-primary mb-1">
            {proposal.title}
          </p>
          <p className="text-sm text-text-secondary">
            Por: {proposal.speakerName}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <Label htmlFor="title">Título del Evento *</Label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary theme-transition"
              required
              maxLength={100}
            />
            <p className="text-xs text-text-secondary mt-1">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1"
              required
              maxLength={1000}
            />
            <p className="text-xs text-text-secondary mt-1">
              {description.length}/1000 caracteres
            </p>
          </div>

          {/* Fecha y Hora con DateSelector Unificado */}
          <div>
            <DateSelector
              adminMode={true}
              selectedDateString={startDate}
              selectedTime={startTime}
              onDateChange={setStartDate}
              onTimeChange={setStartTime}
              currentProposalId={proposal.id ?? undefined}
              disabled={isProcessing}
              showTimeInput={true}
            />
          </div>

          {/* Duración */}
          <div>
            <Label htmlFor="duration">Duración (minutos) *</Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary theme-transition"
              required
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1.5 horas</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          {/* Ubicación */}
          <div>
            <Label>Ubicación *</Label>
            <div className="mt-1">
              <LocationSelector
                value={locationData}
                onChange={setLocationData}
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Capacidad */}
          <div>
            <Label>Capacidad de Asistentes</Label>
            <div className="mt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => setIsUnlimited(e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-2 focus:ring-accent"
                />
                <span className="text-sm text-text-primary">
                  Sin límite de asistentes
                </span>
              </label>

              {!isUnlimited && (
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
                  <input
                    type="number"
                    value={maxAttendees || ''}
                    onChange={(e) => setMaxAttendees(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Ej: 50"
                    min={1}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text-primary theme-transition"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cover Image Upload - Agregado en Fase 2 */}
          <div>
            <CoverImageUpload
              onImageSelected={(file, previewUrl) => {
                setCoverImageUrl(previewUrl);
              }}
              onImageRemoved={() => setCoverImageUrl(null)}
              onError={(error) => setError(error)}
              disabled={isProcessing}
              autoUpload={false}
              compact={false}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Crear Evento
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
