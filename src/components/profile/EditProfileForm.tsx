'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUserProfile, type UserProfile } from '@/hooks/useUserProfile';

interface EditProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditProfileForm({ onSuccess, onCancel }: EditProfileFormProps) {
  const { profile, updateProfile, loading } = useUserProfile();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    givenName: profile?.givenName || '',
    familyName: profile?.familyName || '',
    email: profile?.email || '',
    phoneNumber: profile?.phoneNumber || '',
    company: profile?.company || '',
    bio: profile?.bio || '',
    newsletterOptIn: profile?.newsletterOptIn || false,
    socialLinks: profile?.socialLinks || {},
  });

  const [interests, setInterests] = useState<string>(
    profile?.interests?.join(', ') || ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedProfile = {
      ...formData,
      interests: interests.split(',').map(i => i.trim()).filter(Boolean),
    };

    const success = await updateProfile(updatedProfile);
    if (success) {
      onSuccess?.();
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Apellido *</label>
              <Input
                value={formData.familyName || ''}
                onChange={(e) => handleInputChange('familyName', e.target.value)}
                required
                placeholder="Tu apellido"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              placeholder="tu@email.com"
            />
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">GitHub</label>
                <Input
                  value={formData.socialLinks?.github || ''}
                  onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                  placeholder="https://github.com/tu-usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Twitter</label>
                <Input
                  value={formData.socialLinks?.twitter || ''}
                  onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/tu-usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sitio Web</label>
                <Input
                  value={formData.socialLinks?.website || ''}
                  onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                  placeholder="https://tu-sitio.com"
                />
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
