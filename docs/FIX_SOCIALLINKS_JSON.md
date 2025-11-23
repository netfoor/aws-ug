# 🐛 Fix: Error "Variable 'socialLinks' has an invalid value"

## 📋 Problema

```
❌ Error: Variable 'socialLinks' has an invalid value.
```

Este error ocurría al intentar guardar el perfil de usuario en DynamoDB, específicamente cuando se intentaba guardar el campo `socialLinks`.

---

## 🔍 Diagnóstico

### **Síntomas:**
- ✅ Sanitización funcionando (valores limpios)
- ✅ Validación frontend pasando
- ❌ DynamoDB rechazando el valor

### **Causa raíz:**

En el schema de Amplify Gen 2, definimos:
```typescript
socialLinks: a.json()
```

**El tipo `a.json()` en Amplify Gen 2 requiere un STRING JSON, NO un objeto JavaScript.**

### **Lo que estábamos enviando (INCORRECTO):**
```typescript
optionalFields.socialLinks = {
  linkedin: "https://linkedin.com/in/fortino",
  github: "https://github.com/fortino"
}
// ❌ Esto es un objeto JavaScript
```

### **Lo que DynamoDB esperaba:**
```typescript
optionalFields.socialLinks = '{"linkedin":"https://linkedin.com/in/fortino","github":"https://github.com/fortino"}'
// ✅ Esto es un string JSON
```

---

## 🔧 Solución

### **Cambio 1: Al guardar - Serializar a JSON string**

**Archivo:** `src/hooks/useUserProfile.ts`

```typescript
// ANTES (❌ INCORRECTO):
if (Object.keys(cleanedSocialLinks).length > 0) {
  optionalFields.socialLinks = cleanedSocialLinks; // Objeto JS
}

// DESPUÉS (✅ CORRECTO):
if (Object.keys(cleanedSocialLinks).length > 0) {
  optionalFields.socialLinks = JSON.stringify(cleanedSocialLinks); // String JSON
  console.log('📦 Social links como JSON string:', optionalFields.socialLinks);
}
```

**Resultado:**
```javascript
// DynamoDB recibe:
socialLinks: '{"linkedin":"https://...","github":"https://..."}'
```

---

### **Cambio 2: Al leer - Parsear de JSON string a objeto**

**Archivo:** `src/hooks/useUserProfile.ts`

```typescript
// Parsear socialLinks de JSON string a objeto
let parsedSocialLinks = {};
if (userData.socialLinks) {
  try {
    // Si es string JSON, parsear
    if (typeof userData.socialLinks === 'string') {
      parsedSocialLinks = JSON.parse(userData.socialLinks);
    } else {
      // Si ya es objeto, usarlo directamente
      parsedSocialLinks = userData.socialLinks as any;
    }
  } catch (e) {
    console.error('Error parsing socialLinks:', e);
    parsedSocialLinks = {};
  }
}

setProfile({
  // ... otros campos
  socialLinks: parsedSocialLinks, // Objeto JS para usar en el frontend
});
```

**Resultado:**
```javascript
// Frontend recibe:
socialLinks: {
  linkedin: "https://...",
  github: "https://..."
}
```

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND: Usuario edita perfil                         │
├─────────────────────────────────────────────────────────┤
│ socialLinks = {                                        │
│   linkedin: "https://linkedin.com/in/usuario",         │
│   github: "https://github.com/usuario"                 │
│ }                                                      │
│ Tipo: Objeto JavaScript                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ JSON.stringify()
┌─────────────────────────────────────────────────────────┐
│ ENVIAR A DYNAMODB                                       │
├─────────────────────────────────────────────────────────┤
│ socialLinks = '{"linkedin":"https://...","github":...}'│
│ Tipo: String JSON                                      │
│ ✅ DynamoDB acepta este formato                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ Guardado en DB
┌─────────────────────────────────────────────────────────┐
│ DYNAMODB                                                │
├─────────────────────────────────────────────────────────┤
│ {                                                      │
│   id: "...",                                           │
│   givenName: "Fortino",                                │
│   socialLinks: '{"linkedin":"...","github":"..."}'     │
│ }                                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ Leer de DB
┌─────────────────────────────────────────────────────────┐
│ LEER DESDE DYNAMODB                                     │
├─────────────────────────────────────────────────────────┤
│ userData.socialLinks = '{"linkedin":"...","github":...}'│
│ Tipo: String JSON                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ JSON.parse()
┌─────────────────────────────────────────────────────────┐
│ FRONTEND: Mostrar perfil                                │
├─────────────────────────────────────────────────────────┤
│ socialLinks = {                                        │
│   linkedin: "https://linkedin.com/in/usuario",         │
│   github: "https://github.com/usuario"                 │
│ }                                                      │
│ Tipo: Objeto JavaScript                               │
│ ✅ Formulario puede usar este objeto                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Por qué `a.json()` requiere string

En **AWS AppSync y DynamoDB**, el tipo `AWSJSON` (que es lo que Amplify usa internamente para `a.json()`) está diseñado para almacenar datos JSON **como strings**.

