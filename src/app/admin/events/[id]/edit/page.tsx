'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, Save, X, Calendar, MapPin, Users, Image as ImageIcon, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];

interface EventFormData {
  title: string;
  description: string;
  slug: string;
  eventType: 'TALK' | 'WORKSHOP' | 'MEETUP' | 'NETWORKING';
  topics: string[];
  startDate: string;
  endDate: string;
  timezone: string;
  location: string;
  locationAddress: string;
  isVirtual: boolean;
  virtualLink: string;
  maxAttendees: number | null;
  isUnlimited: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  coverImageUrl: string;
  speakerBio: string;
  speakerAvatar: string;
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, isAdmin } = useAuth();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState('');

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    slug: '',
    eventType: 'TALK',
    topics: [],
    startDate: '',
    endDate: '',
    timezone: 'America/Mexico_City',
    location: '',
    locationAddress: '',
    isVirtual: false,
    virtualLink: '',
    maxAttendees: null,
    isUnlimited: false,
    status: 'DRAFT',
    coverImageUrl: '',
    speakerBio: '',
    speakerAvatar: '',
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (eventId && isAdmin) {
      loadEvent();
    }
  }, [eventId, isAdmin]);

  async function loadEvent() {
    try {
      setIsLoading(true);
      setError(null);

      const { data: eventData, errors: eventErrors } = await client.models.Event.get({ id: eventId });
      
      if (eventErrors || !eventData) {
        setError('Evento no encontrado');
        return;
      }

      setEvent(eventData);

      // Poblar formulario con datos del evento
      setFormData({
        title: eventData.title || '',
        description: eventData.description || '',
        slug: eventData.slug || '',
        eventType: eventData.eventType || 'TALK',
        topics: (eventData.topics || []).filter((topic): topic is string => topic !== null),
        startDate: eventData.startDate ? new Date(eventData.startDate).toISOString().slice(0, 16) : '',
        endDate: eventData.endDate ? new Date(eventData.endDate).toISOString().slice(0, 16) : '',
        timezone: eventData.timezone || 'America/Mexico_City',
        location: eventData.location || '',
        locationAddress: eventData.locationAddress || '',
        isVirtual: eventData.isVirtual || false,
        virtualLink: eventData.virtualLink || '',
        maxAttendees: eventData.maxAttendees || null,
        isUnlimited: eventData.isUnlimited || false,
        status: eventData.status || 'DRAFT',
        coverImageUrl: eventData.coverImageUrl || '',
        speakerBio: eventData.speakerBio || '',
        speakerAvatar: eventData.speakerAvatar || '',
      });
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }

  const handleInputChange = (field: keyof EventFormData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
  };

  const handleAddTopic = () => {
    if (newTopic.trim() && !formData.topics.includes(newTopic.trim())) {
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, newTopic.trim()]
      }));
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topicToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validaciones básicas
      if (!formData.title.trim()) {
        setError('El título es requerido');
        return;
      }

      if (!formData.description.trim()) {
        setError('La descripción es requerida');
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError('Las fechas son requeridas');
        return;
      }

      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio');
        return;
      }

      if (!formData.isVirtual && !formData.location.trim()) {
        setError('La ubicación es requerida para eventos presenciales');
        return;
      }

      if (formData.isVirtual && !formData.virtualLink.trim()) {
        setError('El link virtual es requerido para eventos virtuales');
        return;
      }

      // Actualizar evento
      const { errors: updateErrors } = await client.models.Event.update({
        id: eventId,
        title: formData.title,
        description: formData.description,
        slug: formData.slug,
        eventType: formData.eventType,
        topics: formData.topics,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        timezone: formData.timezone,
        location: formData.location,
        locationAddress: formData.locationAddress,
        isVirtual: formData.isVirtual,
        virtualLink: formData.virtualLink || null,
        maxAttendees: formData.isUnlimited ? null : formData.maxAttendees,
        isUnlimited: formData.isUnlimited,
        status: formData.status,
        coverImageUrl: formData.coverImageUrl || null,
        speakerBio: formData.speakerBio || null,
        speakerAvatar: formData.speakerAvatar || null,
        updatedAt: new Date().toISOString(),
      });

      if (updateErrors) {
        console.error('Update errors:', updateErrors);
        setError('Error al actualizar el evento');
        return;
      }

      setSuccessMessage('✅ Evento actualizado correctamente');
      
      // Recargar evento actualizado
      await loadEvent();

      // Scroll to top para ver el mensaje
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Error al actualizar el evento');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Error</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button variant="accent" onClick={() => router.back()}>
            Regresar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Regresar</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Editar Evento</h1>
              <p className="text-sm text-text-secondary">{event?.title}</p>
            </div>
            <Badge variant={formData.status === 'PUBLISHED' ? 'success' : 'default'}>
              {formData.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200 text-sm font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && event && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Información Básica
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Título del Evento *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ej: Introducción a AWS Lambda"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Slug (URL) *
                </label>
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="intro-aws-lambda-2024"
                  required
                />
                <p className="text-xs text-text-secondary mt-1">
                  URL: /events/{formData.slug || 'slug-del-evento'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Descripción *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[150px]"
                  placeholder="Describe el evento..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Tipo de Evento *
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => handleInputChange('eventType', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="TALK">Talk</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="MEETUP">Meetup</option>
                  <option value="NETWORKING">Networking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Estado *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="COMPLETED">Completado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Fecha y Hora
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Fecha y Hora de Inicio *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Fecha y Hora de Fin *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Zona Horaria
                </label>
                <Input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  placeholder="America/Mexico_City"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              Ubicación
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onChange={(e) => handleInputChange('isVirtual', e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-accent"
                />
                <label htmlFor="isVirtual" className="text-sm font-medium text-text-primary">
                  Evento Virtual
                </label>
              </div>

              {formData.isVirtual ? (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Link Virtual (Zoom, Meet, etc.) *
                  </label>
                  <Input
                    type="url"
                    value={formData.virtualLink}
                    onChange={(e) => handleInputChange('virtualLink', e.target.value)}
                    placeholder="https://zoom.us/j/123456789"
                    required={formData.isVirtual}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Nombre del Lugar *
                    </label>
                    <Input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Ej: Centro de Innovación BUAP"
                      required={!formData.isVirtual}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Dirección Completa
                    </label>
                    <Input
                      type="text"
                      value={formData.locationAddress}
                      onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                      placeholder="Calle, número, colonia, ciudad"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Capacidad */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Capacidad
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isUnlimited"
                  checked={formData.isUnlimited}
                  onChange={(e) => handleInputChange('isUnlimited', e.target.checked)}
                  className="w-4 h-4 text-accent rounded focus:ring-accent"
                />
                <label htmlFor="isUnlimited" className="text-sm font-medium text-text-primary">
                  Capacidad Ilimitada
                </label>
              </div>

              {!formData.isUnlimited && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Máximo de Asistentes
                  </label>
                  <Input
                    type="number"
                    value={formData.maxAttendees || ''}
                    onChange={(e) => handleInputChange('maxAttendees', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="50"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Temas/Topics */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent" />
              Temas
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  placeholder="Agregar tema (ej: Lambda, Serverless, etc.)"
                />
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={handleAddTopic}
                >
                  Agregar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.topics.map((topic) => (
                  <Badge key={topic} variant="default">
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(topic)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-surface rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-accent" />
              Imágenes y Media
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  URL de Imagen de Portada
                </label>
                <Input
                  type="url"
                  value={formData.coverImageUrl}
                  onChange={(e) => handleInputChange('coverImageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  URL de Avatar del Speaker
                </label>
                <Input
                  type="url"
                  value={formData.speakerAvatar}
                  onChange={(e) => handleInputChange('speakerAvatar', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Biografía del Speaker
                </label>
                <textarea
                  value={formData.speakerBio}
                  onChange={(e) => handleInputChange('speakerBio', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[100px]"
                  placeholder="Breve biografía del speaker..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="accent"
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
