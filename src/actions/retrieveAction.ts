import { Action, ActionResult } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

export const retrieveAction: Action = {
  name: "RETRIEVE_FROM_ARWEAVE",
  description:
    "Retrieves data from the Arweave network with ArLocal development support",

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to retrieving data
    const text = message.content.text.toLowerCase();
    return (
      (text.includes("retrieve") ||
        text.includes("get") ||
        text.includes("fetch")) &&
      text.includes("arweave") &&
      (text.includes("data") ||
        text.includes("content") ||
        text.includes("transaction"))
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
          actionName: "RETRIEVE_FROM_ARWEAVE",
          errorMessage: "Callback function is not available",
        },
      };
    }
    // Get the Arweave service first for use in error handling
    const arweaveService = runtime.getService<ArweaveService>("arweave");

    try {
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
            actionName: "RETRIEVE_FROM_ARWEAVE",
            errorMessage: "Arweave service not available",
          },
        };
      }

      // Check if we're in ArLocal mode for enhanced guidance
      const isArLocalMode = arweaveService.isArLocalMode();
      const networkMode = isArLocalMode ? "ArLocal" : "Arweave";

      // Extract transaction ID from message or state
      const text = message.content.text || "";
      // Look for a transaction ID in the message (43 character base64url string)
      const transactionIdMatch = text.match(/[a-zA-Z0-9_-]{43}/);
      const transactionId =
        state?.values?.transactionId ||
        (transactionIdMatch ? transactionIdMatch[0] : null);

      if (!transactionId) {
        let errorMessage = `Please provide a transaction ID to retrieve data from ${networkMode}.`;

        if (isArLocalMode) {
          errorMessage += "\n\n💡 ArLocal Development Tip:";
          errorMessage +=
            "\n• Transaction IDs are 43-character base64url strings";
          errorMessage +=
            "\n• Make sure the transaction has been mined/confirmed";
          errorMessage += "\n• Check transaction status first if unsure";
        }

        await callback({
          text: errorMessage,
          error: true,
        });

        return {
          success: false,
          text: "Transaction ID not provided",
          error: new Error("Transaction ID not provided"),
          data: {
            actionName: "RETRIEVE_FROM_ARWEAVE",
            errorMessage: "Transaction ID not provided",
          },
        };
      }

      // ArLocal-specific pre-retrieval guidance
      if (isArLocalMode) {
        try {
          // Check transaction status first to provide better guidance
          const status =
            await arweaveService.getTransactionStatus(transactionId);

          if (status.status === 202) {
            // Transaction is pending
            const arLocalConfig = arweaveService.getArLocalConfig();
            let pendingMessage = `⏳ Transaction ${transactionId} is PENDING in ArLocal.`;
            pendingMessage +=
              "\n\nData cannot be retrieved until the transaction is confirmed.";

            if (arLocalConfig?.networkInfo) {
              const queueLength = arLocalConfig.networkInfo.queue_length;
              pendingMessage += `\n\n📋 Current Status:`;
              pendingMessage += `\n• ${queueLength} transaction(s) in queue`;
              pendingMessage += `\n• ${ArLocalUtils.createMiningGuidance(queueLength)}`;
            }

            pendingMessage += "\n\n🔧 Next Steps:";
            pendingMessage +=
              "\n1. Mine transactions: GET http://localhost:1984/mine";
            pendingMessage += "\n2. Retry data retrieval after mining";

            await callback({
              text: pendingMessage,
              error: true,
            });

            return {
              success: false,
              text: "Transaction pending confirmation",
              error: new ArweaveError(
                "Transaction is pending confirmation in ArLocal",
                ArweaveErrorCode.MINING_REQUIRED,
                undefined,
                { transactionId, status: status.status },
              ),
              data: {
                actionName: "RETRIEVE_FROM_ARWEAVE",
                errorMessage: "Transaction pending confirmation",
                arLocalGuidance: {
                  transactionStatus: "pending",
                  miningRequired: true,
                  miningEndpoint: "http://localhost:1984/mine",
                  statusEndpoint: `http://localhost:1984/tx/${transactionId}/status`,
                },
              },
            };
          }
        } catch (statusError) {
          // Continue with retrieval even if status check fails
          console.warn("Could not check transaction status:", statusError);
        }
      }

      // Retrieve data from Arweave/ArLocal
      const data = await arweaveService.retrieveData(transactionId);

      // Prepare response with ArLocal-specific information
      let responseText = `Data retrieved successfully from ${networkMode}! Transaction: ${transactionId}`;

      if (isArLocalMode) {
        responseText += "\n\n📋 ArLocal Development Info:";
        responseText += "\n• Transaction was confirmed and data is available";
        responseText += `\n• Data size: ${data.length} characters`;
        responseText += "\n• Data is stored locally in ArLocal";
      }

      // Send response to user with enhanced information
      await callback({
        text: responseText,
        action: "RETRIEVE_FROM_ARWEAVE",
      });

      return {
        success: true,
        text: `Data retrieved from transaction: ${transactionId}`,
        values: {
          transactionId: transactionId,
          retrievedData: data,
          retrievalTime: Date.now(),
          networkMode: networkMode,
          isArLocal: isArLocalMode,
          dataSize: data.length,
        },
        data: {
          actionName: "RETRIEVE_FROM_ARWEAVE",
          transactionId: transactionId,
          retrievedData: data,
          arweaveUrl: isArLocalMode
            ? `http://localhost:1984/${transactionId}`
            : `https://arweave.net/${transactionId}`,
          networkMode: networkMode,
          arLocalGuidance: isArLocalMode
            ? {
                transactionStatus: "confirmed",
                dataAvailable: true,
                localUrl: `http://localhost:1984/${transactionId}`,
              }
            : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Enhanced error handling for ArLocal-specific issues
      let enhancedErrorMessage = `Failed to retrieve data: ${errorMessage}`;

      if (error instanceof ArweaveError) {
        if (error.code === ArweaveErrorCode.ARLOCAL_NOT_RUNNING) {
          enhancedErrorMessage += "\n\n🔧 ArLocal Troubleshooting:";
          enhancedErrorMessage += "\n• Ensure ArLocal is running: npx arlocal";
          enhancedErrorMessage +=
            "\n• Check ArLocal is accessible at http://localhost:1984";
          enhancedErrorMessage += "\n• Or switch to mainnet configuration";
        } else if (error.code === ArweaveErrorCode.MINING_REQUIRED) {
          enhancedErrorMessage += "\n\n🔧 ArLocal Mining Required:";
          enhancedErrorMessage += "\n• Transaction is pending confirmation";
          enhancedErrorMessage +=
            "\n• Mine transactions: GET http://localhost:1984/mine";
          enhancedErrorMessage += "\n• Retry retrieval after mining";
        } else if (error.code === ArweaveErrorCode.DATA_NOT_FOUND) {
          enhancedErrorMessage += "\n\n🔧 Data Not Found:";
          enhancedErrorMessage += "\n• Verify the transaction ID is correct";
          enhancedErrorMessage +=
            "\n• Check if transaction exists and is confirmed";
          if (arweaveService && arweaveService.isArLocalMode()) {
            enhancedErrorMessage +=
              "\n• Ensure transaction was mined in ArLocal";
          }
        }
      }

      await callback({
        text: enhancedErrorMessage,
        error: true,
      });

      return {
        success: false,
        text: "Failed to retrieve data",
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: "RETRIEVE_FROM_ARWEAVE",
          errorMessage: errorMessage,
          enhancedErrorMessage: enhancedErrorMessage,
        },
      };
    }
  },
};
