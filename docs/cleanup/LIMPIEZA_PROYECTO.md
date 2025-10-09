# Plan de Limpieza del Proyecto

**Fecha:** 8 de Octubre, 2025  
**Objetivo:** Limpiar archivos innecesarios y decidir estrategia de tests

---

## 📁 ANÁLISIS DE ARCHIVOS EN ROOT

### 🗑️ ARCHIVOS A ELIMINAR (Confirmado innecesarios)

#### 1. Archivos de debug temporal:
```
❌ debug-login-click.png (58 KB)
❌ debug-profile-redirect.png (33 KB)
❌ temp_old_middleware.ts (17 KB)
❌ temp_old_page.tsx (8 KB)
```
**Razón:** Screenshots y archivos temporales de debugging que ya no necesitas.

#### 2. Carpetas de resultados de tests:
```
❌ test-results/ (resultados antiguos de Playwright)
❌ playwright-report/ (reportes viejos)
```
**Razón:** Serán regenerados cuando corras los tests. No deben estar en git.

---

### ✅ ARCHIVOS A MANTENER

#### Documentación del análisis (útiles como referencia):
```
✅ ANALISIS_AUTENTICACION.md (17 KB) - Análisis técnico completo
✅ COMPARACION_VERSIONES.md (10 KB) - Comparación de versiones
✅ PLAN_DE_ACCION.md (19 KB) - Plan de implementación
✅ README.md (1.4 KB) - Documentación del proyecto
```

#### Configuración esencial:
```
✅ package.json
✅ package-lock.json
✅ tsconfig.json
✅ next.config.ts
✅ eslint.config.mjs
✅ postcss.config.mjs
✅ .gitignore
✅ .env (no se ve pero debe existir)
```

#### Tests:
```
⚠️ __tests__/ - VER DECISIÓN ABAJO
⚠️ jest.config.js
⚠️ jest.setup.js
⚠️ jest-setup.d.ts
⚠️ playwright.config.ts
```

#### Amplify:
```
✅ amplify/ - Configuración de backend
✅ amplify_outputs.json - Configuración generada
✅ .amplify/ - Cache de Amplify
```

#### Código fuente:
```
✅ src/ - Todo el código de la aplicación
✅ public/ - Assets públicos (SVG icons)
✅ docs/ - Documentación adicional
```

---

## 🧪 DECISIÓN SOBRE TESTS

### SITUACIÓN ACTUAL:

**Tests existentes:**
```
__tests__/
├── components/
│   ├── auth-context.test.tsx ❌ FALLANDO
│   └── navigation.test.tsx ✅ PASANDO
├── lib/
│   ├── middleware-auth.test.ts ✅ PASANDO
│   └── token-sync.test.ts ⚠️ OBSOLETO (eliminaremos token-sync)
├── integration/
│   └── auth-integration.test.tsx ❌ FALLANDO
├── e2e/
│   ├── auth-flow.spec.ts
│   ├── auth-flow-resilient.spec.ts
│   └── otros... (varios)
├── mocks/
│   ├── auth-mocks.ts
│   ├── js-cookie.ts
│   └── request-mocks.ts
└── utils/
    └── test-utils.tsx
```

**Estado:**
- ✅ 3 tests pasando
- ❌ 2 tests fallando
- ⚠️ 1 test obsoleto (token-sync)
- 🤷 E2E tests no probados recientemente

---

### 📊 OPCIONES PARA LOS TESTS

#### OPCIÓN 1: 🗑️ ELIMINAR TODO Y REESCRIBIR

**Ventajas:**
- ✅ Tests alineados 100% con nueva arquitectura
- ✅ Sin código obsoleto
- ✅ Empezar con mejores prácticas desde cero
- ✅ TDD (Test-Driven Development) para nuevo código

**Desventajas:**
- ❌ Pierdes tests que SÍ funcionan
- ❌ Más trabajo inicial
- ❌ Sin cobertura durante refactor

**Estimado:** 2-3 días para reescribir todos los tests

---

#### OPCIÓN 2: ⚙️ REFACTORIZAR SELECTIVAMENTE (RECOMENDADA)

**Qué hacer:**

1. **MANTENER y ACTUALIZAR:**
   ```
   ✅ __tests__/components/navigation.test.tsx (ya pasa)
   ✅ __tests__/lib/middleware-auth.test.ts (ya pasa, pero actualizar)
   ✅ __tests__/mocks/ (útiles para otros tests)
   ✅ __tests__/utils/test-utils.tsx (framework de testing)
   ✅ __tests__/setup-verification.test.ts (setup básico)
   ```

2. **ARREGLAR (después de refactoring):**
   ```
   ⚙️ __tests__/components/auth-context.test.tsx
      → Actualizar después de mejorar auth-context
   ```

3. **ELIMINAR (código obsoleto):**
   ```
   ❌ __tests__/lib/token-sync.test.ts
      → Eliminaremos token-sync.ts
   
   ❌ __tests__/integration/auth-integration.test.tsx
      → Está testeando la arquitectura vieja
   ```

4. **E2E Tests - MANTENER pero NO EJECUTAR por ahora:**
   ```
   ⏸️ __tests__/e2e/*
      → Dejar en pausa hasta que refactoring esté listo
      → Luego actualizar para nueva arquitectura
   ```

