'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import { getUrl } from 'aws-amplify/storage';
import type { Schema } from '@/../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];

interface RegistrationQuestion {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

export default function EventRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const slug = params?.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | boolean | string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=/events/${slug}/register`);
    }
  }, [authLoading, isAuthenticated, router, slug]);

  const loadEventAndQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar evento por slug
      const { data: events, errors: eventErrors } = await client.models.Event.list({
        filter: { slug: { eq: slug } }
      });

      if (eventErrors || !events || events.length === 0) {
        setError('Evento no encontrado');
        return;
      }

      const eventData = events[0];
      
      // Verificar si el evento est\u00e1 lleno (antes de establecer el state)
      if (!eventData.isUnlimited && eventData.maxAttendees) {
        const currentCount = eventData.goingCount || 0;
        if (currentCount >= eventData.maxAttendees) {
          setError('Este evento ya alcanz\u00f3 su capacidad m\u00e1xima. No se pueden realizar m\u00e1s registros.');
          setEvent(eventData); // Establecer el evento para mostrar informaci\u00f3n
          setIsLoading(false);
          return;
        }
      }
      
      setEvent(eventData);

      // Cargar cover image URL
      if (eventData.coverImageUrl) {
        loadCoverImage(eventData.coverImageUrl);
      }

      // Cargar preguntas de registro
      if (eventData.registrationQuestions) {
        try {
          const loadedQuestions = typeof eventData.registrationQuestions === 'string'
            ? JSON.parse(eventData.registrationQuestions)
            : eventData.registrationQuestions;
          setQuestions((loadedQuestions as RegistrationQuestion[]).sort((a, b) => a.order - b.order));
        } catch (parseError) {
          console.error('Error parsing questions:', parseError);
          setQuestions([]);
        }
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  async function loadCoverImage(imagePath: string) {
    try {
      const urlResult = await getUrl({
        path: imagePath,
        options: {
          expiresIn: 3600 // 1 hora
        }
      });
      setCoverImageUrl(urlResult.url.toString());
    } catch (err) {
      console.warn('Error loading cover image URL:', err);
      setCoverImageUrl(null);
    }
  }

  const checkIfAlreadyRegistered = useCallback(async () => {
    if (!user?.userId || !event?.id) return;

    try {
      const { data: registrations } = await client.models.EventRegistration.list({
        filter: {
          and: [
            { eventId: { eq: event.id } },
            { userId: { eq: user.userId } }
          ]
        }
      });

      if (registrations && registrations.length > 0) {
        setIsRegistered(true);
      }
    } catch (err) {
      console.error('Error checking registration:', err);
    }
  }, [user?.userId, event?.id]);

  useEffect(() => {
    if (slug && isAuthenticated) {
      loadEventAndQuestions();
      checkIfAlreadyRegistered();
    }
  }, [slug, isAuthenticated, loadEventAndQuestions, checkIfAlreadyRegistered]);

  const handleAnswerChange = (questionId: string, value: string | boolean | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const currentAnswer = answers[questionId];
    const currentValues = Array.isArray(currentAnswer) ? currentAnswer : [];
    let newValues: string[];

    if (checked) {
      newValues = [...currentValues, option];
    } else {
      newValues = currentValues.filter((v: string) => v !== option);
    }

    handleAnswerChange(questionId, newValues);
  };

  const validateForm = (): boolean => {
    // Validar campos requeridos
    for (const question of questions) {
      if (question.required) {
        const answer = answers[question.id];

        if (!answer) {
          setError(`Por favor completa el campo: ${question.label}`);
          return false;
        }

        if (question.type === 'checkbox' && Array.isArray(answer) && answer.length === 0) {
          setError(`Por favor selecciona al menos una opción en: ${question.label}`);
          return false;
        }

        if (typeof answer === 'string' && answer.trim() === '') {
          setError(`Por favor completa el campo: ${question.label}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event || !event.id || !user?.userId) return;

    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // VALIDACIÓN FINAL: Verificar capacidad del evento antes de crear el registro
      // Obtener el evento actualizado para tener el conteo más reciente
      const { data: currentEvent } = await client.models.Event.get({ id: event.id });
      
      if (currentEvent && !currentEvent.isUnlimited && currentEvent.maxAttendees) {
        const currentCount = currentEvent.goingCount || 0;
        if (currentCount >= currentEvent.maxAttendees) {
          setError('Lo sentimos, este evento alcanzó su capacidad máxima mientras completabas el registro.');
          return;
        }
      }

      // Obtener el perfil completo del usuario para el nombre real
      const { data: userProfile } = await client.models.User.get({ id: user.userId });
      const fullName = userProfile 
        ? `${userProfile.givenName} ${userProfile.familyName}`.trim()
        : user.signInDetails?.loginId || user.username || 'Usuario';
      const email = userProfile?.email || user.signInDetails?.loginId || '';

      // Crear registro SIN el QR token
      // El QR se generará automáticamente cuando el usuario vea los detalles del evento
      const { data: registration, errors: regErrors } = await client.models.EventRegistration.create({
        eventId: event.id,
        userId: user.userId,
        status: 'GOING',
        registeredAt: new Date().toISOString(),
        userName: fullName,
        userEmail: email,
        registrationAnswers: JSON.stringify(answers),
        checkedIn: false,
        owner: user.userId, // ✅ Asignar owner explícitamente
      });

      if (regErrors || !registration || !registration.id) {
        console.error('❌ Registration errors:', regErrors);
        setError('Error al registrar. Por favor intenta de nuevo.');
        return;
      }


      // Actualizar contador de registros en el evento
      const newGoingCount = (event.goingCount || 0) + 1;
      await client.models.Event.update({
        id: event.id,
        goingCount: newGoingCount,
      });

      setIsRegistered(true);
    } catch (err) {
      console.error('Error submitting registration:', err);
      setError('Error al registrar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Error</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button variant="accent" onClick={() => router.push(`/events/${slug}`)}>
            Volver al evento
          </Button>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">¡Registro Exitoso! 🎉</h1>
          <p className="text-text-secondary mb-8">
            Te has registrado correctamente para <strong>{event?.title}</strong>
          </p>

          <div className="bg-surface rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-text-primary mb-4">¿Qué sigue?</h3>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5"><Check className="w-3 h-3" /></span>
                <span>Recibirás un email de confirmación con los detalles del evento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5"><Check className="w-3 h-3" /></span>
                <span>Tu código QR para check-in estará disponible en tu perfil</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5"><Check className="w-3 h-3" /></span>
                <span>Te notificaremos cualquier actualización del evento</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="accent" onClick={() => router.push(`/events/${slug}`)}>
              Ver detalles del evento
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/events/${slug}`)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Volver al evento</span>
          </button>

          <h1 className="text-3xl font-bold text-text-primary mb-2">Registro al Evento</h1>
          <p className="text-lg text-text-secondary">{event?.title}</p>
        </div>

        {/* Event Info Card */}
        {coverImageUrl && (
          <div className="bg-surface rounded-xl overflow-hidden mb-8 border border-border">
            <div className="relative h-48 w-full">
              <Image
                src={coverImageUrl}
                alt={event?.title || 'Event'}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-text-primary mb-6">
              Información de Registro
            </h2>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">
                  Este evento no requiere información adicional para el registro.
                </p>
                <p className="text-sm text-text-secondary">
                  Puedes confirmar tu asistencia directamente.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question) => (
                  <div key={question.id}>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      {question.label}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {question.type === 'textarea' ? (
                      <textarea
                        value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        required={question.required}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-h-[120px] resize-y"
                      />
                    ) : question.type === 'select' ? (
                      <select
                        value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        required={question.required}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Selecciona una opción...</option>
                        {(question.options || []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : question.type === 'checkbox' ? (
                      <div className="space-y-3">
                        {(question.options || []).map((option) => (
                          <label key={option} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).includes(option) : false}
                              onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                              className="w-4 h-4 text-accent rounded focus:ring-accent"
                            />
                            <span className="text-sm text-text-primary group-hover:text-accent transition-colors">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        type={question.type}
                        value={typeof answers[question.id] === 'string' ? answers[question.id] as string : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        required={question.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="accent"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Confirmar Registro'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/events/${slug}`)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>

          {/* Privacy Notice */}
          <p className="text-xs text-text-secondary text-center">
            Al registrarte, aceptas compartir tu información con AWS User Group Puebla para fines del evento.
            Tus datos serán tratados de acuerdo con nuestra política de privacidad.
          </p>
        </form>
      </div>
    </div>
  );
}
