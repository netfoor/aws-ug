'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUserProfile, type UserProfile } from '@/hooks/useUserProfile';

interface EditProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditProfileForm({ onSuccess, onCancel }: EditProfileFormProps) {
  const { profile, updateProfile, loading, error } = useUserProfile();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    givenName: '',
    familyName: '',
    phoneNumber: '',
    company: '',
    bio: '',
    newsletterOptIn: false,
    socialLinks: {},
  });

  const [interests, setInterests] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ✅ NUEVO: Sincronizar formData cuando profile cambia
  useEffect(() => {
    if (profile) {
      setFormData({
        givenName: profile.givenName || '',
        familyName: profile.familyName || '',
        phoneNumber: profile.phoneNumber || '',
        company: profile.company || '',
        bio: profile.bio || '',
        newsletterOptIn: profile.newsletterOptIn || false,
        socialLinks: profile.socialLinks || {},
      });
      setInterests(profile.interests?.join(', ') || '');
    }
  }, [profile]);

  // ✅ Función de validación
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar campos requeridos
    if (!formData.givenName?.trim()) {
      errors.givenName = 'El nombre es requerido';
    }
    
    if (!formData.familyName?.trim()) {
      errors.familyName = 'El apellido es requerido';
    }
    
    // Validar social links (URLs)
    if (formData.socialLinks) {
      const urlPattern = /^https?:\/\/.+/i;
      
      if (formData.socialLinks.linkedin && !urlPattern.test(formData.socialLinks.linkedin)) {
        errors.linkedin = 'LinkedIn debe ser una URL válida (ej: https://linkedin.com/in/usuario)';
      }
      
      if (formData.socialLinks.twitter && !urlPattern.test(formData.socialLinks.twitter)) {
        errors.twitter = 'Twitter debe ser una URL válida (ej: https://twitter.com/usuario)';
      }
      
      if (formData.socialLinks.github && !urlPattern.test(formData.socialLinks.github)) {
        errors.github = 'GitHub debe ser una URL válida (ej: https://github.com/usuario)';
      }
      
      if (formData.socialLinks.website && !urlPattern.test(formData.socialLinks.website)) {
        errors.website = 'Website debe ser una URL válida (ej: https://ejemplo.com)';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Resetear estados
    setSaveError(null);
    setSaveSuccess(false);
    setValidationErrors({});
    
    // ✅ Validar antes de enviar
    if (!validateForm()) {
      setSaveError('Por favor corrige los errores en el formulario');
      return;
    }
    
    const updatedProfile = {
      ...formData,
      interests: interests.split(',').map(i => i.trim()).filter(Boolean),
    };

    try {
      const success = await updateProfile(updatedProfile);
      
      if (success) {
        setSaveSuccess(true);
        
        // Mostrar mensaje de éxito brevemente antes de cerrar
        setTimeout(() => {
          onSuccess?.(); // ← ProfilePage recargará el perfil antes de cerrar
        }, 1500);
      } else {
        console.error('❌ Error al guardar perfil: updateProfile retornó false');
        setSaveError('No se pudo guardar el perfil. Por favor intenta de nuevo.');
      }
    } catch (err) {
      console.error('❌ Excepción al guardar perfil:', err);
      setSaveError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mensajes de error/éxito */}
        {(saveError || error) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {saveError || error}
            </p>
          </div>
        )}
        
        {saveSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              <strong>¡Éxito!</strong> Tu perfil se ha guardado correctamente.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre *</label>
              <Input
                value={formData.givenName || ''}
                onChange={(e) => handleInputChange('givenName', e.target.value)}
                required
                placeholder="Tu nombre"
                className={validationErrors.givenName ? 'border-red-500' : ''}
              />
              {validationErrors.givenName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.givenName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido *</label>
              <Input
                value={formData.familyName || ''}
                onChange={(e) => handleInputChange('familyName', e.target.value)}
                required
                placeholder="Tu apellido"
                className={validationErrors.familyName ? 'border-red-500' : ''}
              />
              {validationErrors.familyName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.familyName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="px-3 py-2 bg-secondary/30 border border-border rounded-md text-text-secondary">
              {profile?.email || 'Cargando...'}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              ℹ️ El email viene de tu cuenta de autenticación y no puede editarse aquí
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Teléfono</label>
            <Input
              type="tel"
              value={formData.phoneNumber || ''}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="+52 222 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Empresa</label>
            <Input
              value={formData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Tu empresa actual"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Biografía</label>
            <textarea
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              rows={4}
              value={formData.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Cuéntanos sobre ti, tu experiencia con AWS..."
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Intereses en AWS</label>
            <Input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Serverless, Security, DevOps, Machine Learning..."
              helperText="Separa los intereses con comas"
            />
          </div>

          {/* Redes Sociales */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Redes Sociales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn</label>
                <Input
                  value={formData.socialLinks?.linkedin || ''}
                  onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/tu-perfil"
                  className={validationErrors.linkedin ? 'border-red-500' : ''}
                />
                {validationErrors.linkedin && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.linkedin}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">GitHub</label>
                <Input
                  value={formData.socialLinks?.github || ''}
                  onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                  placeholder="https://github.com/tu-usuario"
                  className={validationErrors.github ? 'border-red-500' : ''}
                />
                {validationErrors.github && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.github}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Twitter</label>
                <Input
                  value={formData.socialLinks?.twitter || ''}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/tu-usuario"
                  className={validationErrors.twitter ? 'border-red-500' : ''}
                />
                {validationErrors.twitter && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.twitter}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sitio Web</label>
                <Input
                  value={formData.socialLinks?.website || ''}
                  onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                  placeholder="https://tu-sitio.com"
                  className={validationErrors.website ? 'border-red-500' : ''}
                />
                {validationErrors.website && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.website}</p>
                )}
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="newsletter"
              checked={formData.newsletterOptIn || false}
              onChange={(e) => handleInputChange('newsletterOptIn', e.target.checked)}
              className="rounded border-border focus:ring-accent"
            />
            <label htmlFor="newsletter" className="text-sm">
              Quiero recibir el newsletter del AWS User Group Puebla
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              variant="accent"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