**Ventajas:**
- ✅ Mantienes lo que funciona
- ✅ Menos trabajo
- ✅ Puedes ir actualizando progresivamente
- ✅ Tests como documentación de comportamiento esperado

**Desventajas:**
- ⚠️ Algunos tests quedarán desactualizados temporalmente
- ⚠️ Necesitas disciplina para actualizar después

**Estimado:** 1 día para limpiar y actualizar tests básicos

---

#### OPCIÓN 3: 🔄 HÍBRIDA - Eliminar y reescribir en fases

**Fase 1 - Durante refactoring:**
- ❌ Eliminar todos los tests excepto setup
- ✅ Mantener solo mocks y utils
- 🚀 Refactorizar código sin distracciones

**Fase 2 - Después de refactoring:**
- ✍️ Escribir nuevos tests para:
  - Server-side auth
  - Auth context mejorado
  - Páginas principales
  - E2E flows

**Estimado:** 1-2 días (distribuido)

---

### 🎯 MI RECOMENDACIÓN: OPCIÓN 2 (Refactorizar Selectivamente)

**Por qué:**

1. **No tires el bebé con el agua sucia:**
   - Tests de Navigation funcionan ✅
   - Tests de middleware-auth son útiles ✅
   - Mocks pueden reutilizarse ✅

2. **Actualización progresiva:**
   ```
   Semana 1: Refactorizar auth → Actualizar tests de auth
   Semana 2: Mejorar middleware → Actualizar tests de middleware
   Semana 3: E2E tests → Actualizar flows
   ```

3. **Menos riesgo:**
   - Tienes tests funcionando durante el proceso
   - Puedes detectar regresiones
   - Documentación viva del comportamiento

---

## 📋 PLAN DE ACCIÓN DE LIMPIEZA

### PASO 1: Crear backup
```bash
# Tag de seguridad
git add -A
git commit -m "checkpoint: before cleanup"
git tag backup-before-cleanup-20251008
git push origin --tags
```

### PASO 2: Actualizar .gitignore
```gitignore
# Testing
test-results/
playwright-report/
coverage/

# Debug files
debug-*.png
temp_*.ts
temp_*.tsx

# OS
.DS_Store
Thumbs.db
```

### PASO 3: Eliminar archivos innecesarios
```bash
# Archivos de debug
rm debug-login-click.png
rm debug-profile-redirect.png
rm temp_old_middleware.ts
rm temp_old_page.tsx

# Carpetas de resultados (se regeneran)
rm -rf test-results/
rm -rf playwright-report/
```

### PASO 4: Limpiar tests obsoletos
```bash
# Eliminar tests que probarán código que vamos a eliminar
rm __tests__/lib/token-sync.test.ts
rm __tests__/integration/auth-integration.test.tsx

# Crear carpeta para tests en pausa
mkdir __tests__/paused-e2e
mv __tests__/e2e/* __tests__/paused-e2e/
```

### PASO 5: Actualizar package.json scripts
```json
{
  "scripts": {
    "test": "jest --testPathIgnorePatterns=paused-e2e",
    "test:watch": "jest --watch --testPathIgnorePatterns=paused-e2e",
    "test:e2e": "echo 'E2E tests paused during refactoring'",
    "test:e2e:paused": "playwright test paused-e2e/"
  }
}
```

### PASO 6: Crear documento de tests
```bash
# Documentar qué tests hay y su estado
```

---

## 📊 RESUMEN DE LIMPIEZA

### Archivos a eliminar:
```
❌ debug-login-click.png
❌ debug-profile-redirect.png  
❌ temp_old_middleware.ts
❌ temp_old_page.tsx
❌ test-results/ (carpeta)
❌ playwright-report/ (carpeta)
❌ __tests__/lib/token-sync.test.ts
❌ __tests__/integration/auth-integration.test.tsx
```

### Archivos a mantener:
```
✅ Toda la configuración (package.json, tsconfig.json, etc.)
✅ Documentación de análisis (ANALISIS_*.md, PLAN_*.md, etc.)
✅ Código fuente (src/, amplify/)
✅ Tests que funcionan (navigation, middleware-auth)
✅ Infraestructura de testing (mocks, utils)
```

### Tests a pausar temporalmente:
```
⏸️ __tests__/e2e/* → mover a __tests__/paused-e2e/
```

### Tests a arreglar después:
```
⚙️ __tests__/components/auth-context.test.tsx
   → Después de refactorizar auth-context.tsx
```

---

## 🎯 BENEFICIOS DE ESTA LIMPIEZA

1. **Proyecto más limpio:** -150 KB de archivos innecesarios
2. **Git más ligero:** No rastrear archivos temporales
3. **Tests enfocados:** Solo correr tests relevantes
4. **Menos confusión:** Sin código obsoleto
5. **Mejor organización:** E2E tests pausados claramente marcados

---

## ⚠️ SIGUIENTES PASOS

Después de la limpieza:

1. ✅ Ejecutar `npm test` para verificar tests actuales
2. ✅ Continuar con PLAN_DE_ACCION.md Fase 1
3. ✅ A medida que refactorizas, actualizar tests correspondientes
4. ✅ Al final, reactivar E2E tests actualizados

---

**¿Procedemos con esta limpieza?** 🧹
