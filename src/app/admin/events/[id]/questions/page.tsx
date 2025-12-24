'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, Plus, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';


const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];

interface RegistrationQuestion {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Para select y checkbox
  order: number;
}

export default function RegistrationQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading, isAdmin } = useAuth();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado para nuevo campo de opción
  const [newOptionValue, setNewOptionValue] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (eventId && isAdmin) {
      loadEvent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Cargar preguntas desde el campo JSON o usar preguntas por defecto
      if (eventData.registrationQuestions) {
        try {
          const loadedQuestions = typeof eventData.registrationQuestions === 'string' 
            ? JSON.parse(eventData.registrationQuestions) 
            : eventData.registrationQuestions;
          setQuestions(loadedQuestions as RegistrationQuestion[]);
        } catch (parseError) {
          console.error('Error parsing questions:', parseError);
          setQuestions([]);
        }
      } else {
        // Preguntas por defecto si no hay ninguna guardada
        const defaultQuestions: RegistrationQuestion[] = [
          {
            id: '1',
            type: 'checkbox',
            label: '¿Qué te motivó a asistir a este evento?',
            required: true,
            options: ['Aprender sobre AWS y Cloud Computing', 'Conocer personas del sector tecnológico', 'Desarrollar habilidades tecnológicas', 'Networking profesional', 'Quiero ser speaker', 'Contenido interesante', 'Otro'],
            order: 1
          },
          {
            id: '2',
            type: 'select',
            label: '¿Es tu primera vez en un evento de AWS User Group Puebla?',
            options: ['Sí, es mi primera vez', 'No, he asistido antes'],
            required: true,
            order: 2
          },
          {
            id: '3',
            type: 'checkbox',
            label: '¿Cómo te enteraste del evento?',
            options: ['Redes sociales', 'Amigos o colegas', 'Email newsletter', 'Sitio web de AWS UG Puebla', 'Universidad', 'Trabajo', 'Otro'],
            required: false,
            order: 3
          }
        ];
        setQuestions(defaultQuestions);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Error al cargar el evento');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddQuestion = () => {
    const newQuestion: RegistrationQuestion = {
      id: Date.now().toString(),
      type: 'text',
      label: 'Nueva pregunta',
      placeholder: '',
      required: false,
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleUpdateQuestion = (questionId: string, field: keyof RegistrationQuestion, value: string | boolean | string[]) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handleAddOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const newOption = newOptionValue[questionId]?.trim();
    if (!newOption) return;

    const updatedOptions = [...(question.options || []), newOption];
    handleUpdateQuestion(questionId, 'options', updatedOptions);
    setNewOptionValue({ ...newOptionValue, [questionId]: '' });
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;

    const updatedOptions = question.options.filter((_, idx) => idx !== optionIndex);
    handleUpdateQuestion(questionId, 'options', updatedOptions);
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    // Actualizar order
    newQuestions.forEach((q, idx) => {
      q.order = idx + 1;
    });

    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Guardar las preguntas en el campo JSON del evento
      const { errors: updateErrors } = await client.models.Event.update({
        id: eventId,
        registrationQuestions: JSON.stringify(questions),
      });

      if (updateErrors) {
        console.error('Update errors:', updateErrors);
        setError('Error al guardar las preguntas');
        return;
      }

      setSuccessMessage('✅ Preguntas guardadas correctamente');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error saving questions:', err);
      setError('Error al guardar las preguntas');
    } finally {
      setIsSaving(false);
    }
  };



  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Cargando preguntas...</p>
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

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">Preguntas de Registro</h1>
              <p className="text-sm text-text-secondary">{event?.title}</p>
            </div>
            <Button variant="accent" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 Estas preguntas aparecerán cuando los usuarios hagan clic en &quot;Registro&quot; para este evento.
            </p>
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

        {/* Questions List */}
        <div className="space-y-4 mb-6">
          {questions.length === 0 ? (
            <div className="bg-surface rounded-xl p-8 text-center border-2 border-dashed border-border">
              <p className="text-text-secondary mb-4">Aún no hay preguntas de registro</p>
              <Button variant="accent" size="sm" onClick={handleAddQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primera pregunta
              </Button>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="bg-surface rounded-xl p-6 border border-border">
                {/* Question Header */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      onClick={() => handleMoveQuestion(question.id, 'up')}
                      disabled={index === 0}
                      className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <GripVertical className="w-4 h-4 text-text-secondary" />
                    <button
                      onClick={() => handleMoveQuestion(question.id, 'down')}
                      disabled={index === questions.length - 1}
                      className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Question Number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">{index + 1}</span>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 space-y-4">
                    {/* Label */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Pregunta *
                      </label>
                      <Input
                        type="text"
                        value={question.label}
                        onChange={(e) => handleUpdateQuestion(question.id, 'label', e.target.value)}
                        placeholder="Ej: ¿Cuál es tu nivel de experiencia con AWS?"
                      />
                    </div>

                    {/* Type and Required */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Tipo de respuesta
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) => handleUpdateQuestion(question.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="text">Texto corto</option>
                          <option value="textarea">Texto largo</option>
                          <option value="email">Email</option>
                          <option value="phone">Teléfono</option>
                          <option value="select">Selección única</option>
                          <option value="checkbox">Casillas múltiples</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => handleUpdateQuestion(question.id, 'required', e.target.checked)}
                            className="w-4 h-4 text-accent rounded focus:ring-accent"
                          />
                          <span className="text-sm text-text-primary">Obligatoria</span>
                        </label>
                      </div>
                    </div>

                    {/* Placeholder (solo para text, email, phone, textarea) */}
                    {['text', 'email', 'phone', 'textarea'].includes(question.type) && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Placeholder (opcional)
                        </label>
                        <Input
                          type="text"
                          value={question.placeholder || ''}
                          onChange={(e) => handleUpdateQuestion(question.id, 'placeholder', e.target.value)}
                          placeholder="Texto de ejemplo para el usuario"
                        />
                      </div>
                    )}

                    {/* Options (para select y checkbox) */}
                    {(question.type === 'select' || question.type === 'checkbox') && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-2">
                          Opciones
                        </label>
                        
                        {/* Lista de opciones existentes */}
                        <div className="space-y-2 mb-3">
                          {(question.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="text-text-secondary text-sm">•</span>
                              <Input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(question.options || [])];
                                  newOptions[optIndex] = e.target.value;
                                  handleUpdateQuestion(question.id, 'options', newOptions);
                                }}
                                className="flex-1"
                              />
                              <button
                                onClick={() => handleRemoveOption(question.id, optIndex)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Agregar nueva opción */}
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={newOptionValue[question.id] || ''}
                            onChange={(e) => setNewOptionValue({ ...newOptionValue, [question.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption(question.id))}
                            placeholder="Nueva opción..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOption(question.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Question Button */}
        {questions.length > 0 && (
          <Button variant="outline" onClick={handleAddQuestion} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar pregunta
          </Button>
        )}

        {/* Preview */}
        {questions.length > 0 && (
          <div className="mt-8 bg-surface rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Vista Previa</h3>
            <p className="text-sm text-text-secondary mb-6">
              Así verán los participantes el formulario de registro:
            </p>

            <div className="space-y-4 bg-background p-6 rounded-lg">
              {questions.map((question) => (
                <div key={question.id}>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === 'textarea' ? (
                    <textarea
                      placeholder={question.placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary min-h-[100px] resize-none"
                      disabled
                    />
                  ) : question.type === 'select' ? (
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary"
                      disabled
                    >
                      <option>Selecciona una opción...</option>
                      {(question.options || []).map((opt, idx) => (
                        <option key={idx}>{opt}</option>
                      ))}
                    </select>
                  ) : question.type === 'checkbox' ? (
                    <div className="space-y-2">
                      {(question.options || []).map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="w-4 h-4" />
                          <span className="text-sm text-text-primary">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input
                      type={question.type}
                      placeholder={question.placeholder}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
