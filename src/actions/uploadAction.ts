import { Action, ActionResult } from "@elizaos/core";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

export const uploadAction: Action = {
  name: "UPLOAD_TO_ARWEAVE",
  description:
    "Uploads data to the Arweave network with ArLocal development support",

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to uploading data
    const text = message.content.text.toLowerCase();
    return (
      (text.includes("upload") || text.includes("store")) &&
      text.includes("arweave") &&
      (text.includes("data") ||
        text.includes("file") ||
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
          actionName: "UPLOAD_TO_ARWEAVE",
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
            actionName: "UPLOAD_TO_ARWEAVE",
            errorMessage: "Arweave service not available",
          },
        };
      }

      // Extract data and content type from message or state
      const content = message.content.text || "";
      const contentType = state?.values?.contentType || "text/plain";
      const data = state?.values?.data || content;

      // Check if we're in ArLocal mode for enhanced guidance
      const isArLocalMode = arweaveService.isArLocalMode();
      const networkMode = isArLocalMode ? "ArLocal" : "Arweave";

      // Upload data to Arweave/ArLocal
      const transactionId = await arweaveService.uploadData(data, contentType);

      // Prepare response with ArLocal-specific guidance
      let responseText = `Data uploaded successfully to ${networkMode}! Transaction ID: ${transactionId}`;
      let workflowInstructions = "";

      if (isArLocalMode) {
        // Get current ArLocal configuration for mining guidance
        const arLocalConfig = arweaveService.getArLocalConfig();

        responseText += "\n\n📋 ArLocal Development Workflow:";
        responseText += "\n• Transaction is currently PENDING confirmation";
        responseText += "\n• Data will not be retrievable until mined";

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
        responseText += "\n3. Retrieve data once confirmed";
      }

      // Send response to user with enhanced guidance
      await callback({
        text: responseText,
        action: "UPLOAD_TO_ARWEAVE",
      });

      return {
        success: true,
        text: `Data uploaded with transaction ID: ${transactionId}`,
        values: {
          transactionId: transactionId,
          uploadTime: Date.now(),
          dataSize: data.length,
          networkMode: networkMode,
          isArLocal: isArLocalMode,
          workflowInstructions: workflowInstructions,
        },
        data: {
          actionName: "UPLOAD_TO_ARWEAVE",
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
              }
            : undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Enhanced error handling for ArLocal-specific issues
      let enhancedErrorMessage = `Failed to upload data: ${errorMessage}`;

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
        text: "Failed to upload data",
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: "UPLOAD_TO_ARWEAVE",
          errorMessage: errorMessage,
          enhancedErrorMessage: enhancedErrorMessage,
        },
      };
    }
  },
};
