# Tests E2E Pausados

## ⏸️ Estado: PAUSADO TEMPORALMENTE

Estos tests E2E (End-to-End) han sido pausados durante el proceso de refactorización del sistema de autenticación.

## 📁 Tests Incluidos

- `auth-flow.spec.ts` - Flujo completo de autenticación
- `auth-flow-resilient.spec.ts` - Flujo resistente a errores
- `debug-login.spec.ts` - Debug de proceso de login
- `debug.spec.ts` - Debug general
- `deep-debug.spec.ts` - Debug profundo
- `real-auth-flow.spec.ts` - Flujo de autenticación real

## ⚠️ Por qué están pausados

Estamos refactorizando el sistema de autenticación para:
1. Eliminar token-sync inseguro
2. Implementar autenticación server-side
3. Mejorar el middleware
4. Agregar medidas de seguridad

## 🔄 Cuándo se reactivarán

Una vez completado el refactoring (estimado: 3-5 días), estos tests serán:
1. Revisados para alinearse con la nueva arquitectura
2. Actualizados según sea necesario
3. Reactivados y movidos de vuelta a `__tests__/e2e/`

## 🚀 Cómo ejecutarlos (si es necesario)

```bash
# Ejecutar tests E2E pausados
npx playwright test paused-e2e/

# Ejecutar un test específico
npx playwright test paused-e2e/auth-flow.spec.ts

# Con UI
npx playwright test paused-e2e/ --ui
```

## 📝 Notas

- Estos tests pueden fallar porque prueban la arquitectura anterior
- No deben ejecutarse en CI/CD por ahora
- Se mantendrán como referencia del comportamiento esperado
- Serán la base para los nuevos tests E2E

---

**Última actualización:** 8 de Octubre, 2025
