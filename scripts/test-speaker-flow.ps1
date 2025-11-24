# Script para probar el flujo completo de Speaker Application
# Ejecutar DESPUÉS de completar la configuración

param(
    [Parameter(Mandatory=$true)]
    [string]$UserEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$UserId = "test-user-123"
)

Write-Host ""
Write-Host "🧪 TEST: Flujo de Speaker Application" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Datos de prueba
$testApplication = @{
    id = [guid]::NewGuid().ToString()
    userId = $UserId
    email = $UserEmail
    motivation = "Quiero compartir mi experiencia con AWS Lambda y serverless architecture con la comunidad de Puebla."
    topics = @("AWS Lambda", "Serverless", "EventBridge", "Step Functions")
    experience = "He dado 3 charlas en conferencias locales y tengo un canal de YouTube sobre AWS."
    previousTalksLinks = @(
        "https://youtube.com/watch?v=example1"
        "https://youtube.com/watch?v=example2"
    )
    status = "PENDING"
    submittedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json -Depth 10

Write-Host "📋 Datos de la aplicación de prueba:" -ForegroundColor Yellow
Write-Host $testApplication -ForegroundColor Gray
Write-Host ""

# Obtener información de la tabla
Write-Host "🔍 Obteniendo nombre de tabla DynamoDB..." -ForegroundColor Yellow
$tables = aws dynamodb list-tables | ConvertFrom-Json
$speakerAppTable = $tables.TableNames | Where-Object { $_ -like "*SpeakerApplication*" } | Select-Object -First 1

if (-not $speakerAppTable) {
    Write-Host "❌ No se encontró tabla SpeakerApplication" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tabla encontrada: $speakerAppTable" -ForegroundColor Green
Write-Host ""

# Crear item en DynamoDB (esto debería triggear la Lambda)
Write-Host "📤 Insertando aplicación en DynamoDB..." -ForegroundColor Yellow
Write-Host "   (Esto debería triggear la Lambda de procesamiento)" -ForegroundColor Gray

try {
    $item = @{
        id = @{ S = [guid]::NewGuid().ToString() }
        userId = @{ S = $UserId }
        email = @{ S = $UserEmail }
        motivation = @{ S = "Quiero compartir mi experiencia con AWS Lambda y serverless architecture con la comunidad de Puebla." }
        topics = @{ L = @(
            @{ S = "AWS Lambda" }
            @{ S = "Serverless" }
            @{ S = "EventBridge" }
        )}
        experience = @{ S = "He dado 3 charlas en conferencias locales y tengo un canal de YouTube sobre AWS." }
        previousTalksLinks = @{ L = @(
            @{ S = "https://youtube.com/watch?v=example1" }
        )}
        status = @{ S = "PENDING" }
        submittedAt = @{ S = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
    } | ConvertTo-Json -Depth 10

    $item | Out-File -FilePath ".\temp-test-item.json" -Encoding utf8
    
    aws dynamodb put-item `
        --table-name $speakerAppTable `
        --item file://temp-test-item.json

    Write-Host "✅ Aplicación insertada exitosamente!" -ForegroundColor Green
    Write-Host ""

    # Cleanup
    Remove-Item ".\temp-test-item.json" -ErrorAction SilentlyContinue

} catch {
    Write-Host "❌ Error insertando aplicación: $_" -ForegroundColor Red
    Remove-Item ".\temp-test-item.json" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "🔍 MONITOREO DEL FLUJO:" -ForegroundColor Cyan
Write-Host "─────────────────────────" -ForegroundColor Gray
Write-Host ""

Write-Host "1️⃣  Verificar Lambda de Procesamiento:" -ForegroundColor Yellow
$processLambda = aws lambda list-functions | ConvertFrom-Json | Select-Object -ExpandProperty Functions | Where-Object { $_.FunctionName -like "*process-speaker*" } | Select-Object -First 1
if ($processLambda) {
    Write-Host "   aws logs tail /aws/lambda/$($processLambda.FunctionName) --since 1m --follow" -ForegroundColor Gray
}

Write-Host ""
Write-Host "2️⃣  Verificar Email 'Solicitud Recibida':" -ForegroundColor Yellow
Write-Host "   Revisa inbox: $UserEmail" -ForegroundColor Gray

Write-Host ""
Write-Host "3️⃣  Verificar EventBridge Schedule creado:" -ForegroundColor Yellow
Write-Host "   aws scheduler list-schedules --name-prefix approve-speaker" -ForegroundColor Gray

Write-Host ""
Write-Host "4️⃣  Esperar 5 minutos..." -ForegroundColor Yellow
Write-Host "   ⏰ La auto-aprobación ocurrirá en ~5 minutos" -ForegroundColor Cyan

Write-Host ""
Write-Host "5️⃣  Después de 5 min, verificar Lambda de Aprobación:" -ForegroundColor Yellow
$approveLambda = aws lambda list-functions | ConvertFrom-Json | Select-Object -ExpandProperty Functions | Where-Object { $_.FunctionName -like "*approve-speaker*" } | Select-Object -First 1
if ($approveLambda) {
    Write-Host "   aws logs tail /aws/lambda/$($approveLambda.FunctionName) --since 1m --follow" -ForegroundColor Gray
}

Write-Host ""
Write-Host "6️⃣  Verificar Email '¡Aprobado!':" -ForegroundColor Yellow
Write-Host "   Revisa inbox: $UserEmail" -ForegroundColor Gray

Write-Host ""
Write-Host "7️⃣  Verificar usuario en grupo SPEAKERS:" -ForegroundColor Yellow
Write-Host "   aws cognito-idp admin-list-groups-for-user --user-pool-id <POOL_ID> --username $UserId" -ForegroundColor Gray

Write-Host ""
Write-Host "8️⃣  Verificar estado en DynamoDB:" -ForegroundColor Yellow
Write-Host "   aws dynamodb scan --table-name $speakerAppTable --filter-expression `"email = :email`" --expression-attribute-values '{\":email\":{\"S\":\"$UserEmail\"}}'" -ForegroundColor Gray

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Test iniciado exitosamente!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Abre múltiples terminales para monitorear logs en tiempo real" -ForegroundColor Cyan