**Razones:**
1. **Validación:** AppSync valida que el string sea JSON válido
2. **Flexibilidad:** Puedes guardar estructuras complejas sin definir schema
3. **Compatibilidad:** JSON es universalmente compatible
4. **Seguridad:** Evita inyección de código

**Documentación oficial:**
> AWSJSON: A JSON string. Any valid JSON construct is automatically parsed and loaded in the resolver mapping templates as Maps, Lists, or Scalar values.

---

## ✅ Verificación

### **Logs esperados al guardar:**

```
🔗 Social links sanitizados: {linkedin: '...', github: '...'}
📦 Social links como JSON string: '{"linkedin":"...","github":"..."}'
➕ Creando nuevo usuario...
📦 Resultado de creación: {data: {...}, errors: []}  ← ✅ Sin errores!
✅ Usuario creado/actualizado exitosamente
```

### **En DynamoDB Console:**

```json
{
  "id": "241884b8-0041-700b-64a5-1664b147cb80",
  "givenName": "Fortino",
  "familyName": "Romero",
  "email": "fortino.rom@gmail.com",
  "role": "SPEAKER",
  "socialLinks": "{\"linkedin\":\"https://linkedin.com/in/fortino\",\"github\":\"https://github.com/fortino\"}"
}
```

**Nota:** El valor de `socialLinks` es un **string** que contiene JSON.

---

## 🧪 Cómo Probar

### **Test 1: Guardar con social links**

```bash
1. Abre /profile → Editar Perfil
2. Llena:
   - LinkedIn: https://linkedin.com/in/tu-usuario
   - GitHub: https://github.com/tu-usuario
3. Guarda
4. Busca en console: "📦 Social links como JSON string"
5. Deberías ver: '{"linkedin":"...","github":"..."}'
6. ✅ Sin errores de DynamoDB
```

### **Test 2: Verificar en DynamoDB**

```bash
1. AWS Console → DynamoDB → Tables → User-...-NONE
2. Explore table items
3. Busca tu usuario
4. Campo socialLinks debe ser un STRING
5. Contenido: {"linkedin":"...","github":"..."}
```

### **Test 3: Verificar que se lee correctamente**

```bash
1. Después de guardar, cierra el formulario
2. Abre de nuevo "Editar Perfil"
3. Los campos de redes sociales deben estar llenos
4. Valores correctos: https://linkedin.com/...
5. ✅ JSON se parseó correctamente
```

---

## 🔍 Debugging

### **Si sigue dando error:**

```typescript
// Verifica el tipo antes de enviar
console.log('Tipo de socialLinks:', typeof optionalFields.socialLinks);
// Debe ser: "string"

console.log('Valor:', optionalFields.socialLinks);
// Debe empezar con: '{"...'
```

### **Si no se muestra al leer:**

```typescript
// Verifica el tipo al leer
console.log('Tipo al leer:', typeof userData.socialLinks);
// Puede ser: "string" o "object"

console.log('Valor:', userData.socialLinks);
// Si es string: '{"linkedin":"..."}'
// Si es objeto: {linkedin: "..."}
```

---

## 📚 Alternativas Consideradas

### **Opción 1: Usar campos separados (descartada)**
```typescript
linkedinUrl: a.string(),
githubUrl: a.string(),
twitterUrl: a.string(),
websiteUrl: a.string(),
```
**Por qué NO:**
- Menos flexible (no puedes agregar nuevas redes fácilmente)
- Más campos en el schema
- Más código de validación

### **Opción 2: Usar a.json() con stringify (✅ ELEGIDA)**
```typescript
socialLinks: a.json()
// Enviar: JSON.stringify(obj)
// Leer: JSON.parse(str)
```
**Por qué SÍ:**
- Flexible (puedes agregar cualquier red social)
- Un solo campo
- Validación centralizada

### **Opción 3: Usar a.customType() (compleja)**
```typescript
socialLinks: a.customType({
  linkedin: a.string(),
  github: a.string(),
  // ...
})
```
**Por qué NO:**
- Requiere definir el tipo completo
- Menos flexible
- Más complejo de mantener

---

## 💡 Lecciones Aprendidas

1. **`a.json()` requiere strings:** Siempre usar `JSON.stringify()` al guardar
2. **Parsear al leer:** Siempre usar `JSON.parse()` al leer (con try/catch)
3. **Verificar tipos:** En TypeScript, los tipos pueden engañar (type: any)
4. **Logs detallados:** Ayudan a identificar el problema rápidamente
5. **Leer documentación:** Amplify Gen 2 tiene diferencias con Gen 1

---

## 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/hooks/useUserProfile.ts` | ✅ JSON.stringify() al guardar<br>✅ JSON.parse() al leer |

---

## 📅 Fecha

**Noviembre 23, 2025**

**Status:** ✅ Resuelto

---

## 🔗 Referencias

- [AWS AppSync AWSJSON type](https://docs.aws.amazon.com/appsync/latest/devguide/scalars.html)
- [Amplify Gen 2 Data Types](https://docs.amplify.aws/react/build-a-backend/data/data-modeling/)
- [JSON.stringify() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [JSON.parse() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
