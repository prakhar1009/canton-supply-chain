#!/bin/bash
#
# Canton Supply Chain - Seeding Script
#
# This script populates a local Canton ledger (via the JSON API)
# with a set of initial parties and contracts to represent a basic
# supply chain scenario.
#
# Pre-requisites:
#   - A running Canton sandbox on localhost:7575 (`dpm sandbox`)
#   - `curl` and `jq` installed and available in your PATH.
#

set -euo pipefail

# --- Configuration ---
JSON_API_URL="http://localhost:7575"
LEDGER_ID="sandbox"
APP_ID="supply-chain-seeder"
# Template IDs are specified as Module:Template
TEMPLATE_ASSET="Asset:Asset"
TEMPLATE_SHIPMENT="Shipment:Shipment"

# --- Helper Functions ---

# Check for required commands
command -v curl >/dev/null 2>&1 || { echo >&2 "I require curl but it's not installed. Aborting."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "I require jq but it's not installed. Aborting."; exit 1; }

# Function to encode a string in Base64 URL format
b64url() {
  base64 | tr '+/' '-_' | tr -d '='
}

# Generates a JWT token for a given party.
# NOTE: This is an insecure method suitable ONLY for sandbox/dev environments.
generate_token() {
  local party_id=$1
  local header='{"alg":"HS256","typ":"JWT"}'
  local payload="{\"ledgerId\":\"${LEDGER_ID}\",\"applicationId\":\"${APP_ID}\",\"actAs\":[\"${party_id}\"]}"
  local b64_header=$(echo -n "${header}" | b64url)
  local b64_payload=$(echo -n "${payload}" | b64url)
  echo "${b64_header}.${b64_payload}."
}

# Allocates a new party on the ledger
allocate_party() {
  local display_name=$1
  local payload="{\"displayName\": \"${display_name}\"}"

  local response=$(curl -s -X POST \
    "${JSON_API_URL}/v2/parties/allocate" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  local party_id=$(echo "${response}" | jq -r '.identifier')
  if [ -z "$party_id" ] || [ "$party_id" == "null" ]; then
    echo >&2 "Failed to allocate party '${display_name}'. Response: ${response}"
    exit 1
  fi
  echo "${party_id}"
}

# Creates a new contract
create_contract() {
  local token=$1
  local template_id=$2
  local payload_json=$3
  local payload="{\"templateId\": \"${template_id}\", \"payload\": ${payload_json}}"

  local response=$(curl -s -X POST \
    "${JSON_API_URL}/v1/create" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "${payload}")

  local contract_id=$(echo "${response}" | jq -r '.result.contractId')
  if [ -z "$contract_id" ] || [ "$contract_id" == "null" ]; then
    echo >&2 "Failed to create contract '${template_id}'. Response: ${response}"
    exit 1
  fi
  echo "${contract_id}"
}

echo "--- Supply Chain Seeding Script ---"
echo "Targeting JSON API at ${JSON_API_URL}"

# 1. Allocate Parties
echo
echo "⚙️  Allocating parties..."
MANUFACTURER=$(allocate_party "MegaCorp")
CARRIER=$(allocate_party "SpeedyLogistics")
CUSTOMS=$(allocate_party "GlobalCustoms")
RETAILER=$(allocate_party "SuperRetail")

echo "  - Manufacturer: ${MANUFACTURER}"
echo "  - Carrier:      ${CARRIER}"
echo "  - Customs:      ${CUSTOMS}"
echo "  - Retailer:     ${RETAILER}"

# 2. Generate Auth Tokens
MANUFACTURER_TOKEN=$(generate_token "${MANUFACTURER}")

# 3. Create Assets
echo
echo "🏭 Creating initial assets as Manufacturer..."
asset_cids=()

# Asset 1: Laptops
payload_asset1=$(jq -n \
  --arg manufacturer "$MANUFACTURER" \
  --arg owner "$MANUFACTURER" \
  --arg assetId "LAP-2024-001" \
  --arg description "Box of 100 high-end laptops" \
  --argjson observers "[\"$CARRIER\", \"$CUSTOMS\", \"$RETAILER\"]" \
  '{manufacturer: $manufacturer, owner: $owner, assetId: $assetId, description: $description, observers: $observers}')
cid1=$(create_contract "${MANUFACTURER_TOKEN}" "${TEMPLATE_ASSET}" "${payload_asset1}")
asset_cids+=("${cid1}")
echo "  - Created Asset 'LAP-2024-001' with contractId ${cid1}"

# Asset 2: Monitors
payload_asset2=$(jq -n \
  --arg manufacturer "$MANUFACTURER" \
  --arg owner "$MANUFACTURER" \
  --arg assetId "MON-2024-042" \
  --arg description "Pallet of 50 4K monitors" \
  --argjson observers "[\"$CARRIER\", \"$CUSTOMS\", \"$RETAILER\"]" \
  '{manufacturer: $manufacturer, owner: $owner, assetId: $assetId, description: $description, observers: $observers}')
cid2=$(create_contract "${MANUFACTURER_TOKEN}" "${TEMPLATE_ASSET}" "${payload_asset2}")
asset_cids+=("${cid2}")
echo "  - Created Asset 'MON-2024-042' with contractId ${cid2}"

# 4. Create a Shipment to bundle the assets
echo
echo "🚚 Creating a shipment to bundle assets..."

# Build the JSON array of contract IDs
asset_cids_json=$(printf '%s\n' "${asset_cids[@]}" | jq -R . | jq -s .)

payload_shipment=$(jq -n \
  --arg shipper "$MANUFACTURER" \
  --arg carrier "$CARRIER" \
  --arg destParty "$RETAILER" \
  --arg source "MegaCorp Warehouse A" \
  --arg destination "SuperRetail Distribution Center" \
  --argjson assetCids "$asset_cids_json" \
  '{shipper: $shipper, carrier: $carrier, destinationParty: $destParty, source: $source, destination: $destination, assetCids: $assetCids}')

shipment_cid=$(create_contract "${MANUFACTURER_TOKEN}" "${TEMPLATE_SHIPMENT}" "${payload_shipment}")
echo "  - Created Shipment with contractId ${shipment_cid}"

echo
echo "✅ Seeding complete!"
echo "   You can now interact with these parties and contracts using the UI or API."
echo "   Manufacturer Party ID: ${MANUFACTURER}"
echo "   Carrier Party ID:      ${CARRIER}"
echo "   Retailer Party ID:     ${RETAILER}"
echo