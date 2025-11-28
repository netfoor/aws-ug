# Script para probar el flujo completo de Speaker Application
# Ejecutar DESPUES de completar la configuracion

param(
    [Parameter(Mandatory=$true)]
    [string]$UserEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$UserId = "test-user-123"
)

Write-Host ""
Write-Host "TEST: Flujo de Speaker Application" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Obtener informacion de la tabla
Write-Host "Obteniendo nombre de tabla DynamoDB..." -ForegroundColor Yellow
$tables = aws dynamodb list-tables | ConvertFrom-Json
$speakerAppTable = $tables.TableNames | Where-Object { $_ -like "*SpeakerApplication*" } | Select-Object -First 1

if (-not $speakerAppTable) {
    Write-Host "No se encontro tabla SpeakerApplication" -ForegroundColor Red
    exit 1
}

Write-Host "Tabla encontrada: $speakerAppTable" -ForegroundColor Green
Write-Host ""

# Crear item en DynamoDB (esto deberia triggear la Lambda)
Write-Host "Insertando aplicacion en DynamoDB..." -ForegroundColor Yellow
Write-Host "(Esto deberia triggear la Lambda de procesamiento)" -ForegroundColor Gray

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

    Write-Host "Aplicacion insertada exitosamente!" -ForegroundColor Green
    Write-Host ""

    # Cleanup
    Remove-Item ".\temp-test-item.json" -ErrorAction SilentlyContinue

} catch {
    Write-Host "Error insertando aplicacion: $_" -ForegroundColor Red
    Remove-Item ".\temp-test-item.json" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "MONITOREO DEL FLUJO:" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor Gray
Write-Host ""

Write-Host "[1] Verificar Lambda de Procesamiento:" -ForegroundColor Yellow
$processLambda = aws lambda list-functions | ConvertFrom-Json | Select-Object -ExpandProperty Functions | Where-Object { $_.FunctionName -like "*process-speaker*" } | Select-Object -First 1
if ($processLambda) {
    Write-Host "aws logs tail /aws/lambda/$($processLambda.FunctionName) --since 1m --follow" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2] Verificar Email 'Solicitud Recibida':" -ForegroundColor Yellow
Write-Host "Revisa inbox: $UserEmail" -ForegroundColor Gray

Write-Host ""
Write-Host "[3] Verificar EventBridge Schedule creado:" -ForegroundColor Yellow
Write-Host "aws scheduler list-schedules --name-prefix approve-speaker" -ForegroundColor Gray

Write-Host ""
Write-Host "[4] Esperar 5 minutos..." -ForegroundColor Yellow
Write-Host "La auto-aprobacion ocurrira en ~5 minutos" -ForegroundColor Cyan

Write-Host ""
Write-Host "[5] Despues de 5 min, verificar Lambda de Aprobacion:" -ForegroundColor Yellow
$approveLambda = aws lambda list-functions | ConvertFrom-Json | Select-Object -ExpandProperty Functions | Where-Object { $_.FunctionName -like "*approve-speaker*" } | Select-Object -First 1
if ($approveLambda) {
    Write-Host "aws logs tail /aws/lambda/$($approveLambda.FunctionName) --since 1m --follow" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[6] Verificar Email 'Aprobado':" -ForegroundColor Yellow
Write-Host "Revisa inbox: $UserEmail" -ForegroundColor Gray

Write-Host ""
Write-Host "[7] Verificar usuario en grupo SPEAKERS:" -ForegroundColor Yellow
Write-Host "aws cognito-idp admin-list-groups-for-user --user-pool-id us-east-1_CFlWpHKxh --username $UserId" -ForegroundColor Gray

Write-Host ""
Write-Host "[8] Verificar estado en DynamoDB:" -ForegroundColor Yellow
Write-Host "aws dynamodb scan --table-name $speakerAppTable" -ForegroundColor Gray

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "Test iniciado exitosamente!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Abre multiples terminales para monitorear logs en tiempo real" -ForegroundColor Cyan
Write-Host ""
