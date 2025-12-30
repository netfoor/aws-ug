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

# Estas variables se sobrescribirán con el contenido de amplify_outputs.json si existe
REGION="us-east-1"
USER_POOL_ID=""

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

echo "🔍 Obteniendo User Pool ID desde amplify_outputs.json..."
USER_POOL_ID=$(jq -r '.auth.user_pool_id' amplify_outputs.json)

if [[ -z "$USER_POOL_ID" || "$USER_POOL_ID" == "null" ]]; then
  echo "❌ No se pudo obtener el UserPoolId desde outputs"
  exit 1
fi

echo "✅ Cognito User Pool detectado: $USER_POOL_ID"

# Obtenemos Username y Email. El "|" al final de Attributes asegura que devuelva null si no hay email.
USERS_DATA=$(aws cognito-idp list-users \
  --user-pool-id "$USER_POOL_ID" \
  --query "Users[].[Username, Attributes[?Name=='email'].Value | [0]]" \
  --output text)

if [[ -z "$USERS_DATA" || "$USERS_DATA" == "None" ]]; then
  echo "✅ No se encontraron usuarios para eliminar."
else
  echo "Usuarios encontrados para eliminar:"
  # Mostramos la lista formateada (Username - Email)
  echo "$USERS_DATA" | awk '{printf "   - ID: %-40s | Email: %s\n", $1, $2}'

  echo
  read -p "¿Deseas continuar con la eliminación de TODOS estos usuarios? (s/n): " CONFIRMATION
  if [[ "$CONFIRMATION" != "s" ]]; then
    echo "❌ Operación cancelada por el usuario."
    exit 0
  else
    echo "🗑️ Eliminando usuarios de Cognito..."
    # Usamos un while para leer línea por línea y separar Username de Email
    while read -r USERNAME EMAIL; do
      if [[ -n "$USERNAME" ]]; then
        echo "   - Eliminando: $EMAIL ($USERNAME)..."
        aws cognito-idp admin-delete-user \
          --user-pool-id "$USER_POOL_ID" \
          --username "$USERNAME"
      fi
    done <<< "$USERS_DATA"
    echo "✅ Limpieza completada exitosamente."
  fi
fi

