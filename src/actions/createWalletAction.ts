import { Action, ActionResult } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

export const createWalletAction: Action = {
  name: "CREATE_ARWEAVE_WALLET",
  description:
    "Creates a new Arweave wallet with ArLocal development support and token minting guidance",

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to creating a wallet
    const text = message.content.text.toLowerCase();
    return (
      text.includes("create") &&
      text.includes("wallet") &&
      text.includes("arweave")
    );
  },

  handler: async (
    runtime,
    message,
    state,
    options,
    callback,
  ): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: "Callback function is not available",
        error: new Error("Callback function is not available"),
        data: {
          actionName: "CREATE_ARWEAVE_WALLET",
          errorMessage: "Callback function is not available",
        },
      };
    }
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService<ArweaveService>("arweave");
      if (!arweaveService) {
        await callback({
          text: "Arweave service is not available.",
          error: true,
        });

        return {
          success: false,
          text: "Arweave service not available",
          error: new Error("Arweave service not available"),
          data: {
            actionName: "CREATE_ARWEAVE_WALLET",
            errorMessage: "Arweave service not available",
          },
        };
      }

      // Check if we're in ArLocal mode for enhanced guidance
      const isArLocalMode = arweaveService.isArLocalMode();
      const networkMode = isArLocalMode ? "ArLocal" : "Arweave";

      // Create a new wallet
      const wallet = await arweaveService.createWallet();

      // Prepare response with ArLocal-specific guidance
      let responseText = `Wallet created successfully for ${networkMode}! Address: ${wallet.address}`;

      if (isArLocalMode) {
        responseText += "\n\n📋 ArLocal Development Workflow:";
        responseText += "\n• Wallet created with 0 AR balance";
        responseText += "\n• Use token minting for development testing";
        responseText += "\n• Private key is for development use only";

        responseText += "\n\n🔧 Next Steps for ArLocal Development:";
        responseText +=
          "\n1. Save your private key securely (development only)";
        responseText += "\n2. Mint test tokens to your wallet:";
        responseText += `\n   GET http://localhost:1984/mint/${wallet.address}/{winston_amount}`;
        responseText += "\n3. Example: Mint 1 AR (1000000000000 winston):";
        responseText += `\n   GET http://localhost:1984/mint/${wallet.address}/1000000000000`;
        responseText +=
          "\n4. Use wallet for uploads, transfers, and other operations";

        responseText += "\n\n💡 ArLocal Development Tips:";
        responseText += "\n• 1 AR = 1,000,000,000,000 winston";
        responseText += "\n• Mint generous amounts for testing";
        responseText += "\n• Wallet works immediately after creation";
        responseText += "\n• No mainnet costs for development";
      } else {
        responseText +=
          "\n\nPlease save your private key securely - it cannot be recovered!";
        responseText +=
          "\n\n⚠️ Important: This wallet has 0 AR balance. You'll need to fund it before use.";
      }

      // Send response to user with enhanced guidance
      await callback({
        text: responseText,
        action: "CREATE_ARWEAVE_WALLET",
      });

      return {
        success: true,
        text: `Wallet created with address: ${wallet.address}`,
        values: {
          walletAddress: wallet.address,
          walletKey: wallet.key,
          walletCreationTime: Date.now(),
          networkMode: networkMode,
          isArLocal: isArLocalMode,
        },
        data: {
          actionName: "CREATE_ARWEAVE_WALLET",
          walletAddress: wallet.address,
          walletKey: JSON.stringify(wallet.key),
          networkMode: networkMode,
          arLocalGuidance: isArLocalMode
            ? {
                mintingEndpoint: `http://localhost:1984/mint/${wallet.address}/{winston_amount}`,
                exampleMinting: `http://localhost:1984/mint/${wallet.address}/1000000000000`,
                conversionNote: "1 AR = 1,000,000,000,000 winston",
                balanceEndpoint: `http://localhost:1984/wallet/${wallet.address}/balance`,
                developmentOnly: true,
              }
            : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Enhanced error handling for ArLocal-specific issues
      let enhancedErrorMessage = `Failed to create wallet: ${errorMessage}`;

      if (error instanceof ArweaveError) {
        if (error.code === ArweaveErrorCode.ARLOCAL_NOT_RUNNING) {
          enhancedErrorMessage += "\n\n🔧 ArLocal Troubleshooting:";
          enhancedErrorMessage += "\n• Ensure ArLocal is running: npx arlocal";
          enhancedErrorMessage +=
            "\n• Check ArLocal is accessible at http://localhost:1984";
          enhancedErrorMessage += "\n• Or switch to mainnet configuration";
        }
      }

      await callback({
        text: enhancedErrorMessage,
        error: true,
      });

      return {
        success: false,
        text: "Failed to create wallet",
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: "CREATE_ARWEAVE_WALLET",
          errorMessage: errorMessage,
          enhancedErrorMessage: enhancedErrorMessage,
        },
      };
    }
  },
};
