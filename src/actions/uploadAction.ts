import { Action, ActionResult } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const uploadAction: Action = {
  name: 'UPLOAD_TO_ARWEAVE',
  description: 'Uploads data to the Arweave network',

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to uploading data
    const text = message.content.text.toLowerCase();
    return (text.includes('upload') || text.includes('store')) && 
           text.includes('arweave') &&
           (text.includes('data') || text.includes('file') || text.includes('content'));
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: 'Callback function is not available',
        error: new Error('Callback function is not available'),
        data: {
          actionName: 'UPLOAD_TO_ARWEAVE',
          errorMessage: 'Callback function is not available',
        },
      };
    }
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService<ArweaveService>('arweave');
      if (!arweaveService) {
        await callback({
          text: 'Arweave service is not available.',
          error: true,
        });

        return {
          success: false,
          text: 'Arweave service not available',
          error: new Error('Arweave service not available'),
          data: {
            actionName: 'UPLOAD_TO_ARWEAVE',
            errorMessage: 'Arweave service not available',
          },
        };
      }

      // Extract data and content type from message or state
      const content = message.content.text || '';
      const contentType = state?.values?.contentType || 'text/plain';
      const data = state?.values?.data || content;

      // Upload data to Arweave
      const transactionId = await arweaveService.uploadData(data, contentType);

      // Send response to user
      if (callback) {
        await callback({
          text: `Data uploaded successfully to Arweave! Transaction ID: ${transactionId}`,
          action: 'UPLOAD_TO_ARWEAVE',
        });
      }

      return {
        success: true,
        text: `Data uploaded with transaction ID: ${transactionId}`,
        values: {
          transactionId: transactionId,
          uploadTime: Date.now(),
          dataSize: data.length,
        },
        data: {
          actionName: 'UPLOAD_TO_ARWEAVE',
          transactionId: transactionId,
          arweaveUrl: `https://arweave.net/${transactionId}`,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await callback({
        text: `Failed to upload data: ${errorMessage}`,
        error: true,
      });

      return {
        success: false,
        text: 'Failed to upload data',
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: 'UPLOAD_TO_ARWEAVE',
          errorMessage: errorMessage,
        },
      };
    }
  },
};
