import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import { useAuth } from '@/context/auth-context';
import { getUserRoleFromCognito } from '@/lib/amplify/auth';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export interface UserProfile {
  id?: string;
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
  jobTitle?: string;
  bio?: string;
  interests?: string[];
  role?: 'MEMBER' | 'SPEAKER' | 'ADMIN';
  newsletterOptIn?: boolean;
  avatarUrl?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
  // 🎤 PROFESSIONAL SPEAKER FIELDS (Fase 3)
  speakerPhotoKey?: string;
  speakerCvKey?: string;
  linkedInUrl?: string;
  expertiseArea?: string;
}

export function useUserProfile() {
  const { user, userAttributes } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // IMPORTANTE: Obtener el role desde los grupos de Cognito (fuente de verdad)
      const roleFromCognito = await getUserRoleFromCognito();
      
      const { data: userData } = await client.models.User.get({ id: user.userId });
      
      if (userData) {
        // Parsear socialLinks de JSON string a objeto
        let parsedSocialLinks = {};
        if (userData.socialLinks) {
          try {
            // Si es string JSON, parsear
            if (typeof userData.socialLinks === 'string') {
              parsedSocialLinks = JSON.parse(userData.socialLinks);
            } else {
              // Si ya es objeto (por alguna razón), usarlo directamente
              parsedSocialLinks = userData.socialLinks as Record<string, string>;
            }
          } catch (e) {
            console.error('Error parsing socialLinks:', e);
            parsedSocialLinks = {};
          }
        }
        
        // Usar los datos de DynamoDB pero el ROLE viene de Cognito
        setProfile({
          id: userData.id ?? undefined,
          givenName: (userData.givenName as string) || '',
          familyName: (userData.familyName as string) || '',
          email: (userData.email as string) || '',
          phoneNumber: userData.phoneNumber ?? undefined,
          company: userData.company ?? undefined,
          jobTitle: userData.jobTitle ?? undefined,
          bio: userData.bio ?? undefined,
          interests: (userData.interests ?? []).filter((interest): interest is string => interest !== null),
          role: roleFromCognito, // ← CAMBIO: Ahora viene de Cognito, no de DynamoDB
          newsletterOptIn: userData.newsletterOptIn ?? false,
          avatarUrl: userData.avatarUrl ?? undefined,
          socialLinks: parsedSocialLinks,
          // 🎤 PROFESSIONAL SPEAKER FIELDS
          speakerPhotoKey: userData.speakerPhotoKey ?? undefined,
          speakerCvKey: userData.speakerCvKey ?? undefined,
          linkedInUrl: userData.linkedInUrl ?? undefined,
          expertiseArea: userData.expertiseArea ?? undefined,
        });
      } else {
        // Crear perfil inicial desde atributos de Cognito
        const initialProfile: UserProfile = {
          givenName: String(userAttributes?.given_name || ''),
          familyName: String(userAttributes?.family_name || ''),
          email: String(userAttributes?.email || ''),
          phoneNumber: userAttributes?.phone_number ? String(userAttributes.phone_number) : undefined,
          role: roleFromCognito, // ← CAMBIO: Role viene de Cognito
          newsletterOptIn: false,
          interests: [],
          socialLinks: {},
        };
        setProfile(initialProfile);
      }
    } catch (err) {
      setError('Error al cargar el perfil');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, userAttributes]);

  const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user?.userId) {
      console.error('❌ useUserProfile.updateProfile: No hay userId');
      throw new Error('Usuario no autenticado');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // IMPORTANTE: Obtener el role actual desde Cognito (siempre usar como fuente de verdad)
      const roleFromCognito = await getUserRoleFromCognito();
      
      // Verificar si el usuario ya existe
      const { data: existingUser } = await client.models.User.get({ id: user.userId });

      const baseData = {
        id: user.userId,
        givenName: updatedProfile.givenName || profile?.givenName || '',
        familyName: updatedProfile.familyName || profile?.familyName || '',
        email: updatedProfile.email || profile?.email || '',
        interests: updatedProfile.interests || profile?.interests || [],
        role: roleFromCognito, // ← CAMBIO: Sincronizar el role de Cognito a DynamoDB
        newsletterOptIn: updatedProfile.newsletterOptIn ?? profile?.newsletterOptIn ?? false,
      };

      // Campos opcionales - IMPORTANTE: Solo incluir si tienen valores válidos
      const optionalFields: Record<string, unknown> = {};
      
      // Phone number
      if (updatedProfile.phoneNumber || profile?.phoneNumber) {
        optionalFields.phoneNumber = updatedProfile.phoneNumber || profile?.phoneNumber;
      }
      
      // Company
      if (updatedProfile.company || profile?.company) {
        optionalFields.company = updatedProfile.company || profile?.company;
      }
      
      // Bio
      if (updatedProfile.bio || profile?.bio) {
        optionalFields.bio = updatedProfile.bio || profile?.bio;
      }
      
      // Avatar URL
      if (updatedProfile.avatarUrl || profile?.avatarUrl) {
        optionalFields.avatarUrl = updatedProfile.avatarUrl || profile?.avatarUrl;
      }
      
      // Social Links - CRÍTICO: Sanitizar y convertir a JSON string
      const socialLinks = updatedProfile.socialLinks || profile?.socialLinks;
      if (socialLinks && typeof socialLinks === 'object') {
        // Filtrar valores undefined, null y strings vacíos
        const cleanedSocialLinks: Record<string, string> = {};
        Object.entries(socialLinks).forEach(([key, value]) => {
          if (value && typeof value === 'string' && value.trim() !== '') {
            cleanedSocialLinks[key] = value;
          }
        });
        
        // Solo incluir si hay al menos un link válido
        if (Object.keys(cleanedSocialLinks).length > 0) {
          // IMPORTANTE: a.json() en Amplify requiere un string JSON, no un objeto
          optionalFields.socialLinks = JSON.stringify(cleanedSocialLinks);
        }
      }

      let result;
      
      if (existingUser) {
        // Actualizar usuario existente
        result = await client.models.User.update({
          ...baseData,
          ...optionalFields,
        });
      } else {
        // Crear nuevo usuario
        result = await client.models.User.create({
          ...baseData,
          ...optionalFields,
        });
      }

      // IMPORTANTE: Verificar si hay errores en la respuesta
      if (result.errors && result.errors.length > 0) {
        console.error('❌ Error en la operación de DynamoDB:', result.errors);
        result.errors.forEach((error, index) => {
          console.error(`Error ${index + 1}:`, {
            message: error.message,
            errorType: (error as { errorType?: string }).errorType,
            path: error.path,
            locations: error.locations
          });
        });
        
        setError(`Error al guardar en DynamoDB: ${result.errors[0].message}`);
        return false;
      }

      // Verificar si se creó/actualizó correctamente
      if (!result.data) {
        console.error('❌ No se recibió data en la respuesta');
        setError('Error: No se pudo guardar el perfil');
        return false;
      }

      // Actualizar el estado local con el role de Cognito
      setProfile(prev => ({ 
        ...prev, 
        ...updatedProfile,
        role: roleFromCognito // ← Asegurar que el role siempre venga de Cognito
      } as UserProfile));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError('Error al actualizar el perfil: ' + errorMessage);
      console.error('❌ useUserProfile.updateProfile: Error:', {
        message: errorMessage,
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch profile once when user ID is available and we don't have a profile yet
    if (user?.userId && !profile && !loading) {
      fetchProfile();
    }
  }, [user?.userId]); // Removed fetchProfile from dependencies to prevent loops

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
