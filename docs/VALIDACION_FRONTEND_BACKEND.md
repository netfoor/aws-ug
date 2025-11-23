# 🛡️ Estrategia de Validación: Frontend + Backend

## 📋 Resumen

Este documento explica cómo implementamos validación en **dos capas** para asegurar datos limpios y buena experiencia de usuario.

---

## 🎯 Filosofía: Defensa en Profundidad

```
┌─────────────────────────────────────────────────────────┐
│              CAPA 1: FRONTEND (UX)                      │
│   "Ayudar al usuario a no cometer errores"             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Validación instantánea                             │
│  ✅ Mensajes amigables                                 │
│  ✅ Prevención de envío inválido                       │
│  ✅ Feedback visual (bordes rojos)                     │
│                                                         │
│  Ejemplo:                                              │
│  "El email no es válido"                               │
│  "LinkedIn debe ser una URL válida"                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Si pasa validación
                          ▼
┌─────────────────────────────────────────────────────────┐
│            CAPA 2: BACKEND (Seguridad)                  │
│   "Asegurar que nada malo llegue a la base de datos"   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Validación final                                   │
│  ✅ Sanitización de datos                              │
│  ✅ Protección contra manipulación                     │
│  ✅ Mensajes técnicos                                  │
│                                                         │
│  Ejemplo:                                              │
│  "Variable 'socialLinks' has invalid value"            │
│  Filtrar campos undefined/null                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementación

### **CAPA 1: Validación en Frontend**

#### **Archivo:** `src/components/profile/EditProfileForm.tsx`

```typescript
// Estado para errores de validación
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

// Función de validación
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};
  
  // 1. Campos requeridos
  if (!formData.givenName?.trim()) {
    errors.givenName = 'El nombre es requerido';
  }
  
  if (!formData.familyName?.trim()) {
    errors.familyName = 'El apellido es requerido';
  }
  
  // 2. Formato de email
  if (!formData.email?.trim()) {
    errors.email = 'El email es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'El email no es válido';
  }
  
  // 3. URLs de redes sociales
  if (formData.socialLinks) {
    const urlPattern = /^https?:\/\/.+/i;
    
    if (formData.socialLinks.linkedin && !urlPattern.test(formData.socialLinks.linkedin)) {
      errors.linkedin = 'LinkedIn debe ser una URL válida';
    }
    
    // ... similar para github, twitter, website
  }
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0; // true si no hay errores
};

// En handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ✅ Validar ANTES de enviar
  if (!validateForm()) {
    setSaveError('Por favor corrige los errores en el formulario');
    return; // No continuar si hay errores
  }
  
  // Proceder a guardar...
};
```

#### **Mostrar errores en UI:**

```tsx
{/* Campo con validación */}
<Input
  value={formData.email || ''}
  onChange={(e) => handleInputChange('email', e.target.value)}
  className={validationErrors.email ? 'border-red-500' : ''}
/>
{validationErrors.email && (
  <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
)}
```

**Resultado visual:**
- Campo con borde rojo si hay error
- Mensaje descriptivo debajo del campo
- Usuario sabe exactamente qué corregir

---

### **CAPA 2: Sanitización en Backend**

#### **Archivo:** `src/hooks/useUserProfile.ts`

```typescript
const updateProfile = async (updatedProfile: Partial<UserProfile>) => {
  // ... obtener role desde Cognito
  
  // ✅ Sanitización de socialLinks
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
      optionalFields.socialLinks = cleanedSocialLinks;
    }
  }
  
  // Enviar a DynamoDB
  const result = await client.models.User.create({ ...baseData, ...optionalFields });
  
  // ✅ Verificar errores en la respuesta
  if (result.errors && result.errors.length > 0) {
    console.error('❌ Error en DynamoDB:', result.errors);
    return false;
  }
  
  return true;
};
```

**Qué hace la sanitización:**
1. **Filtrar valores inválidos:** undefined, null, strings vacíos
2. **Validar tipos:** Asegurar que sean strings
3. **Limpiar whitespace:** `.trim()` para quitar espacios
4. **Omitir campos vacíos:** No enviar si no hay datos

---

## 🎨 Experiencia de Usuario

### **Escenario 1: Usuario completa formulario correctamente**

```
1. Usuario llena todos los campos
2. Email válido: "juan@ejemplo.com" ✅
3. LinkedIn válido: "https://linkedin.com/in/juan" ✅
4. Click "Guardar"
5. Validación pasa ✅
6. Se envía a backend
7. Backend sanitiza y guarda
8. Mensaje verde: "Perfil actualizado exitosamente" 🎉
```

---

### **Escenario 2: Usuario comete un error**

```
1. Usuario llena campos
2. Email inválido: "juan@ejemplo" ❌
3. LinkedIn sin https: "linkedin.com/in/juan" ❌
4. Click "Guardar"
5. Validación detecta errores ⚠️
6. Campos con error se marcan en rojo
7. Mensajes aparecen:
   - "El email no es válido"
   - "LinkedIn debe ser una URL válida (ej: https://...)"
