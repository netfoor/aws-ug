'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';
import { validatePhoneNumber } from '@/lib/form-validation';

const client = generateClient<Schema>();

/**
 * 🎉 Página de Onboarding
 * 
 * Se muestra SOLO la primera vez que un usuario inicia sesión.
 * Captura información esencial para mejorar la experiencia en la comunidad.
 * 
 * Después de completar, marca profileCompleted = true y redirige al dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, userAttributes, isLoading: authLoading } = useAuth();

  // Form state
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+52 ');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [awsExperienceLevel, setAwsExperienceLevel] = useState<'PROFESSIONAL' | 'PERSONAL' | 'NONE' | 'LEARNING'>('NONE');
  const [interests, setInterests] = useState<string[]>([]);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intereses disponibles
  const availableInterests = [
    { value: 'LEARNING', label: '📖 Aprender sobre AWS y Cloud Computing' },
    { value: 'NETWORKING', label: '🤝 Networking profesional' },
    { value: 'GENAI', label: '🤖 Desarrollar habilidades en IA Generativa' },
    { value: 'SPEAKER', label: '🎤 Quiero ser speaker' },
    { value: 'CONTENT', label: '💡 Contenido técnico interesante' },
  ];

  // Pre-llenar con datos de Cognito (solo una vez al montar)
  useEffect(() => {
    if (userAttributes) {
      // Pre-llenar nombre si viene de Cognito (solo si no se ha inicializado)
      if (userAttributes.given_name && givenName === '') {
        setGivenName(userAttributes.given_name as string);
      }
      if (userAttributes.family_name && familyName === '') {
        setFamilyName(userAttributes.family_name as string);
      }
      // Pre-llenar teléfono si viene de Cognito (solo si está en el valor inicial)
      if (userAttributes.phone_number && phoneNumber === '+52 ') {
        const phone = userAttributes.phone_number as string;
        // Si ya tiene el +52, úsalo; si no, agrégalo
        setPhoneNumber(phone.startsWith('+52') ? phone : `+52 ${phone}`);
      }
    }
  }, [userAttributes]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nota: Intencionalmente no incluimos givenName, familyName, phoneNumber como dependencias
  // para evitar que se re-ejecute cuando el usuario edita los campos

  useEffect(() => {
    // Si el usuario ya completó onboarding, redirigir
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data: userData } = await client.models.User.get({ id: user.userId });
        if (userData?.profileCompleted) {
          router.push('/');
        }
      } catch (err) {
        console.error('Error verificando estado de onboarding:', err);
      }
    };

    if (!authLoading && user) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, router]);

  const toggleInterest = (value: string) => {
    setInterests(prev =>
      prev.includes(value)
        ? prev.filter(i => i !== value)
        : [...prev, value]
    );
  };

  // Handler para teléfono con auto-formato +52
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Si el usuario borra todo, mantener el +52
    if (value === '' || value === '+') {
      setPhoneNumber('+52 ');
      return;
    }
    
    // Si no empieza con +52, agregarlo
    if (!value.startsWith('+52')) {
      value = '+52 ' + value.replace(/^\+?52?\s?/, '');
    }
    
    // Asegurar que haya un espacio después del +52
    if (value.startsWith('+52') && value[3] !== ' ') {
      value = '+52 ' + value.substring(3);
    }
    
    setPhoneNumber(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('No estás autenticado');
      return;
    }

    // Validaciones
    if (!givenName.trim() || !familyName.trim()) {
      setError('Nombre y apellidos son obligatorios');
      return;
    }

    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      setError(phoneValidation.errors[0]);
      return;
    }

    if (!company.trim()) {
      setError('Empresa o institución es obligatoria');
      return;
    }

    if (!jobTitle.trim()) {
      setError('Rol o carrera es obligatorio');
      return;
    }

    if (interests.length === 0) {
      setError('Selecciona al menos una motivación');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      // Actualizar usuario existente (fue creado por Lambda en el login)
      await client.models.User.update({
        id: user.userId,
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        phoneNumber: phoneNumber.trim(),
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        awsExperienceLevel,
        interests,
        newsletterOptIn,
        profileCompleted: true, // ✅ Marcar como completado
        onboardingCompletedAt: now,
        updatedAt: now,
      });

      // Redirigir al inicio
      router.push('/');

    } catch (err) {
      console.error('Error completando onboarding:', err);
      setError('Hubo un error al guardar tu información. Por favor intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <p className="text-text-secondary mb-4">Debes iniciar sesión para acceder a esta página.</p>
            <Button variant="accent" onClick={() => router.push('/login')}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            🎉 ¡Bienvenido a AWS User Group Puebla!
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-2">
            Somos una comunidad de profesionales, estudiantes y entusiastas de AWS 
            que se reúnen para compartir conocimientos, experiencias y conectar con 
            otros apasionados de la nube.
          </p>
          <p className="text-text-secondary">
            Para brindarte una mejor experiencia y eventos adaptados a tus intereses, 
            necesitamos conocerte un poco mejor. <strong>¡Toma solo 2 minutos!</strong> 🚀
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Completa tu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="givenName">Nombre *</Label>
                  <Input
                    id="givenName"
                    type="text"
                    placeholder={userAttributes?.given_name ? String(userAttributes.given_name) : "Juan"}
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-text-secondary mt-1">Tu nombre de pila</p>
                </div>
                <div>
                  <Label htmlFor="familyName">Apellidos *</Label>
                  <Input
                    id="familyName"
                    type="text"
                    placeholder={userAttributes?.family_name ? String(userAttributes.family_name) : "Pérez García"}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-text-secondary mt-1">Tus apellidos completos</p>
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <Label htmlFor="phoneNumber">Teléfono *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+52 222 123 4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  required
                />
                <p className="text-xs text-text-secondary mt-1">
                  Para comunicarnos contigo sobre eventos especiales
                </p>
              </div>

              {/* Empresa */}
              <div>
                <Label htmlFor="company">Empresa o Institución *</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Empresa, Universidad, Freelance, etc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
                <p className="text-xs text-text-secondary mt-1">
                  ¿A qué organización representas? 
                </p>
              </div>

              {/* Rol o Carrera */}
              <div>
                <Label htmlFor="jobTitle">Rol o Carrera *</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="Solutions Architect, DevOps Engineer, Estudiante de TI, etc."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
                <p className="text-xs text-text-secondary mt-1">
                  Tu puesto de trabajo o carrera que estudias
                </p>
              </div>

              {/* Experiencia con AWS */}
              <div>
                <Label>¿Has utilizado AWS antes? *</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'PROFESSIONAL', label: '☁️ Sí, tengo experiencia profesional con AWS' },
                    { value: 'PERSONAL', label: '🎓 Sí, en proyectos personales o educativos' },
                    { value: 'NONE', label: '🌱 No, pero me gustaría aprender' },
                    { value: 'LEARNING', label: '📚 Estoy aprendiendo actualmente' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="awsExperienceLevel"
                        value={option.value}
                        checked={awsExperienceLevel === option.value}
                        onChange={(e) => setAwsExperienceLevel(e.target.value as 'PROFESSIONAL' | 'PERSONAL' | 'NONE' | 'LEARNING')}
                        className="w-4 h-4 text-accent"
                      />
                      <span className="text-sm text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Motivaciones */}
              <div>
                <Label>¿Qué te motivó a unirte a la comunidad? * (Selecciona al menos 1)</Label>
                <div className="space-y-2 mt-2">
                  {availableInterests.map((interest) => (
                    <label
                      key={interest.value}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={interests.includes(interest.value)}
                        onChange={() => toggleInterest(interest.value)}
                        className="w-4 h-4 text-accent rounded"
                      />
                      <span className="text-sm text-text-primary">{interest.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div>
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="w-4 h-4 text-accent rounded"
                  />
                  <span className="text-sm text-text-primary">
                    📧 Quiero recibir actualizaciones sobre eventos y contenido de AWS
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="accent"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    '✨ Completar Perfil y Continuar'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
