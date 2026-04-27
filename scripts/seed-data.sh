#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# canton-supply-chain seed script
#
# Description:
#   This script sets up the initial state for the supply chain demo by:
#   1. Allocating parties (Manufacturer, Logistics, Customs, Retailer).
#   2. Creating initial Asset contracts on the ledger.
#   3. Generating a .env.local file for the frontend to use these parties.
#
# Usage:
#   Ensure a Canton sandbox is running, then execute this script from the
#   `scripts/` directory:
#   ./seed-data.sh
#
# Requirements:
#   - curl
#   - jq
#   - openssl (for JWT generation)
# ==============================================================================

# --- Configuration ---
LEDGER_HOST=${LEDGER_HOST:-localhost}
LEDGER_PORT=${LEDGER_PORT:-7575}
LEDGER_URL="http://${LEDGER_HOST}:${LEDGER_PORT}"
# The default secret used by `dpm sandbox`
SECRET_KEY="secret"
# Output file for frontend environment variables
ENV_FILE="../frontend/.env.local"


# --- Helper Functions ---

# Check for required command-line tools
check_tools() {
  for tool in curl jq openssl; do
    if ! command -v $tool &> /dev/null; then
      echo "Error: Required tool '$tool' is not installed. Please install it to continue." >&2
      exit 1
    fi
  done
}

# Base64 URL encode for JWT
base64_url_encode() {
  echo -n "$1" | openssl base64 -e -A | tr '+/' '-_' | tr -d '='
}

# Generate a JWT for a given list of parties.
# If no parties are provided, an admin token (without actAs) is created.
generate_jwt() {
  local act_as=("$@")
  local payload
  if [ ${#act_as[@]} -eq 0 ]; then
    # Admin token for party management
    payload='{"ledgerId": "sandbox", "applicationId": "supply-chain-seeder"}'
  else
    # Party-specific token
    local parties_json=$(printf '"%s",' "${act_as[@]}" | sed 's/,$//')
    payload=$(printf '{"ledgerId": "sandbox", "applicationId": "supply-chain-seeder", "actAs": [%s]}' "$parties_json")
  fi

  local header='{"alg": "HS256", "typ": "JWT"}'
  local encoded_header=$(base64_url_encode "$header")
  local encoded_payload=$(base64_url_encode "$payload")
  local signature_input="${encoded_header}.${encoded_payload}"
  local signature=$(echo -n "${signature_input}" | openssl dgst -sha256 -hmac "${SECRET_KEY}" -binary | base64_url_encode)
  echo "${signature_input}.${signature}"
}

# Allocate a party and return its full party ID string
allocate_party() {
  local hint=$1
  local display_name=$2
  local admin_token=$3

  echo "  -> Allocating party with hint '$hint' and display name '$display_name'..."
  local response
  response=$(curl -s -X POST \
    -H "Authorization: Bearer ${admin_token}" \
    -H "Content-Type: application/json" \
    -d "{\"identifierHint\": \"${hint}\", \"displayName\": \"${display_name}\"}" \
    "${LEDGER_URL}/v2/parties/allocate")

  local party_id=$(echo "$response" | jq -r '.identifier')
  if [ -z "$party_id" ] || [ "$party_id" == "null" ]; then
    echo "Error: Failed to allocate party '$hint'. Response: $response" >&2
    exit 1
  fi
  echo "     - Allocated as: ${party_id}"
  echo "$party_id"
}

# Create a new asset contract on the ledger
create_asset() {
  local manufacturer_token=$1
  local asset_id=$2
  local description=$3
  local manufacturer_party=$4
  local owner_party=$5
  local logistics_party=$6
  local customs_party=$7
  local retailer_party=$8

  echo "  -> Creating asset '$asset_id'..."
  local payload
  payload=$(cat <<EOF
{
  "templateId": "SupplyChain.Asset:Asset",
  "payload": {
    "assetId": "${asset_id}",
    "description": "${description}",
    "manufacturer": "${manufacturer_party}",
    "owner": "${owner_party}",
    "observers": ["${logistics_party}", "${customs_party}", "${retailer_party}"]
  }
}
EOF
)

  local response
  response=$(curl -s -X POST \
    -H "Authorization: Bearer ${manufacturer_token}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "${LEDGER_URL}/v1/create")

  local contract_id=$(echo "$response" | jq -r '.result.contractId')
  if [ -z "$contract_id" ] || [ "$contract_id" == "null" ]; then
      echo "Error: Failed to create asset '$asset_id'. Is the sandbox running and the DAR loaded? Response: $response" >&2
      exit 1
  fi
  echo "     - Created with Contract ID: ${contract_id}"
}

# --- Main Execution ---

main() {
  check_tools
  echo "🚀 Starting Supply Chain Data Seeding Script..."
  echo "   Ledger URL: ${LEDGER_URL}"

  echo -e "\n(1/5) Generating Admin JWT for party allocation..."
  local admin_token
  admin_token=$(generate_jwt)

  echo -e "\n(2/5) Allocating all required parties..."
  MANUFACTURER=$(allocate_party "Manufacturer" "Global Electronics Inc." "$admin_token")
  LOGISTICS=$(allocate_party "Logistics" "SwiftShip Logistics" "$admin_token")
  CUSTOMS=$(allocate_party "Customs" "National Customs Bureau" "$admin_token")
  RETAILER=$(allocate_party "Retailer" "TechHaven Retail" "$admin_token")

  echo -e "\n(3/5) Generating Manufacturer's JWT for asset creation..."
  local manufacturer_token
  manufacturer_token=$(generate_jwt "$MANUFACTURER")

  echo -e "\n(4/5) Creating initial assets owned by the manufacturer..."
  create_asset "$manufacturer_token" \
    "LAPTOP-SN-12345" \
    "15-inch Pro Laptop, Silver, 16GB RAM, 512GB SSD" \
    "$MANUFACTURER" "$MANUFACTURER" "$LOGISTICS" "$CUSTOMS" "$RETAILER"

  create_asset "$manufacturer_token" \
    "PHONE-SN-98765" \
    "6.7-inch Smartphone, Midnight Black, 256GB" \
    "$MANUFACTURER" "$MANUFACTURER" "$LOGISTICS" "$CUSTOMS" "$RETAILER"

  create_asset "$manufacturer_token" \
    "TABLET-SN-55501" \
    "11-inch Tablet, Space Gray, Wi-Fi + Cellular, 128GB" \
    "$MANUFACTURER" "$MANUFACTURER" "$LOGISTICS" "$CUSTOMS" "$RETAILER"

  echo -e "\n(5/5) Creating frontend environment file at ${ENV_FILE}..."
  rm -f "$ENV_FILE"
  cat > "$ENV_FILE" << EOF
# This file is auto-generated by scripts/seed-data.sh
# Do not edit manually.

REACT_APP_LEDGER_URL=${LEDGER_URL}
REACT_APP_MANUFACTURER_PARTY=${MANUFACTURER}
REACT_APP_LOGISTICS_PARTY=${LOGISTICS}
REACT_APP_CUSTOMS_PARTY=${CUSTOMS}
REACT_APP_RETAILER_PARTY=${RETAILER}
EOF
  echo "   - Wrote configuration to ${ENV_FILE}"

  echo -e "\n✅ Seeding complete!"
  echo "Parties created:"
  echo "  - Manufacturer: ${MANUFACTURER}"
  echo "  - Logistics:    ${LOGISTICS}"
  echo "  - Customs:      ${CUSTOMS}"
  echo "  - Retailer:     ${RETAILER}"
}

# Run the main function
main