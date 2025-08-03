import { Provider } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";

export const arLocalProvider: Provider = {
  name: "ARLOCAL_STATUS",
  description:
    "Provides ArLocal network status and mining guidance for development context",
  dynamic: true,

  get: async (runtime: any, message: any, state: any) => {
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService("arweave") as ArweaveService;
      if (!arweaveService) {
        return {
          text: "Arweave service is not available.",
        };
      }

      // Check if we're in ArLocal mode
      if (!arweaveService.isArLocalMode()) {
        return {
          text: "Connected to Arweave mainnet. ArLocal features are not available.",
          values: {
            isArLocal: false,
            networkType: "mainnet",
          },
          data: {
            isArLocal: false,
            networkType: "mainnet",
          },
        };
      }

      // Get ArLocal configuration
      const arLocalConfig = arweaveService.getArLocalConfig();
      if (!arLocalConfig || !arLocalConfig.networkInfo) {
        return {
          text: "ArLocal configuration detected but server is not running. Please start ArLocal on localhost:1984.",
          values: {
            isArLocal: true,
            isRunning: false,
            networkType: "arlocal",
          },
          data: {
            isArLocal: true,
            isRunning: false,
            networkType: "arlocal",
          },
        };
      }

      const { networkInfo } = arLocalConfig;
      const pendingTransactions = networkInfo.queue_length;
      const miningRequired = pendingTransactions > 0;

      // Create status message
      let statusText = `ArLocal Development Network Status:
- Network: ${networkInfo.network}
- Height: ${networkInfo.height}
- Blocks: ${networkInfo.blocks}
- Pending Transactions: ${pendingTransactions}
- Peers: ${networkInfo.peers}
- Node State Latency: ${networkInfo.node_state_latency}ms`;

      // Add mining guidance
      if (miningRequired) {
        statusText += `

Mining Required:
- ${pendingTransactions} transaction(s) are pending confirmation
- Transactions will remain pending until manually mined
- Use the mine endpoint or mining action to confirm transactions
- Mining will process all pending transactions at once`;
      } else {
        statusText += `

Mining Status:
- No pending transactions
- All transactions are confirmed
- Mining not currently required`;
      }

      // Add development guidance
      statusText += `

Development Tips:
- ArLocal runs on localhost:1984 with HTTP protocol
- All transactions require manual mining for confirmation
- Use token minting for testing transfers without real AR
- Switch to mainnet by updating ARWEAVE_GATEWAY environment variable`;

      return {
        text: statusText,
        values: {
          isArLocal: true,
          isRunning: true,
          networkType: "arlocal",
          networkName: networkInfo.network,
          height: networkInfo.height,
          blocks: networkInfo.blocks,
          pendingTransactions,
          miningRequired,
          peers: networkInfo.peers,
          nodeStateLatency: networkInfo.node_state_latency,
        },
        data: {
          isArLocal: true,
          isRunning: true,
          networkType: "arlocal",
          networkInfo,
          arLocalConfig,
          miningGuidance:
            ArLocalUtils.createMiningGuidance(pendingTransactions),
          statusMessage: ArLocalUtils.createStatusMessage(arLocalConfig),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        text: `Failed to get ArLocal status: ${errorMessage}`,
        values: {
          isArLocal: false,
          isRunning: false,
          error: errorMessage,
        },
        data: {
          error: errorMessage,
        },
      };
    }
  },
};
