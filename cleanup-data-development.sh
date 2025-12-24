#!/usr/bin/env bash
# Script para limpiar datos de desarrollo en AWS Amplify
# Mover este archivo a la raíz del proyecto Amplify antes de ejecutarlo

set -euo pipefail

echo
echo "🚀 Iniciando limpieza de datos de desarrollo en AWS Amplify..."
echo

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado. Por favor, instálalo y configura tus credenciales."
    exit 1
fi

echo "Verificando configuración de AWS CLI..."
echo "🔍 Verificando credenciales AWS..."
aws sts get-caller-identity > /dev/null
echo "✅ Credenciales válidas"

REGION="us-east-1"
PROFILE="default"
USER_POOL_ID="us-east-1_XXXXXXX"


if [[ ! -f amplify_outputs.json ]]; then
  echo "❌ No se encontró amplify_outputs.json"
  echo "Este script debe ejecutarse en la raíz del proyecto Amplify"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ jq no está instalado"
  echo "Instálalo con: sudo apt install jq"
  exit 1
fi
echo "🔍 Obteniendo User Pool ID con el nombre amplify_outputs.json..."

USER_POOL_ID=$(jq -r '.auth.user_pool_id' amplify_outputs.json)

if [[ -z "$USER_POOL_ID" || "$USER_POOL_ID" == "null" ]]; then
  echo "❌ No se pudo obtener el UserPoolId desde outputs"
  exit 1
fi

echo "✅ Cognito User Pool detectado: $USER_POOL_ID"

aws cognito-idp list-users \
  --user-pool-id "$USER_POOL_ID" \
  --query "Users[].Attributes[?Name=='email'].Value" \
  --output text 
