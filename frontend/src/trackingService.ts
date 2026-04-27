// Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * This service provides a typed interface for interacting with the
 * Canton ledger's JSON API for the supply chain application. It handles
 * creating, querying, and exercising choices on the `Asset` contract.
 */

// In a production environment, the ledger URL should be configured via environment variables.
const LEDGER_URL = process.env.REACT_APP_LEDGER_URL || 'http://localhost:7575';

// The fully qualified template ID for the main Asset contract.
// Format: <DamlPackageName>.<ModuleName>:<TemplateName>
// This should match the `name` in daml.yaml and the module/template hierarchy.
const ASSET_TEMPLATE_ID = 'canton-supply-chain:SupplyChain.V1.Asset:Asset';

// --- Type Definitions ---
// In a larger project, these types would be generated from the DAR file
// using `dpm codegen-js` to ensure they are always in sync with the Daml models.

/**
 * Represents the payload of the `SupplyChain.V1.Asset:Asset` template.
 */
export interface Asset {
  assetId: string;
  description: string;
  manufacturer: string; // Party
  custodian: string;    // Party
  observers: string[];  // [Party]
  lastUpdated: string;  // Daml `Time`, represented as an ISO 8601 string
}

/**
 * Represents a contract on the ledger, as returned by the JSON API's query endpoint.
 */
export interface ActiveContract<T> {
  contractId: string;
  templateId: string;
  payload: T;
}

/**
 * Represents the data required to create a new Asset contract.
 */
export interface CreateAssetArgs {
  assetId: string;
  description: string;
  manufacturer: string;
  custodian: string;
  observers?: string[];
}

/**
 * A private helper function to handle common fetch logic, including authentication
 * headers and error handling for non-2xx responses from the JSON API.
 */
const handleApiRequest = async (token: string, endpoint: string, body: object) => {
  const response = await fetch(`${LEDGER_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Ledger API Error:", response.status, errorBody);
    throw new Error(`Ledger API request failed with status ${response.status}: ${errorBody}`);
  }

  const jsonResponse = await response.json();
  // The JSON API v1 nests the primary data under the `result` key.
  return jsonResponse.result;
};


// --- Public Service Functions ---

/**
 * Fetches all `Asset` contracts visible to the party associated with the token.
 *
 * @param token The JWT token for authentication, identifying the party.
 * @returns A promise that resolves to an array of active `Asset` contracts.
 */
export const fetchAssets = async (token: string): Promise<ActiveContract<Asset>[]> => {
  return handleApiRequest(token, '/v1/query', {
    templateIds: [ASSET_TEMPLATE_ID]
  });
};

/**
 * Fetches a single active `Asset` contract by its unique business identifier (`assetId`).
 * Note: This queries all visible assets and filters on the client-side. For large datasets,
 * a more performant approach would use a database populated by an integration like the
 * Participant Query Store (PQS) or a custom archival service.
 *
 * @param token The JWT token for authentication.
 * @param assetId The business ID of the asset to find.
 * @returns A promise that resolves to the active contract, or null if not found.
 */
export const fetchAssetById = async (token: string, assetId: string): Promise<ActiveContract<Asset> | null> => {
    const allAssets = await fetchAssets(token);
    return allAssets.find(c => c.payload.assetId === assetId) || null;
};

/**
 * Creates a new `Asset` contract on the ledger.
 * This corresponds to a manufacturer originating a new tracked item.
 *
 * @param token The JWT token of the party creating the asset (must be the manufacturer).
 * @param args The details of the asset to create.
 * @returns A promise that resolves to the newly created contract data.
 */
export const createAsset = async (token: string, args: CreateAssetArgs): Promise<ActiveContract<Asset>> => {
  const payload = {
    ...args,
    observers: args.observers || [],
    lastUpdated: new Date().toISOString(),
  };

  return handleApiRequest(token, '/v1/create', {
    templateId: ASSET_TEMPLATE_ID,
    payload: payload,
  });
};

/**
 * Transfers custody of an asset to a new party.
 * This exercises the `Transfer` choice on the `Asset` contract.
 *
 * @param token The JWT token of the current custodian.
 * @param contractId The ID of the `Asset` contract to transfer.
 * @param newCustodian The party ID of the new custodian.
 * @returns A promise that resolves to the result of the exercise command, which
 *          typically includes the events generated (e.g., archive and create).
 */
export const transferAsset = async (token: string, contractId: string, newCustodian: string): Promise<any> => {
  return handleApiRequest(token, '/v1/exercise', {
    templateId: ASSET_TEMPLATE_ID,
    contractId: contractId,
    choice: 'Transfer',
    argument: {
      newCustodian,
    },
  });
};