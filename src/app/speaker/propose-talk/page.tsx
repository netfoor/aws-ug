'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, Lightbulb, Users, Clock, Wrench, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const client = generateClient<Schema>();

/**
 * 🎤 Proponer Charla - Página para speakers
 * 
 * Solo usuarios con rol SPEAKER pueden acceder.
 * Permite crear propuestas de charlas que los admins revisarán.
 */
export default function ProposeTalkPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, userAttributes } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [targetAudience, setTargetAudience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL'>('ALL');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Verificar que el usuario sea SPEAKER
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && userAttributes) {
      const role = userAttributes['custom:role'] as string | undefined;
      if (role === 'SPEAKER' || role === 'ADMIN') {
        setIsSpeaker(true);
      } else {
        setIsSpeaker(false);
        setError('Solo los speakers aprobados pueden proponer charlas. Primero debes aplicar para ser speaker.');
      }
    }
  }, [authLoading, isAuthenticated, user, userAttributes]);

  // Agregar topic
  const handleAddTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  // Remover topic
  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  // Agregar equipo
  const handleAddEquipment = () => {
    if (equipmentInput.trim() && !requiredEquipment.includes(equipmentInput.trim())) {
      setRequiredEquipment([...requiredEquipment, equipmentInput.trim()]);
      setEquipmentInput('');
    }
  };

  // Remover equipo
  const handleRemoveEquipment = (equipment: string) => {
    setRequiredEquipment(requiredEquipment.filter((e) => e !== equipment));
  };

  // Submit propuesta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes estar autenticado');
      return;
    }

    if (topics.length === 0) {
      setError('Debes agregar al menos un tema');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const givenName = userAttributes?.['given_name'] as string || 'Usuario';
      const familyName = userAttributes?.['family_name'] as string || '';
      const email = userAttributes?.['email'] as string || '';

      const { data, errors } = await client.models.TalkProposal.create({
        userId: user.userId,
        speakerName: `${givenName} ${familyName}`.trim(),
        speakerEmail: email,
        title,
        description,
        topics,
        duration,
        targetAudience,
        requiredEquipment: requiredEquipment.length > 0 ? requiredEquipment : undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      });

      if (errors && errors.length > 0) {
        console.error('Errors creating proposal:', errors);
        setError('Error al crear la propuesta. Por favor intenta de nuevo.');
        return;
      }

      // Redirigir a página de éxito o dashboard
      router.push('/speaker/my-proposals?success=true');
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError('Error al enviar la propuesta. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // No es speaker
  if (!isAuthenticated || !isSpeaker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition p-4">
        <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-8 text-center theme-transition">
          <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Solo para Speakers
          </h1>
          <p className="text-text-secondary mb-6">
            {error || 'Esta página está reservada para speakers aprobados de la comunidad.'}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Volver
            </Button>
            <Button
              variant="accent"
              onClick={() => router.push('/apply-speaker')}
              className="flex-1"
            >
              Aplicar para Speaker
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-text-secondary hover:text-text-primary mb-4 inline-flex items-center gap-2 transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Proponer una Charla
          </h1>
          <p className="text-text-secondary">
            Comparte tu conocimiento con la comunidad AWS Puebla
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div className="bg-surface rounded-lg p-6 shadow theme-transition">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-text-primary">Información Básica</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título de la Charla *</Label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Introducción a AWS Lambda y Serverless"
                  className="w-full mt-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-text-secondary mt-1">{title.length}/100 caracteres</p>
              </div>

              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe de qué tratará tu charla, qué aprenderán los asistentes, y por qué es relevante..."
                  rows={6}
                  className="mt-1"
                  required
                  maxLength={1000}
                />
                <p className="text-xs text-text-secondary mt-1">{description.length}/1000 caracteres</p>
              </div>
            </div>
          </div>

          {/* Temas */}
          <div className="bg-surface rounded-lg p-6 shadow theme-transition">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-text-primary">Temas</h2>
            </div>

            <div>
              <Label htmlFor="topic">Temas que cubre la charla *</Label>
              <div className="flex gap-2 mt-1">
                <input
                  id="topic"
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  placeholder="Ej: Lambda, Serverless, DynamoDB"
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
                />
                <Button type="button" onClick={handleAddTopic} variant="outline">
                  Agregar
                </Button>
              </div>

              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent rounded-full text-sm theme-transition"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(topic)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duración y Audiencia */}
          <div className="bg-surface rounded-lg p-6 shadow theme-transition">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-text-primary">Duración y Audiencia</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duración (minutos) *</Label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full mt-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
                  required
                >
                  <option value={15}>15 minutos (Lightning Talk)</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>

              <div>
                <Label htmlFor="audience">Audiencia Objetivo *</Label>
                <select
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full mt-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
                  required
                >
                  <option value="ALL">Todos los niveles</option>
                  <option value="BEGINNER">Principiante</option>
                  <option value="INTERMEDIATE">Intermedio</option>
                  <option value="ADVANCED">Avanzado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Equipo Requerido */}
          <div className="bg-surface rounded-lg p-6 shadow theme-transition">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-text-primary">Equipo Requerido</h2>
            </div>

            <div>
              <Label htmlFor="equipment">¿Necesitas algo especial? (Opcional)</Label>
              <div className="flex gap-2 mt-1">
                <input
                  id="equipment"
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                  placeholder="Ej: Proyector, Micrófono, Pizarra"
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
                />
                <Button type="button" onClick={handleAddEquipment} variant="outline">
                  Agregar
                </Button>
              </div>

              {requiredEquipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {requiredEquipment.map((equipment) => (
                    <span
                      key={equipment}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/30 text-text-primary rounded-full text-sm theme-transition"
                    >
                      {equipment}
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(equipment)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notas Adicionales */}
          <div className="bg-surface rounded-lg p-6 shadow theme-transition">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-semibold text-text-primary">Notas Adicionales</h2>
            </div>

            <div>
              <Label htmlFor="notes">¿Algo más que debamos saber? (Opcional)</Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Preferencias de fecha, requisitos especiales, etc..."
                rows={4}
                className="mt-1"
                maxLength={500}
              />
              <p className="text-xs text-text-secondary mt-1">{additionalNotes.length}/500 caracteres</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={isSubmitting || topics.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Propuesta'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