8. Usuario corrige
9. Ahora puede guardar ✅
```

---

### **Escenario 3: Intento de manipulación (bypass del frontend)**

```
1. Usuario malicioso abre DevTools
2. Modifica formData directamente:
   formData.socialLinks = { linkedin: undefined, github: 123 }
3. Envía a backend
4. Backend recibe datos inválidos
5. Sanitización filtra:
   - linkedin: undefined → Eliminado ❌
   - github: 123 (no es string) → Eliminado ❌
6. Solo campos válidos llegan a DynamoDB ✅
7. Sistema protegido 🛡️
```

---

## 📊 Comparación: Frontend vs Backend

| Aspecto | Frontend | Backend |
|---------|----------|---------|
| **Propósito** | UX - Ayudar al usuario | Seguridad - Proteger datos |
| **Cuando** | Antes de enviar | Al recibir datos |
| **Mensajes** | Amigables y descriptivos | Técnicos y específicos |
| **Ejemplo** | "El email no es válido" | "Variable has invalid value" |
| **Puede ser omitida** | Sí (DevTools, API directa) | No - Siempre se ejecuta |
| **Responsabilidad** | Mejorar experiencia | Garantizar integridad |

---

## ✅ Ventajas de Este Enfoque

### **1. Mejor UX**
- Usuario ve errores inmediatamente
- Sabe exactamente qué corregir
- No espera respuesta del servidor

### **2. Menos requests fallidos**
- Validación frontend previene envíos inválidos
- Reduce carga en backend
- Ahorra costos de AWS

### **3. Seguridad**
- Backend no confía en frontend
- Sanitización siempre se ejecuta
- Protección contra manipulación

### **4. Debugging más fácil**
- Logs claros en cada capa
- Fácil identificar dónde falla
- Mejor trazabilidad

---

## 🐛 Debugging

### **Si validación frontend falla:**

```typescript
// Busca en console:
❌ Validación falló: {email: "El email no es válido"}

// Verifica:
1. ¿El regex está correcto?
2. ¿El campo tiene el valor esperado?
3. ¿Los mensajes son claros?
```

### **Si sanitización backend falla:**

```typescript
// Busca en console:
❌ Error en DynamoDB: [{message: "Variable 'socialLinks' has invalid value"}]

// Verifica:
1. ¿El valor es del tipo correcto?
2. ¿Hay undefined o null?
3. ¿El schema de DynamoDB acepta ese tipo?
```

---

## 🔮 Mejoras Futuras

### **1. Validación en tiempo real**
```typescript
// Validar mientras el usuario escribe
<Input
  onBlur={() => validateSingleField('email')}
  // Muestra error al salir del campo
/>
```

### **2. Validación de lado del servidor (Lambda)**
```typescript
// Lambda function para validar antes de guardar en DynamoDB
export const handler = async (event) => {
  const { socialLinks } = event.arguments;
  
  if (socialLinks) {
    // Validar URLs
    // Validar formato
    // Rechazar si inválido
  }
  
  return event;
};
```

### **3. Mensajes de error personalizados por idioma**
```typescript
const errorMessages = {
  es: {
    email_required: 'El email es requerido',
    email_invalid: 'El email no es válido',
  },
  en: {
    email_required: 'Email is required',
    email_invalid: 'Email is invalid',
  }
};
```

---

## 📝 Checklist de Implementación

- [x] ✅ Validación de campos requeridos (frontend)
- [x] ✅ Validación de formato de email (frontend)
- [x] ✅ Validación de URLs (frontend)
- [x] ✅ Mensajes de error en UI (frontend)
- [x] ✅ Bordes rojos en campos inválidos (frontend)
- [x] ✅ Sanitización de socialLinks (backend)
- [x] ✅ Filtrar undefined/null (backend)
- [x] ✅ Verificación de errores de DynamoDB (backend)
- [x] ✅ Logs detallados en ambas capas
- [ ] ⏳ Validación en tiempo real
- [ ] ⏳ Lambda de validación
- [ ] ⏳ Internacionalización

---

## 💡 Conclusión

**¿Frontend o Backend?** → **AMBOS** 🎯

- **Frontend:** Primera línea de defensa, mejor UX
- **Backend:** Última línea de defensa, seguridad garantizada

**Nunca confíes solo en uno.** La validación en frontend puede ser omitida, y la validación en backend sin frontend da mala experiencia de usuario.

---

📅 **Última actualización:** Noviembre 23, 2025
🔧 **Estado:** Implementado y funcionando
