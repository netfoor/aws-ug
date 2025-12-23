# Script para configurar Amazon SES
# Verifica un email para testing o muestra como salir del sandbox

Write-Host "Configuracion de Amazon SES" -ForegroundColor Cyan
Write-Host ""

# Verificar estado del sandbox
Write-Host "Verificando estado de SES..." -ForegroundColor Yellow
$account = aws sesv2 get-account | ConvertFrom-Json

if ($account.ProductionAccessEnabled) {
    Write-Host "Cuenta SES en modo PRODUCCION" -ForegroundColor Green
    Write-Host "Puedes enviar emails a cualquier direccion" -ForegroundColor Gray
} else {
    Write-Host "Cuenta SES en modo SANDBOX" -ForegroundColor Yellow
    Write-Host "Solo puedes enviar emails a direcciones verificadas" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Para salir del sandbox:" -ForegroundColor Cyan
    Write-Host "1. Ve a: https://console.aws.amazon.com/ses" -ForegroundColor Gray
    Write-Host "2. Click en Request production access" -ForegroundColor Gray
    Write-Host "3. Completa el formulario de solicitud" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Identidades verificadas actuales:" -ForegroundColor Yellow
$identities = aws sesv2 list-email-identities | ConvertFrom-Json

if ($identities.EmailIdentities.Count -eq 0) {
    Write-Host "No hay identidades verificadas" -ForegroundColor Yellow
} else {
    foreach ($identity in $identities.EmailIdentities) {
        Write-Host "- $($identity.IdentityName) [$($identity.IdentityType)]" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Opciones para testing:" -ForegroundColor Cyan
Write-Host ""

# Opcion 1: Verificar email individual
Write-Host "OPCION 1: Verificar un email para testing" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$email = Read-Host "Ingresa el email a verificar (Enter para omitir)"

if ($email) {
    try {
        Write-Host "Enviando email de verificacion a: $email" -ForegroundColor Yellow
        aws sesv2 create-email-identity --email-identity $email
        
        Write-Host "Email de verificacion enviado!" -ForegroundColor Green
        Write-Host "Revisa tu inbox y haz click en el link de verificacion" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Esperando verificacion (presiona Enter cuando lo hayas verificado)..." -ForegroundColor Yellow
        Read-Host
        
        # Verificar estado
        $identityDetails = aws sesv2 get-email-identity --email-identity $email | ConvertFrom-Json
        if ($identityDetails.VerifiedForSendingStatus) {
            Write-Host "Email verificado exitosamente!" -ForegroundColor Green
        } else {
            Write-Host "Email aun no verificado. Revisa tu inbox." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "OPCION 2: Usar AWS SES Simulator (para testing)" -ForegroundColor Yellow
Write-Host "------------------------------------------------" -ForegroundColor Gray
Write-Host "Puedes usar estos emails de prueba (no requieren verificacion):" -ForegroundColor Gray
Write-Host "- success@simulator.amazonses.com (simula exito)" -ForegroundColor Green
Write-Host "- bounce@simulator.amazonses.com (simula rebote)" -ForegroundColor Red
Write-Host "- complaint@simulator.amazonses.com (simula queja)" -ForegroundColor Red
Write-Host ""
Write-Host "Para testing inicial, usa success@simulator.amazonses.com" -ForegroundColor Cyan

Write-Host ""
Write-Host "Proximo paso:" -ForegroundColor Yellow
Write-Host "Probar el flujo completo con test-speaker-flow.ps1" -ForegroundColor Gray
Write-Host ""
