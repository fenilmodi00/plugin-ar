import { Action, ActionResult } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

export const transferAction: Action = {
  name: "TRANSFER_AR_TOKENS",
  description:
    "Transfers AR tokens to another wallet with ArLocal development support and token minting",

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to transferring tokens
    const text = message.content.text.toLowerCase();
    return (
      (text.includes("transfer") || text.includes("send")) &&
      text.includes("ar") &&
      text.includes("tokens") &&
      (text.includes("wallet") || text.includes("address"))
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
          actionName: "TRANSFER_AR_TOKENS",
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
            actionName: "TRANSFER_AR_TOKENS",
            errorMessage: "Arweave service not available",
          },
        };
      }

      // Check if we're in ArLocal mode for enhanced guidance
      const isArLocalMode = arweaveService.isArLocalMode();
      const networkMode = isArLocalMode ? "ArLocal" : "Arweave";

      // Extract transfer details from message or state
      const text = message.content.text || "";
      const targetAddress =
        state?.values?.targetAddress ||
        // Look for Arweave address (43 character base64url string)
        text.match(/[a-zA-Z0-9_-]{43}/)?.[0] ||
        null;

      const amount =
        state?.values?.amount ||
        // Look for amount pattern (number followed by AR)
        parseFloat(text.match(/(\d+(\.\d+)?)\s*ar/i)?.[1] || "0");

      if (!targetAddress) {
        let errorMessage =
          "Please provide a target wallet address to transfer AR tokens.";

        if (isArLocalMode) {
          errorMessage += "\n\n💡 ArLocal Development Tip:";
          errorMessage +=
            "\n• Use any valid 43-character Arweave address format";
          errorMessage += "\n• You can create test wallets for development";
        }

        await callback({
          text: errorMessage,
          error: true,
        });

        return {
          success: false,
          text: "Target address not provided",
          error: new Error("Target address not provided"),
          data: {
            actionName: "TRANSFER_AR_TOKENS",
            errorMessage: "Target address not provided",
          },
        };
      }

      if (amount <= 0) {
        let errorMessage =
          "Please provide a valid amount of AR tokens to transfer.";

        if (isArLocalMode) {
          errorMessage += "\n\n💡 ArLocal Development Tip:";
          errorMessage +=
            "\n• You can mint test tokens if your wallet balance is low";
          errorMessage +=
            "\n• Use: GET http://localhost:1984/mint/{address}/{winston_amount}";
        }

        await callback({
          text: errorMessage,
          error: true,
        });

        return {
          success: false,
          text: "Invalid amount provided",
          error: new Error("Invalid amount provided"),
          data: {
            actionName: "TRANSFER_AR_TOKENS",
            errorMessage: "Invalid amount provided",
          },
        };
      }

      // ArLocal-specific pre-transfer guidance
      if (isArLocalMode) {
        try {
          // Check wallet balance and suggest minting if needed
          const balance = await arweaveService.getWalletBalance();
          const balanceAR = parseFloat(balance.ar);

          if (balanceAR < amount) {
            const shortfall = amount - balanceAR;
            const shortfallWinston = arweaveService.arweave.ar.arToWinston(
              shortfall.toString(),
            );
            const walletAddress = await arweaveService.getWalletAddress();

            await callback({
              text: `⚠️ Insufficient balance for transfer!\n\nCurrent balance: ${balanceAR} AR\nRequired: ${amount} AR\nShortfall: ${shortfall} AR\n\n🔧 ArLocal Token Minting:\nMint tokens to your wallet: GET http://localhost:1984/mint/${walletAddress}/${shortfallWinston}\n\nAfter minting, retry the transfer.`,
              error: true,
            });

            return {
              success: false,
              text: "Insufficient balance",
              error: new Error("Insufficient balance"),
              data: {
                actionName: "TRANSFER_AR_TOKENS",
                errorMessage: "Insufficient balance",
                arLocalGuidance: {
                  currentBalance: balanceAR,
                  requiredAmount: amount,
                  shortfall: shortfall,
                  mintingEndpoint: `http://localhost:1984/mint/${walletAddress}/${shortfallWinston}`,
                  walletAddress: walletAddress,
                },
              },
            };
          }
        } catch (balanceError) {
          // Continue with transfer even if balance check fails
          console.warn("Could not check wallet balance:", balanceError);
        }
      }

      // Transfer tokens
      const transactionId = await arweaveService.transferTokens(
        targetAddress,
        amount.toString(),
      );

      // Prepare response with ArLocal-specific guidance
      let responseText = `Successfully transferred ${amount} AR tokens to ${targetAddress}! Transaction ID: ${transactionId}`;
      let workflowInstructions = "";

      if (isArLocalMode) {
        // Get current ArLocal configuration for mining guidance
        const arLocalConfig = arweaveService.getArLocalConfig();

        responseText += "\n\n📋 ArLocal Development Workflow:";
        responseText +=
          "\n• Transfer transaction is currently PENDING confirmation";
        responseText += "\n• Tokens will not be transferred until mined";

        if (arLocalConfig?.networkInfo) {
          const queueLength = arLocalConfig.networkInfo.queue_length;
          responseText += `\n• ${queueLength} transaction(s) in queue`;

          workflowInstructions = ArLocalUtils.createMiningGuidance(queueLength);
          responseText += `\n• ${workflowInstructions}`;
        }

        responseText += "\n\n🔧 Next Steps:";
        responseText +=
          "\n1. Mine transactions to confirm: GET http://localhost:1984/mine";
        responseText += "\n2. Check transaction status to verify confirmation";
        responseText += "\n3. Verify recipient balance after confirmation";
      }

      // Send response to user with enhanced guidance
      await callback({
        text: responseText,
        action: "TRANSFER_AR_TOKENS",
      });

      return {
        success: true,
        text: `Transferred ${amount} AR tokens to ${targetAddress}`,
        values: {
          targetAddress: targetAddress,
          amount: amount,
          transactionId: transactionId,
          transferTime: Date.now(),
          networkMode: networkMode,
          isArLocal: isArLocalMode,
          workflowInstructions: workflowInstructions,
        },
        data: {
          actionName: "TRANSFER_AR_TOKENS",
          targetAddress: targetAddress,
          amount: amount,
          transactionId: transactionId,
          arweaveUrl: isArLocalMode
            ? `http://localhost:1984/${transactionId}`
            : `https://arweave.net/${transactionId}`,
          networkMode: networkMode,
          arLocalGuidance: isArLocalMode
            ? {
                miningRequired: true,
                miningEndpoint: "http://localhost:1984/mine",
                statusEndpoint: `http://localhost:1984/tx/${transactionId}/status`,
                instructions: workflowInstructions,
                tokenMintingEndpoint: `http://localhost:1984/mint/{address}/{winston_amount}`,
              }
            : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Enhanced error handling for ArLocal-specific issues
      let enhancedErrorMessage = `Failed to transfer tokens: ${errorMessage}`;

      if (error instanceof ArweaveError) {
        if (error.code === ArweaveErrorCode.ARLOCAL_NOT_RUNNING) {
          enhancedErrorMessage += "\n\n🔧 ArLocal Troubleshooting:";
          enhancedErrorMessage += "\n• Ensure ArLocal is running: npx arlocal";
          enhancedErrorMessage +=
            "\n• Check ArLocal is accessible at http://localhost:1984";
          enhancedErrorMessage += "\n• Or switch to mainnet configuration";
        } else if (error.code === ArweaveErrorCode.WALLET_NOT_CONNECTED) {
          enhancedErrorMessage += "\n\n🔧 Wallet Configuration:";
          enhancedErrorMessage +=
            "\n• Set ARWEAVE_WALLET_KEY in your environment";
          enhancedErrorMessage += "\n• Or create a new wallet first";
        }
      }

      await callback({
        text: enhancedErrorMessage,
        error: true,
      });

      return {
        success: false,
        text: "Failed to transfer tokens",
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: "TRANSFER_AR_TOKENS",
          errorMessage: errorMessage,
          enhancedErrorMessage: enhancedErrorMessage,
        },
      };
    }
  },
};
