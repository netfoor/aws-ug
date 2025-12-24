'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { getFullName } from '@/hooks/useUserData';
import { 
  Loader2, 
  X,
  ArrowLeft,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import Link from 'next/link';
import DateSelector from '@/components/common/DateSelector';
import CoverImageUpload from '@/components/common/CoverImageUpload';

type SpeakerApplication = Schema['SpeakerApplication']['type'];

/**
 * 📅 Admin: Crear Evento desde Cero
 * 
 * Form completo para que admin cree eventos sin necesidad de propuesta.
 * Incluye:
 * - Selección de speaker (buscar en usuarios con rol SPEAKER)
 * - Upload de cover image optimizada a S3
 * - Todos los campos del evento
 */
export default function CreateEventPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const client = generateClient<Schema>();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'TALK' | 'WORKSHOP' | 'MEETUP' | 'NETWORKING'>('TALK');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  
  // Fecha y ubicación
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('18:30');
  const [duration, setDuration] = useState(45);
  const [location, setLocation] = useState('Oficinas de AWS User Group Puebla');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  
  // Capacidad
  const [maxAttendees, setMaxAttendees] = useState<number>(50);
  
  // Speaker
  const [speakers, setSpeakers] = useState<SpeakerApplication[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);
  
  // Cover image - simplificado con el componente
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  // Estado
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  const loadSpeakers = useCallback(async () => {
    try {
      setLoadingSpeakers(true);
      
      // Obtener speakers aprobados de SpeakerApplication
      // Nota: SpeakerApplication solo tiene userId y email, no nombre ni avatar
      // Los datos completos estarán en la User table cuando el usuario edite su perfil
      const { data: approvedApplications } = await client.models.SpeakerApplication.list({
        filter: {
          status: { eq: 'APPROVED' }
        }
      });
      
      if (approvedApplications) {
        // Por ahora mostramos lo que tenemos (userId y email)
        // El nombre se obtendrá de Cognito en el momento de crear el evento
        setSpeakers(approvedApplications);
      }
    } catch (err) {
      console.error('Error cargando speakers:', err);
      setError('Error al cargar la lista de speakers');
    } finally {
      setLoadingSpeakers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  const handleAddTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    // Validaciones
    if (!title.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!description.trim()) {
      setError('La descripción es requerida');
      return;
    }
    if (!selectedSpeakerId) {
      setError('Debes seleccionar un speaker');
      return;
    }
    if (!startDate) {
      setError('La fecha es requerida');
      return;
    }
    if (!location.trim() && !isVirtual) {
      setError('La ubicación es requerida (o marca como virtual)');
      return;
    }
    if (isVirtual && !virtualLink.trim()) {
      setError('El link virtual es requerido');
      return;
    }
    if (topics.length === 0) {
      setError('Agrega al menos un tema/tag');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // PASO 1: Crear evento usando el endpoint
      const response = await fetch('/api/admin/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          eventType,
          topics,
          eventDate: startDate,
          eventTime: startTime,
          duration,
          location: location.trim(),
          isVirtual,
          virtualLink: isVirtual ? virtualLink.trim() : undefined,
          maxAttendees,
          selectedSpeakerId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear evento');
      }

      console.log('✅ Evento creado:', result.event);

      // PASO 2: Si hay imagen, subirla ahora con el eventId real
      if (selectedImageFile && result.event.id) {
        console.log('📸 Subiendo imagen con eventId:', result.event.id);
        try {
          const { uploadData } = await import('aws-amplify/storage');
          const fileName = `events/${result.event.id}/cover-${Date.now()}.webp`;
          
          const uploadResult = await uploadData({
            path: fileName,
            data: selectedImageFile,
            options: {
              contentType: 'image/webp',
            }
          }).result;
          
          console.log('✅ Imagen subida:', uploadResult.path);
          
          // PASO 3: Actualizar evento con la coverImageUrl
          await client.models.Event.update({
            id: result.event.id,
            coverImageUrl: uploadResult.path,
          });

          console.log('✅ Evento actualizado con imagen');
        } catch (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          // No bloquear si falla la imagen
        }
      }

      // Redirigir al evento creado
      router.push(`/events/${result.event.slug}`);

    } catch (err) {
      console.error('Error creando evento:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el evento');
      setIsProcessing(false);
    }
  };

  // Loading state
  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/admin/events" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary theme-transition mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a eventos</span>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Crear Nuevo Evento</h1>
          <p className="text-text-secondary mt-2">Crea un evento desde cero sin necesidad de propuesta</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Información Básica */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Información Básica</h2>
            
            {/* Título */}
            <div>
              <Label htmlFor="title">Título del Evento *</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej: Introducción a AWS Lambda"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe de qué trata el evento, qué aprenderán los asistentes..."
                rows={5}
                required
              />
            </div>

            {/* Tipo de evento */}
            <div>
              <Label htmlFor="eventType">Tipo de Evento *</Label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as 'TALK' | 'WORKSHOP' | 'MEETUP' | 'NETWORKING')}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="TALK">Charla/Talk</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="MEETUP">Meetup</option>
                <option value="NETWORKING">Networking</option>
              </select>
            </div>

            {/* Topics/Tags */}
            <div>
              <Label htmlFor="topicInput">Temas/Tags *</Label>
              <div className="flex gap-2">
                <Input
                  id="topicInput"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  placeholder="ej: AWS, Lambda, Serverless"
                />
                <Button type="button" variant="outline" onClick={handleAddTopic}>
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(topic)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Speaker */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Speaker</h2>
            
            <div>
              <Label htmlFor="speaker">Seleccionar Speaker *</Label>
              {loadingSpeakers ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando speakers...</span>
                </div>
              ) : speakers.length === 0 ? (
                <div className="text-text-secondary text-sm">
                  No hay speakers disponibles. Los speakers deben tener su aplicación aprobada.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Lista de speakers como cards seleccionables */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {speakers.map((speakerApp) => (
                      <button
                        key={speakerApp.id}
                        type="button"
                        onClick={() => setSelectedSpeakerId(speakerApp.id || '')}
                        className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                          selectedSpeakerId === speakerApp.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Avatar - Iniciales del email */}
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center ${
                              selectedSpeakerId === speakerApp.id
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                                : ''
                            }`}>
                              <span className="text-primary text-base sm:text-lg font-semibold">
                                {speakerApp.email?.[0]?.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-text-primary break-words text-sm sm:text-base">
                              {speakerApp.email}
                            </h3>
                            <p className="text-xs text-text-secondary truncate hidden sm:block">
                              ID: {speakerApp.userId?.substring(0, 20)}...
                            </p>
                            {speakerApp.motivation && (
                              <p className="text-xs sm:text-sm text-text-secondary mt-1 line-clamp-2">
                                {speakerApp.motivation}
                              </p>
                            )}
                          </div>

                          {/* Checkmark si está seleccionado */}
                          {selectedSpeakerId === speakerApp.id && (
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fecha y Horario */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Fecha y Horario</h2>
            
            {/* DateSelector Unificado en modo admin */}
            <DateSelector
              adminMode={true}
              selectedDateString={startDate}
              selectedTime={startTime}
              onDateChange={setStartDate}
              onTimeChange={setStartTime}
              currentProposalId="new-event"
              disabled={isProcessing}
              showTimeInput={true}
            />
            
            <div className="mt-4">
              <Label htmlFor="duration">Duración (minutos) *</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={15}
                step={15}
                required
                placeholder="60"
              />
              <p className="text-xs text-text-secondary mt-1">
                Duración típica: 45-60 minutos
              </p>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Ubicación</h2>
            
            {/* Checkbox Virtual */}
            <div className="flex items-center gap-2">
              <input
                id="isVirtual"
                type="checkbox"
                checked={isVirtual}
                onChange={(e) => setIsVirtual(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-border rounded"
              />
              <Label htmlFor="isVirtual" className="mb-0">Evento virtual</Label>
            </div>

            {isVirtual ? (
              <div>
                <Label htmlFor="virtualLink">Link del evento virtual *</Label>
                <Input
                  id="virtualLink"
                  type="url"
                  value={virtualLink}
                  onChange={(e) => setVirtualLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx o https://zoom.us/j/xxx"
                  required={isVirtual}
                />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="location">Lugar *</Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ej: WeWork Angelópolis"
                    required={!isVirtual}
                  />
                </div>
              </>
            )}
          </div>

          {/* Capacidad */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Capacidad</h2>
            
            <div>
              <Label htmlFor="maxAttendees">Máximo de asistentes *</Label>
              <Input
                id="maxAttendees"
                type="number"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          {/* Cover Image - Ahora usa el componente unificado */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Imagen de portada</h2>
            
            <CoverImageUpload
              onImageSelected={(file, previewUrl) => {
                console.log('📸 Imagen seleccionada:', file.name);
                setSelectedImageFile(file);
                setImagePreviewUrl(previewUrl);
              }}
              onImageRemoved={() => {
                console.log('🗑️ Imagen removida');
                setSelectedImageFile(null);
                setImagePreviewUrl(null);
              }}
              onError={(error) => {
                console.error('❌ Error:', error);
                setError(error);
              }}
              disabled={isProcessing}
              autoUpload={false}
              compact={false}
            />
            <p className="text-xs text-text-secondary mt-2">
              La imagen se optimizará y subirá automáticamente cuando crees el evento
            </p>
            {imagePreviewUrl && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✓ Imagen lista para subir
              </p>
            )}
          </div>

          {/* Estado */}
          <div className="bg-surface rounded-lg p-6 border border-border space-y-4">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Estado</h2>
            
            <div>
              <Label htmlFor="status">Estado del evento *</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="DRAFT">Borrador (no visible)</option>
                <option value="PUBLISHED">Publicado (visible para todos)</option>
              </select>
              <p className="text-sm text-text-secondary mt-1">
                {status === 'DRAFT' 
                  ? 'El evento estará oculto hasta que lo publiques'
                  : 'El evento será visible para todos los usuarios'}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end">
            <Link href="/admin/events">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            
            <Button
              type="submit"
              variant="primary"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Evento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
