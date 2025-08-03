import { Action, ActionResult } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

export const searchAction: Action = {
  name: "SEARCH_ARWEAVE",
  description:
    "Searches for transactions on the Arweave network with ArLocal development support",

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to searching
    const text = message.content.text.toLowerCase();
    return (
      (text.includes("search") ||
        text.includes("find") ||
        text.includes("query")) &&
      text.includes("arweave") &&
      (text.includes("data") ||
        text.includes("transaction") ||
        text.includes("content"))
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
          actionName: "SEARCH_ARWEAVE",
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
            actionName: "SEARCH_ARWEAVE",
            errorMessage: "Arweave service not available",
          },
        };
      }

      // Check if we're in ArLocal mode for enhanced guidance
      const isArLocalMode = arweaveService.isArLocalMode();
      const networkMode = isArLocalMode ? "ArLocal" : "Arweave";

      // Extract search criteria from message or state
      const text = message.content.text || "";
      const tags = state?.values?.tags || [];

      // If no tags provided, try to extract from message
      if (tags.length === 0) {
        // Look for tag patterns in the message (e.g., "tag:content-type=text/html")
        const tagMatches = text.matchAll(
          /tag:([a-zA-Z0-9_-]+)=([a-zA-Z0-9._-]+)/g,
        );
        for (const match of tagMatches) {
          tags.push({
            name: match[1],
            values: [match[2]],
          });
        }
      }

      if (tags.length === 0) {
        let errorMessage = `Please provide search criteria using tags (e.g., "search ${networkMode} with tag:content-type=text/html").`;

        if (isArLocalMode) {
          errorMessage += "\n\n💡 ArLocal Development Tips:";
          errorMessage += "\n• Search only includes confirmed transactions";
          errorMessage +=
            "\n• Mine pending transactions first for complete results";
          errorMessage +=
            "\n• Common tags: Content-Type, App-Name, App-Version";
          errorMessage += "\n• Example: tag:Content-Type=application/json";
        }

        await callback({
          text: errorMessage,
          error: true,
        });

        return {
          success: false,
          text: "Search criteria not provided",
          error: new Error("Search criteria not provided"),
          data: {
            actionName: "SEARCH_ARWEAVE",
            errorMessage: "Search criteria not provided",
          },
        };
      }

      // ArLocal-specific pre-search guidance
      if (isArLocalMode) {
        try {
          const arLocalConfig = arweaveService.getArLocalConfig();
          if (
            arLocalConfig?.networkInfo &&
            arLocalConfig.networkInfo.queue_length > 0
          ) {
            await callback({
              text: `🔍 Searching ${networkMode} with ${tags.length} tag criteria...\n\n⚠️ Note: ${arLocalConfig.networkInfo.queue_length} transaction(s) are pending. Search results may be incomplete until transactions are mined.`,
            });
          }
        } catch (configError) {
          // Continue with search even if config check fails
          console.warn("Could not check ArLocal configuration:", configError);
        }
      }

      // Search transactions
      const transactionIds = await arweaveService.searchTransactions(tags);

      // Prepare response with ArLocal-specific information
      let responseText = `Found ${transactionIds.length} transactions matching your search criteria in ${networkMode}.`;

      if (isArLocalMode) {
        responseText += "\n\n📋 ArLocal Development Info:";
        responseText +=
          "\n• Search results include only confirmed transactions";
        responseText +=
          "\n• Pending transactions are not included in search results";

        if (transactionIds.length > 0) {
          responseText += `\n• Found ${transactionIds.length} confirmed transaction(s)`;
          responseText +=
            "\n• All results are available for immediate retrieval";
        } else {
          responseText += "\n• No confirmed transactions match the criteria";
          responseText += "\n• Check if transactions need to be mined first";
        }

        // Check for pending transactions that might affect results
        try {
          const arLocalConfig = arweaveService.getArLocalConfig();
          if (
            arLocalConfig?.networkInfo &&
            arLocalConfig.networkInfo.queue_length > 0
          ) {
            responseText += `\n\n🔧 Optimization Tip:`;
            responseText += `\n• ${arLocalConfig.networkInfo.queue_length} transaction(s) are pending`;
            responseText +=
              "\n• Mine transactions for complete search results: GET http://localhost:1984/mine";
          }
        } catch (configError) {
          // Don't fail the search if we can't get config
          console.warn(
            "Could not get ArLocal configuration for guidance:",
            configError,
          );
        }
      }

      // Send response to user with enhanced information
      await callback({
        text: responseText,
        action: "SEARCH_ARWEAVE",
      });

      return {
        success: true,
        text: `Found ${transactionIds.length} transactions`,
        values: {
          transactionIds: transactionIds,
          searchTime: Date.now(),
          searchCriteria: tags,
          networkMode: networkMode,
          isArLocal: isArLocalMode,
          resultCount: transactionIds.length,
        },
        data: {
          actionName: "SEARCH_ARWEAVE",
          transactionIds: transactionIds,
          searchUrls: transactionIds.map((id) =>
            isArLocalMode
              ? `http://localhost:1984/${id}`
              : `https://arweave.net/${id}`,
          ),
          searchCriteria: tags,
          networkMode: networkMode,
          arLocalGuidance: isArLocalMode
            ? {
                searchScope: "confirmed_transactions_only",
                miningEndpoint: "http://localhost:1984/mine",
                statusEndpoint: "http://localhost:1984/info",
                note: "Search results may be incomplete if transactions are pending confirmation",
              }
            : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Enhanced error handling for ArLocal-specific issues
      const currentNetworkMode = arweaveService
        ? arweaveService.isArLocalMode()
          ? "ArLocal"
          : "Arweave"
        : "Arweave";
      let enhancedErrorMessage = `Failed to search ${currentNetworkMode}: ${errorMessage}`;

      if (error instanceof ArweaveError) {
        if (error.code === ArweaveErrorCode.ARLOCAL_NOT_RUNNING) {
          enhancedErrorMessage += "\n\n🔧 ArLocal Troubleshooting:";
          enhancedErrorMessage += "\n• Ensure ArLocal is running: npx arlocal";
          enhancedErrorMessage +=
            "\n• Check ArLocal is accessible at http://localhost:1984";
          enhancedErrorMessage += "\n• Or switch to mainnet configuration";
        } else if (error.code === ArweaveErrorCode.NETWORK_ERROR) {
          enhancedErrorMessage += "\n\n🔧 Network Issue:";
          enhancedErrorMessage += "\n• Check your network connection";
          if (arweaveService && arweaveService.isArLocalMode()) {
            enhancedErrorMessage +=
              "\n• Verify ArLocal is running and responsive";
          }
        }
      }

      await callback({
        text: enhancedErrorMessage,
        error: true,
      });

      return {
        success: false,
        text: "Failed to search Arweave",
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: "SEARCH_ARWEAVE",
          errorMessage: errorMessage,
          enhancedErrorMessage: enhancedErrorMessage,
        },
      };
    }
  },
};
