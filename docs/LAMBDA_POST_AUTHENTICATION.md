# 🔐 Lambda PostAuthentication: Auto-asignación de Grupo MEMBERS

## 📋 ¿Qué hace esta Lambda?

Automáticamente asigna **nuevos usuarios** al grupo `MEMBERS` cuando inician sesión por primera vez.

---

## 🎯 Problema que resuelve

**ANTES:**
```
Usuario registra → No tiene grupo → Role = "MEMBER" (solo en frontend)
Admin debe ir a AWS Console → Cognito → Add to group manualmente
```

**AHORA:**
```
Usuario registra → Lambda auto-asigna a "MEMBERS" → Role = "MEMBER" (en Cognito)
No requiere intervención manual del admin ✅
```

---

## 🔄 Flujo Completo

```
1. Usuario inicia sesión (primera vez o subsecuente)
   ↓
2. Cognito ejecuta Lambda PostAuthentication
   ↓
3. Lambda verifica: ¿Usuario tiene grupos?
   ├─ NO → Agregar a grupo "MEMBERS"
   └─ SÍ → No hacer nada (ya es SPEAKER o ADMIN)
   ↓
4. Usuario debe cerrar sesión y volver a iniciar
   ↓
5. Nuevo JWT incluye: cognito:groups = ["MEMBERS"]
   ↓
6. Frontend muestra: role = "MEMBER" ✅
```

---

## ⚙️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│ Usuario inicia sesión (Google OAuth)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Cognito: Autenticación exitosa                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ (TRIGGER)
┌─────────────────────────────────────────────────────────┐
│ Lambda PostAuthentication                               │
│ ├─ AdminGetUser (leer grupos actuales)                 │
│ ├─ Si groupsArray.length === 0:                        │
│ │  └─ AdminAddUserToGroup("MEMBERS")                   │
│ └─ Sino: No hacer nada                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Cognito: Generar JWT token                             │
│ (en el SIGUIENTE login tendrá cognito:groups)          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Seguridad

### **Permisos IAM:**
```typescript
{
  actions: [
    'cognito-idp:AdminAddUserToGroup',   // Solo agregar a grupos
    'cognito-idp:AdminGetUser',          // Solo leer usuarios
    'cognito-idp:AdminListGroupsForUser', // Solo listar grupos
  ],
  resources: [
    'arn:aws:cognito-idp:*:*:userpool/YOUR_USER_POOL_ID'
  ]
}
```

### **Protecciones:**
- ✅ Solo puede modificar grupos, NO otros atributos
- ✅ Solo funciona en TU user pool
- ✅ NO puede remover de grupos
- ✅ NO puede eliminar usuarios
- ✅ Si falla, el login continúa (no bloquea)

---

## 🧪 Cómo Probar

### **Test 1: Usuario nuevo**
```bash
1. Ir a AWS Console → Cognito → Users
2. Eliminar un usuario existente (ej: tu cuenta de prueba)
3. En la app: Cerrar sesión
4. Registrarse de nuevo con ese email
5. Iniciar sesión
6. Lambda se ejecuta → Usuario agregado a MEMBERS
7. Cerrar sesión e iniciar de nuevo
8. Verificar en /profile → Role = "MEMBER" ✅
```

### **Test 2: Usuario existente con grupos**
```bash
1. Usuario que YA es SPEAKER o ADMIN
2. Iniciar sesión
3. Lambda se ejecuta → NO modifica grupos
4. Verificar en /profile → Role sigue siendo SPEAKER o ADMIN ✅
```

### **Test 3: Ver logs de Lambda**
```bash
1. AWS Console → CloudWatch → Log Groups
2. Buscar: /aws/lambda/post-authentication
3. Ver logs recientes
4. Deberías ver:
   - "🔐 PostAuthentication trigger iniciado"
   - "➕ Usuario sin grupos, agregando a MEMBERS..."
   - "✅ Usuario agregado exitosamente a grupo MEMBERS"
```

---

## 📊 Logs Esperados

### **Usuario SIN grupos:**
```
🔐 PostAuthentication trigger iniciado
👤 Usuario: google_123456789
📧 Email: usuario@gmail.com
🔍 Obteniendo información del usuario...
👥 Grupos actuales: Ninguno
➕ Usuario sin grupos, agregando a MEMBERS...
✅ Usuario agregado exitosamente a grupo MEMBERS
⚠️ El usuario debe cerrar sesión e iniciar de nuevo para ver el cambio
```

### **Usuario CON grupos:**
```
🔐 PostAuthentication trigger iniciado
👤 Usuario: google_987654321
📧 Email: admin@gmail.com
🔍 Obteniendo información del usuario...
👥 Grupos actuales: [ 'ADMINS', 'MEMBERS' ]
✅ Usuario ya tiene grupos asignados, no se modifica
📋 Grupos existentes: [ 'ADMINS', 'MEMBERS' ]
```

---

## ❓ Preguntas Frecuentes

### **Q: ¿Por qué necesito cerrar sesión para ver el cambio?**
A: Los grupos vienen en el JWT token que se genera al iniciar sesión. La Lambda agrega el grupo, pero el token actual ya fue generado. Necesitas un nuevo token.

### **Q: ¿Qué pasa si la Lambda falla?**
A: El usuario puede iniciar sesión de todas formas. La Lambda tiene un `try/catch` que evita bloquear el login.

### **Q: ¿Puedo cambiar el grupo default de MEMBERS a otro?**
A: Sí, edita `handler.ts` línea 60:
```typescript
GroupName: 'OTRO_GRUPO', // Cambiar aquí
```

### **Q: ¿Se ejecuta en CADA login o solo el primero?**
A: Se ejecuta en CADA login, pero solo agrega al grupo si NO tiene ninguno.

### **Q: ¿Puede sobrescribir grupos existentes?**
A: NO. Si el usuario ya tiene grupos (SPEAKER, ADMIN), la Lambda no los modifica.

---

## 🔧 Troubleshooting

### **Error: "User does not exist"**
```
Causa: El usuario fue eliminado de Cognito
Solución: Normal, Lambda no puede agregar usuarios inexistentes
```

### **Error: "Access denied"**
```
Causa: La Lambda no tiene permisos IAM
Solución: Verificar backend.ts tiene addToRolePolicy
```

### **Usuario no aparece en grupo**
```
Posibles causas:
1. Lambda no se ejecutó (ver CloudWatch logs)
2. Usuario ya tenía grupos
3. Usuario no cerró sesión después del primer login

Solución:
1. Ver logs en CloudWatch
2. Verificar en AWS Console → Cognito → Users → [usuario] → Groups
3. Forzar logout/login
```

---

## 📁 Archivos Relevantes

| Archivo | Propósito |
|---------|-----------|
| `amplify/functions/post-authentication/handler.ts` | Lógica de la Lambda |
| `amplify/functions/post-authentication/resource.ts` | Definición en Amplify |
| `amplify/auth/resource.ts` | Configuración del trigger |
| `amplify/backend.ts` | Permisos IAM |

---

## 🚀 Próximos Pasos

Una vez que esto funcione:
- ✅ Fase 2 completa
- ⏭️ Fase 3: Sistema de postulación de speakers
- ⏭️ Fase 4: Panel de admin

---

📅 **Fecha:** Noviembre 23, 2025  
🔧 **Estado:** Implementado, listo para probar  
✅ **Breaking Changes:** Ninguno

