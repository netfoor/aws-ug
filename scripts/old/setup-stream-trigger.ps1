# Script para conectar DynamoDB Stream a Lambda
# Ejecutar DESPUÉS de habilitar el stream

param(
    [Parameter(Mandatory=$true)]
    [string]$StreamArn,
    
    [Parameter(Mandatory=$true)]
    [string]$LambdaFunctionName
)

Write-Host "🔗 Conectando DynamoDB Stream a Lambda..." -ForegroundColor Cyan
Write-Host "   Stream:  $StreamArn" -ForegroundColor Gray
Write-Host "   Lambda:  $LambdaFunctionName" -ForegroundColor Gray
Write-Host ""

try {
    # Crear Event Source Mapping
    $mapping = aws lambda create-event-source-mapping `
        --function-name $LambdaFunctionName `
        --event-source-arn $StreamArn `
        --starting-position LATEST `
        --batch-size 10 `
        --maximum-batching-window-in-seconds 5 `
        --enabled | ConvertFrom-Json

    Write-Host "✅ Trigger configurado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Detalles del Mapping:" -ForegroundColor Yellow
    Write-Host "   UUID:  $($mapping.UUID)" -ForegroundColor Gray
    Write-Host "   State: $($mapping.State)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 El trigger procesará registros nuevos en la tabla" -ForegroundColor Cyan
    Write-Host "⏳ Estado inicial: Enabling... (puede tomar 1-2 minutos)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 Para verificar el estado después:" -ForegroundColor Cyan
    Write-Host "   aws lambda get-event-source-mapping --uuid $($mapping.UUID)" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error configurando trigger: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Posibles causas:" -ForegroundColor Yellow
    Write-Host "   - El trigger ya existe (ejecutar: aws lambda list-event-source-mappings --function-name $LambdaFunctionName)"
    Write-Host "   - Permisos insuficientes"
    Write-Host "   - Stream ARN incorrecto"
    exit 1
}
