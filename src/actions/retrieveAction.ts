import { Action, ActionResult } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const retrieveAction: Action = {
  name: 'RETRIEVE_FROM_ARWEAVE',
  description: 'Retrieves data from the Arweave network using a transaction ID',

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to retrieving data
    const text = message.content.text.toLowerCase();
    return (text.includes('retrieve') || text.includes('get') || text.includes('fetch')) && 
           text.includes('arweave') &&
           (text.includes('data') || text.includes('content') || text.includes('transaction'));
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: 'Callback function is not available',
        error: new Error('Callback function is not available'),
        data: {
          actionName: 'RETRIEVE_FROM_ARWEAVE',
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
            actionName: 'RETRIEVE_FROM_ARWEAVE',
            errorMessage: 'Arweave service not available',
          },
        };
      }

      // Extract transaction ID from message or state
      const text = message.content.text || '';
      // Look for a transaction ID in the message (52 character base64 string)
      const transactionIdMatch = text.match(/[a-zA-Z0-9_-]{52}/);
      const transactionId = state?.values?.transactionId || (transactionIdMatch ? transactionIdMatch[0] : null);

      if (!transactionId) {
        await callback({
          text: 'Please provide a transaction ID to retrieve data from Arweave.',
          error: true,
        });

        return {
          success: false,
          text: 'Transaction ID not provided',
          error: new Error('Transaction ID not provided'),
          data: {
            actionName: 'RETRIEVE_FROM_ARWEAVE',
            errorMessage: 'Transaction ID not provided',
          },
        };
      }

      // Retrieve data from Arweave
      const data = await arweaveService.retrieveData(transactionId);

      // Send response to user
      if (callback) {
        await callback({
          text: `Data retrieved successfully from Arweave! Transaction: ${transactionId}`,
          action: 'RETRIEVE_FROM_ARWEAVE',
        });
      }

      return {
        success: true,
        text: `Data retrieved from transaction: ${transactionId}`,
        values: {
          transactionId: transactionId,
          retrievedData: data,
          retrievalTime: Date.now(),
        },
        data: {
          actionName: 'RETRIEVE_FROM_ARWEAVE',
          transactionId: transactionId,
          retrievedData: data,
          arweaveUrl: `https://arweave.net/${transactionId}`,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await callback({
        text: `Failed to retrieve data: ${errorMessage}`,
        error: true,
      });

      return {
        success: false,
        text: 'Failed to retrieve data',
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: 'RETRIEVE_FROM_ARWEAVE',
          errorMessage: errorMessage,
        },
      };
    }
  },
};
