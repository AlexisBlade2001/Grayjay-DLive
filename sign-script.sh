#!/bin/sh

JS_FILE_PATH=$1
CONFIG_FILE_PATH=$2

printf "%s\n" "$SIGNING_PRIVATE_KEY" > tmp_private_key.pem

if ! openssl rsa -check -noout -in tmp_private_key.pem > /dev/null 2>&1; then
  echo "Invalid private key."
  rm tmp_private_key.pem
  exit 1
fi

SIGNATURE=$(openssl dgst -sha512 -sign tmp_private_key.pem "$JS_FILE_PATH" | base64 -w 0)
if [ $? -ne 0 ]; then
  echo "Failed to generate signature."
  rm tmp_private_key.pem
  exit 1
fi

PUBLIC_KEY=$(openssl rsa -pubout -in tmp_private_key.pem 2>/dev/null | sed '1d;$d' | tr -d '\n')
if [ -z "$PUBLIC_KEY" ]; then
  echo "Failed to extract public key."
  rm tmp_private_key.pem
  exit 1
fi

echo "SIGNATURE: $SIGNATURE"
echo "PUBLIC_KEY: $PUBLIC_KEY"

rm tmp_private_key.pem
jq --arg signature "$SIGNATURE" --arg publicKey "$PUBLIC_KEY" \
  '. + {scriptSignature: $signature, scriptPublicKey: $publicKey}' \
  "$CONFIG_FILE_PATH" > temp_config.json && mv temp_config.json "$CONFIG_FILE_PATH"

echo "JSON file updated successfully."
