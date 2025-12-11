'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Loader2, Plus, X, CheckCircle, Clock, XCircle } from 'lucide-react';

const client = generateClient<Schema>();

interface SpeakerApplicationFormProps {
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export default function SpeakerApplicationForm({ 
  userId, 
  userEmail,
  onSuccess 
}: SpeakerApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [motivation, setMotivation] = useState('');
  const [topics, setTopics] = useState<string[]>(['']);
  const [experience, setExperience] = useState('');
  const [previousTalksLinks, setPreviousTalksLinks] = useState<string[]>(['']);

  const addTopicField = () => {
    setTopics([...topics, '']);
  };

  const removeTopicField = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const addLinkField = () => {
    setPreviousTalksLinks([...previousTalksLinks, '']);
  };

  const removeLinkField = (index: number) => {
    setPreviousTalksLinks(previousTalksLinks.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...previousTalksLinks];
    newLinks[index] = value;
    setPreviousTalksLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones
      if (!motivation.trim()) {
        throw new Error('La motivación es requerida');
      }

      const validTopics = topics.filter(t => t.trim());
      if (validTopics.length === 0) {
        throw new Error('Debes agregar al menos un tema');
      }

      const validLinks = previousTalksLinks.filter(l => l.trim());

      // Crear aplicación
      const result = await client.models.SpeakerApplication.create({
        userId,
        email: userEmail,
        motivation: motivation.trim(),
        topics: validTopics,
        experience: experience.trim() || undefined,
        previousTalksLinks: validLinks.length > 0 ? validLinks : undefined,
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
      });

      if (result.data) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 3000);
      } else {
        throw new Error('Error al crear la aplicación');
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Error al enviar la postulación');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900">¡Postulación Enviada!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-green-800">
            Tu postulación como Speaker ha sido recibida exitosamente.
          </CardDescription>
          <div className="rounded-lg bg-white p-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-900">📧 ¿Qué sigue?</p>
            <ul className="space-y-1 text-gray-700">
              <li>• Recibirás un email de confirmación en los próximos minutos</li>
              <li>• Nuestro equipo revisará tu postulación</li>
              <li>• Te notificaremos por email cuando haya una decisión</li>
              <li>• Si eres aprobado, tendrás acceso a funciones exclusivas para speakers</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            Revisa tu correo: <strong>{userEmail}</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎤 Postularse como Speaker</CardTitle>
        <CardDescription>
          Comparte tu conocimiento con la comunidad de AWS Puebla
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivación */}
          <div className="space-y-2">
            <Label htmlFor="motivation">
              ¿Por qué quieres ser speaker? <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivation"
              placeholder="Cuéntanos tu motivación para compartir tu conocimiento con la comunidad..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={4}
              required
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Sé honesto y específico. Queremos conocer tu pasión por compartir conocimiento.
            </p>
          </div>

          {/* Temas */}
          <div className="space-y-2">
            <Label>
              Temas que te gustaría presentar <span className="text-red-500">*</span>
            </Label>
            {topics.map((topic, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Ej: AWS Lambda, Serverless, DynamoDB..."
                  value={topic}
                  onChange={(e) => updateTopic(index, e.target.value)}
                  required={index === 0}
                />
                {topics.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 p-0"
                    onClick={() => removeTopicField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTopicField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otro tema
            </Button>
          </div>

          {/* Experiencia */}
          <div className="space-y-2">
            <Label htmlFor="experience">Experiencia previa (opcional)</Label>
            <Textarea
              id="experience"
              placeholder="¿Has dado charlas antes? ¿Tienes experiencia enseñando o compartiendo conocimiento?"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Links a charlas anteriores */}
          <div className="space-y-2">
            <Label>Links a charlas o contenido previo (opcional)</Label>
            {previousTalksLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://youtube.com/... o https://..."
                  value={link}
                  onChange={(e) => updateLink(index, e.target.value)}
                />
                {previousTalksLinks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 p-0"
                    onClick={() => removeLinkField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLinkField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otro link
            </Button>
            <p className="text-xs text-gray-500">
              YouTube, LinkedIn, blogs personales, GitHub, etc.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full border-1" 
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando postulación...
              </>
            ) : (
              'Enviar Postulación'
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Al enviar, aceptas que tu información sea revisada por nuestro equipo.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
