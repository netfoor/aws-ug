'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import UnifiedSpeakerProposalForm from '@/components/speaker/UnifiedSpeakerProposalForm';
import { useAuth } from '@/context/auth-context';
import { useUserProfile } from '@/hooks/useUserProfile';

const client = generateClient<Schema>();

export default function ApplyWithTalkPage() {
  const router = useRouter();
  const { user, userAttributes, isLoading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if user has access
  useEffect(() => {
    async function checkAccess() {
      if (authLoading || profileLoading) return;

      if (!user) {
        router.push('/auth/signin?redirect=/speaker/apply-with-talk');
        return;
      }

      const userEmail = (userAttributes?.email as string) || '';
      if (!userEmail) return;

      try {
        // Check if user already applied
        const { data: applications } = await client.models.SpeakerApplication.list({
          filter: { email: { eq: userEmail } }
        });

        if (applications && applications.length > 0) {
          const pendingOrApproved = applications.find(
            app => app.status === 'PENDING' || app.status === 'APPROVED'
          );
          
          if (pendingOrApproved) {
            setAlreadyApplied(true);
            setHasAccess(false);
            setIsCheckingAccess(false);
            return;
          }
        }

        // Check if user is already a speaker (from profile role)
        const userRole = profile?.role;
        
        if (userRole === 'SPEAKER' || userRole === 'ADMIN') {
          // Already a speaker, redirect to propose-talk
          router.push('/speaker/propose-talk');
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    }

    checkAccess();
  }, [user, userAttributes, authLoading, profileLoading, profile?.role, router]);

  async function handleSubmit(formData: any) {
    if (!user) return;

    const userEmail = (userAttributes?.email as string) || '';
    if (!userEmail) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    try {
      // Create SpeakerApplication with attached proposal
      const applicationData = {
        userId: user.userId,
        email: userEmail,
        motivation: formData.motivation,
        experience: formData.experience,
        topics: formData.topics,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString(),
        hasAttachedProposal: true, // Important flag!
        // Attached proposal data (JSON as string)
        attachedProposal: JSON.stringify({
          talkTitle: formData.talkTitle,
          talkDescription: formData.talkDescription,
          duration: formData.duration,
          targetAudience: formData.targetAudience,
          proposedDate: formData.proposedDate?.toISOString(),
        }),
        // Professional profile data (JSON as string)
        professionalProfile: JSON.stringify({
          photoKey: formData.photoKey,
          cvKey: formData.cvKey,
          linkedInUrl: formData.linkedInUrl,
          expertiseArea: formData.expertiseArea,
          company: formData.company,
          jobTitle: formData.jobTitle,
          phoneNumber: formData.phoneNumber,
          givenName: formData.givenName,
          familyName: formData.familyName,
        })
      };

      const { data: application, errors } = await client.models.SpeakerApplication.create(applicationData);

      if (errors) {
        console.error('Error creating application:', errors);
        throw new Error('Error al crear la solicitud');
      }

      console.log('✅ Application created with attached proposal:', application);
      
      // Update user profile with professional data
      if (profile?.id) {
        await client.models.User.update({
          id: profile.id,
          company: formData.company,
          speakerPhotoKey: formData.photoKey,
          speakerCvKey: formData.cvKey,
          linkedInUrl: formData.linkedInUrl,
          expertiseArea: formData.expertiseArea,
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting unified proposal:', error);
      throw error;
    }
  }

  // Loading state
  if (authLoading || profileLoading || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-text-secondary">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Already applied
  if (alreadyApplied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Ya has aplicado
          </h1>
          <p className="text-text-secondary mb-6">
            Tu solicitud ya está en proceso. Te notificaremos cuando sea revisada.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Ver mi perfil
          </button>
        </div>
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Acceso denegado
          </h1>
          <p className="text-text-secondary mb-6">
            No tienes permiso para acceder a esta página.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            ¡Solicitud Enviada con Éxito! 🎉
          </h1>
          <p className="text-text-secondary mb-6">
            Tu solicitud como speaker <strong>con propuesta de charla incluida</strong> ha sido enviada correctamente. 
            Recibirás un correo de confirmación pronto.
          </p>
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-text-primary">
              <strong>¿Qué sigue?</strong>
            </p>
            <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc list-inside">
              <li>Tu solicitud será aprobada automáticamente</li>
              <li>Tu propuesta de charla será revisada por el equipo</li>
              <li>Recibirás notificaciones sobre el estado</li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="w-full px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Ir a mi perfil
          </button>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            ✨ Aplicación Completa: Speaker + Charla
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            En un solo formulario, conviértete en speaker <strong>y propón tu primera charla</strong>. 
            Perfecto si ya tienes una idea clara y quieres agilizar el proceso.
          </p>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Consejo:</strong> Si aún no tienes una propuesta lista, puedes usar el{' '}
            <button
              onClick={() => router.push('/profile#speaker-section')}
              className="underline font-semibold hover:text-blue-700"
            >
              flujo tradicional
            </button>
            {' '}y proponer tu charla más adelante.
          </p>
        </div>

        {/* Form */}
        <UnifiedSpeakerProposalForm
          userId={user?.userId || ''}
          userEmail={(userAttributes?.email as string) || ''}
          userName={profile ? `${profile.givenName} ${profile.familyName}`.trim() : ''}
          userPhone={profile?.phoneNumber}
          userCompany={profile?.company}
          userJobTitle={profile?.jobTitle}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/')}
        />
      </div>
    </main>
  );
}
