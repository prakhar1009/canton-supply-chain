# Canton Supply Chain Provenance

This project provides a robust, production-ready implementation of a supply chain provenance and tracking system using Daml smart contracts, running on the Canton network. It models the lifecycle of physical assets from manufacturing to retail, ensuring an immutable and auditable trail of custody.

The core principle is to represent each physical asset as a digital contract on a distributed ledger. Transfers of custody are modeled as atomic, multi-party workflows, guaranteeing that ownership changes are consistent and agreed upon by all relevant parties. Canton's privacy model ensures that sensitive commercial details are only shared on a need-to-know basis among the involved stakeholders.

## Features

-   **End-to-End Provenance:** Creates a verifiable, immutable history for every asset in the supply chain.
-   **Atomic Handovers:** Guarantees that the transfer of custody is an all-or-nothing operation, preventing errors and disputes.
-   **Role-Based Permissions:** Clearly defined roles (Manufacturer, Logistics, Customs, Retailer) with specific rights and obligations.
-   **Real-time Visibility:** All authorized stakeholders have a shared, consistent, and real-time view of the asset's status and location.
-   **Privacy by Design:** Leverages Canton's underlying privacy model to ensure that transaction details are only visible to the signatories and observers of a given contract.
-   **Extensible Model:** The Daml model can be easily extended to include more complex workflows, such as quality assurance checks, financing, and regulatory approvals.

## Core Workflow

The system models the journey of a physical good through a typical supply chain:

1.  **Manufacturing:** The `Manufacturer` creates a digital representation of a physical asset on the ledger. This `Asset` contract contains key details like serial number, product type, and manufacturing date.
2.  **Logistics Handover:** The `Manufacturer` proposes a transfer to a `Logistics` provider. The provider reviews the proposal and accepts, atomically creating a new `Asset` contract under their custody and archiving the old one.
3.  **Customs Clearance:** The `Logistics` provider presents the asset to `Customs` for inspection. A `Customs` agent can inspect the asset and attest to its clearance, adding a verifiable claim to the asset's data.
4.  **Retailer Delivery:** Once cleared, the `Logistics` provider initiates the final handover to the `Retailer`. The `Retailer` accepts delivery, taking final custody of the asset.

Each step in this process is a Daml choice that can only be exercised by the authorized party, creating a cryptographically secure audit trail.

## Technology Stack

-   **Smart Contract Language:** [Daml](https://daml.com/)
-   **Underlying Ledger:** [Canton](https://www.canton.io/)
-   **Build & Package Manager:** [DPM (Digital Asset Package Manager)](https://docs.digitalasset.com/dpm/index.html)
-   **SDK Version:** `3.4.0`

## Project Structure

```
.
├── daml/                      # Daml smart contract source code
│   ├── Daml/Asset.daml        # Core Asset template
│   ├── Daml/Roles.daml        # Party role contracts
│   └── Daml/Transfer.daml     # Transfer proposal workflow
├── test/                      # Daml Script tests
│   └── Test/Main.daml
├── .gitignore
├── daml.yaml                  # Daml package configuration
└── README.md                  # This file
```

## Getting Started

### Prerequisites

-   [DPM (Digital Asset Package Manager)](https://docs.digitalasset.com/dpm/index.html) version compatible with SDK `3.4.0`.

You can install DPM with the following command:
```bash
curl https://get.digitalasset.com/install/install.sh | sh
```

### Build and Test

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/canton-supply-chain.git
    cd canton-supply-chain
    ```

2.  **Build the Daml model:**
    This command compiles the Daml code into a DAR (Daml Archive) file, which is the deployable unit.
    ```bash
    dpm build
    ```
    The output will be located at `.daml/dist/canton-supply-chain-0.1.0.dar`.

3.  **Run the tests:**
    This command executes the Daml Script tests defined in the `test/` directory to verify the contract logic.
    ```bash
    dpm test
    ```

### Run Locally with Canton Sandbox

1.  **Start the Canton sandbox:**
    This command starts a local Canton ledger, which includes a JSON API endpoint for application integration.
    ```bash
    dpm sandbox
    ```
    The sandbox exposes two key services:
    -   **Ledger gRPC API:** `localhost:6866`
    -   **HTTP JSON API:** `localhost:7575` (useful for web UIs and integrations)

2.  **(Optional) Upload the DAR:**
    The `dpm sandbox` command typically uploads the project DAR automatically. If you need to do it manually (e.g., for a running sandbox), you can use the `dpm ledger upload-dar` command.

3.  **(Optional) Run setup script:**
    You can use Daml Script to initialize the ledger with parties and initial contracts.
    ```bash
    dpm script --dar .daml/dist/canton-supply-chain-0.1.0.dar \
      --script-name Test.Main:setup \
      --ledger-host localhost --ledger-port 6866
    ```