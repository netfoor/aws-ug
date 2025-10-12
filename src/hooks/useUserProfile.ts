import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { useAuth } from '@/context/auth-context';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export interface UserProfile {
  id?: string;
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber?: string;
  company?: string;
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
}

export function useUserProfile() {
  const { user, userAttributes } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: userData } = await client.models.User.get({ id: user.userId });
      
      if (userData) {
        setProfile({
          id: userData.id ?? undefined,
          givenName: (userData.givenName as string) || '',
          familyName: (userData.familyName as string) || '',
          email: (userData.email as string) || '',
          phoneNumber: userData.phoneNumber ?? undefined,
          company: userData.company ?? undefined,
          bio: userData.bio ?? undefined,
          interests: (userData.interests ?? []).filter((interest): interest is string => interest !== null),
          role: (userData.role as 'MEMBER' | 'SPEAKER' | 'ADMIN') ?? 'MEMBER',
          newsletterOptIn: userData.newsletterOptIn ?? false,
          avatarUrl: userData.avatarUrl ?? undefined,
          socialLinks: (userData.socialLinks as any) ?? {},
        });
      } else {
        // Crear perfil inicial desde atributos de Cognito
        const initialProfile: UserProfile = {
          givenName: String(userAttributes?.given_name || ''),
          familyName: String(userAttributes?.family_name || ''),
          email: String(userAttributes?.email || ''),
          phoneNumber: userAttributes?.phone_number ? String(userAttributes.phone_number) : undefined,
          role: 'MEMBER',
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
  };

  const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
    if (!user?.userId) throw new Error('Usuario no autenticado');
    
    setLoading(true);
    setError(null);
    
    try {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await client.models.User.get({ id: user.userId });

      const baseData = {
        id: user.userId,
        givenName: updatedProfile.givenName || profile?.givenName || '',
        familyName: updatedProfile.familyName || profile?.familyName || '',
        email: updatedProfile.email || profile?.email || '',
        interests: updatedProfile.interests || profile?.interests || [],
        role: updatedProfile.role || profile?.role || 'MEMBER',
        newsletterOptIn: updatedProfile.newsletterOptIn ?? profile?.newsletterOptIn ?? false,
      };

      // Campos opcionales
      const optionalFields: any = {};
      if (updatedProfile.phoneNumber || profile?.phoneNumber) {
        optionalFields.phoneNumber = updatedProfile.phoneNumber || profile?.phoneNumber;
      }
      if (updatedProfile.company || profile?.company) {
        optionalFields.company = updatedProfile.company || profile?.company;
      }
      if (updatedProfile.bio || profile?.bio) {
        optionalFields.bio = updatedProfile.bio || profile?.bio;
      }
      if (updatedProfile.avatarUrl || profile?.avatarUrl) {
        optionalFields.avatarUrl = updatedProfile.avatarUrl || profile?.avatarUrl;
      }
      if (updatedProfile.socialLinks || profile?.socialLinks) {
        optionalFields.socialLinks = updatedProfile.socialLinks || profile?.socialLinks || {};
      }

      if (existingUser) {
        // Actualizar usuario existente
        await client.models.User.update({
          ...baseData,
          ...optionalFields,
        });
      } else {
        // Crear nuevo usuario
        await client.models.User.create({
          ...baseData,
          ...optionalFields,
        });
      }

      setProfile(prev => ({ ...prev, ...updatedProfile } as UserProfile));
      return true;
    } catch (err) {
      setError('Error al actualizar el perfil');
      console.error('Error updating profile:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchProfile();
    }
  }, [user?.userId]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
