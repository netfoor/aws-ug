Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  AWS PUEBLA - LIMPIEZA DE RECURSOS HUERFANOS" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

$cleaned = 0

Write-Host "1 Limpiando Event Source Mappings huerfanos..." -ForegroundColor Yellow
$mappings = aws lambda list-event-source-mappings --query "EventSourceMappings[?contains(FunctionArn, 'process')]" --output json | ConvertFrom-Json

if ($mappings.Count -gt 0) {
    foreach ($mapping in $mappings) {
        if ($mapping.LastProcessingResult -like "*Function not found*" -or $mapping.State -eq "Deleting") {
            Write-Host "   Eliminando mapping roto: $($mapping.UUID)" -ForegroundColor Red
            aws lambda delete-event-source-mapping --uuid $mapping.UUID | Out-Null
            $cleaned++
        }
    }
    if ($cleaned -eq 0) {
        Write-Host "   No hay mappings huerfanos" -ForegroundColor Green
    } else {
        Write-Host "   Eliminados $cleaned mappings huerfanos" -ForegroundColor Green
    }
} else {
    Write-Host "   No hay Event Source Mappings" -ForegroundColor Green
}

Write-Host "`n2 Limpiando EventBridge Schedules viejos..." -ForegroundColor Yellow
$schedules = aws scheduler list-schedules --name-prefix approve-speaker --output json | ConvertFrom-Json

if ($schedules.Schedules.Count -gt 0) {
    Write-Host "   Encontrados $($schedules.Schedules.Count) schedules" -ForegroundColor Cyan
    $now = Get-Date
    $cleaned_schedules = 0
    foreach ($schedule in $schedules.Schedules) {
        $details = aws scheduler get-schedule --name $schedule.Name --output json | ConvertFrom-Json
        try {
            $scheduleTime = [DateTime]::Parse($details.ScheduleExpression.Replace("at(", "").Replace(")", ""))
            $age = ($now - $scheduleTime).TotalMinutes
            if ($age -gt 10) {
                Write-Host "   Eliminando schedule viejo: $($schedule.Name)" -ForegroundColor Red
                aws scheduler delete-schedule --name $schedule.Name | Out-Null
                $cleaned_schedules++
            }
        } catch {
            Write-Host "   No se pudo parsear schedule: $($schedule.Name), eliminando..." -ForegroundColor Yellow
            aws scheduler delete-schedule --name $schedule.Name | Out-Null
            $cleaned_schedules++
        }
    }
    if ($cleaned_schedules -eq 0) {
        Write-Host "   Todos los schedules son recientes" -ForegroundColor Green
    } else {
        Write-Host "   Eliminados $cleaned_schedules schedules viejos" -ForegroundColor Green
    }
} else {
    Write-Host "   No hay EventBridge Schedules" -ForegroundColor Green
}

Write-Host "`n3 Limpiando registros de testing en DynamoDB..." -ForegroundColor Yellow
$allTables = aws dynamodb list-tables --output json | ConvertFrom-Json
$tableName = $allTables.TableNames | Where-Object { $_ -like '*SpeakerApplication*' } | Select-Object -First 1

if ($tableName) {
    Write-Host "   Tabla encontrada: $tableName" -ForegroundColor Cyan
    $confirm = Read-Host "   Eliminar aplicaciones de prueba? (s/N)"
    if ($confirm -eq "s" -or $confirm -eq "S") {
        $filterExpr = 'contains(motivation, :test) OR contains(email, :test)'
        $attrValues = '{":test":{"S":"test"}}'
        $items = aws dynamodb scan --table-name $tableName --filter-expression $filterExpr --expression-attribute-values $attrValues --output json | ConvertFrom-Json
        if ($items.Items.Count -gt 0) {
            Write-Host "   Eliminando $($items.Items.Count) registros de prueba..." -ForegroundColor Yellow
            foreach ($item in $items.Items) {
                $id = $item.id.S
                aws dynamodb delete-item --table-name $tableName --key "{`"id`":{`"S`":`"$id`"}}" | Out-Null
            }
            Write-Host "   Registros de prueba eliminados" -ForegroundColor Green
        } else {
            Write-Host "   No hay registros de prueba" -ForegroundColor Green
        }
    } else {
        Write-Host "   Saltando limpieza de DynamoDB" -ForegroundColor Gray
    }
} else {
    Write-Host "   Tabla SpeakerApplication no encontrada" -ForegroundColor Yellow
}

Write-Host "`n4 Limpiando CloudWatch Logs antiguos..." -ForegroundColor Yellow
$confirmLogs = Read-Host "   Eliminar logs de mas de 7 dias? (s/N)"

if ($confirmLogs -eq "s" -or $confirmLogs -eq "S") {
    $logGroups = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/amplify-awsug" --query "logGroups[].logGroupName" --output json | ConvertFrom-Json
    if ($logGroups.Count -gt 0) {
        Write-Host "   Encontrados $($logGroups.Count) log groups" -ForegroundColor Cyan
        $retentionDays = 7
        $cleaned_logs = 0
        foreach ($logGroup in $logGroups) {
            Write-Host "   Configurando retencion de $retentionDays dias en: $logGroup" -ForegroundColor Gray
            aws logs put-retention-policy --log-group-name $logGroup --retention-in-days $retentionDays | Out-Null
            $cleaned_logs++
        }
        Write-Host "   Configurada retencion en $cleaned_logs log groups" -ForegroundColor Green
    } else {
        Write-Host "   No se encontraron log groups" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Saltando limpieza de logs" -ForegroundColor Gray
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  LIMPIEZA COMPLETADA" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

Write-Host "Resumen:" -ForegroundColor White
Write-Host "   - Event Source Mappings: Verificados" -ForegroundColor Green
Write-Host "   - EventBridge Schedules: Verificados" -ForegroundColor Green
Write-Host "   - DynamoDB Records: Verificados" -ForegroundColor Green
Write-Host "   - CloudWatch Logs: Verificados`n" -ForegroundColor Green
