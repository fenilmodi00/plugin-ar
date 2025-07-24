import { Action, ActionResult } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const transferAction: Action = {
  name: 'TRANSFER_AR_TOKENS',
  description: 'Transfers AR tokens to another wallet on the Arweave network',

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to transferring tokens
    const text = message.content.text.toLowerCase();
    return (text.includes('transfer') || text.includes('send')) && 
           text.includes('ar') && 
           text.includes('tokens') &&
           (text.includes('wallet') || text.includes('address'));
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: 'Callback function is not available',
        error: new Error('Callback function is not available'),
        data: {
          actionName: 'TRANSFER_AR_TOKENS',
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
            actionName: 'TRANSFER_AR_TOKENS',
            errorMessage: 'Arweave service not available',
          },
        };
      }

      // Extract transfer details from message or state
      const text = message.content.text || '';
      const targetAddress = state?.values?.targetAddress || 
        // Look for Arweave address (52 character base62 string)
        text.match(/[a-zA-Z0-9_-]{52}/)?.[0] || 
        null;
      
      const amount = state?.values?.amount || 
        // Look for amount pattern (number followed by AR)
        parseFloat(text.match(/(\d+(\.\d+)?)\s*ar/i)?.[1] || '0');

      if (!targetAddress) {
        await callback({
          text: 'Please provide a target wallet address to transfer AR tokens.',
          error: true,
        });

        return {
          success: false,
          text: 'Target address not provided',
          error: new Error('Target address not provided'),
          data: {
            actionName: 'TRANSFER_AR_TOKENS',
            errorMessage: 'Target address not provided',
          },
        };
      }

      if (amount <= 0) {
        await callback({
          text: 'Please provide a valid amount of AR tokens to transfer.',
          error: true,
        });

        return {
          success: false,
          text: 'Invalid amount provided',
          error: new Error('Invalid amount provided'),
          data: {
            actionName: 'TRANSFER_AR_TOKENS',
            errorMessage: 'Invalid amount provided',
          },
        };
      }

      // Transfer tokens
      const transactionId = await arweaveService.transferTokens(targetAddress, amount.toString());

      // Send response to user
      if (callback) {
        await callback({
          text: `Successfully transferred ${amount} AR tokens to ${targetAddress}! Transaction ID: ${transactionId}`,
          action: 'TRANSFER_AR_TOKENS',
        });
      }

      return {
        success: true,
        text: `Transferred ${amount} AR tokens to ${targetAddress}`,
        values: {
          targetAddress: targetAddress,
          amount: amount,
          transactionId: transactionId,
          transferTime: Date.now(),
        },
        data: {
          actionName: 'TRANSFER_AR_TOKENS',
          targetAddress: targetAddress,
          amount: amount,
          transactionId: transactionId,
          arweaveUrl: `https://arweave.net/${transactionId}`,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await callback({
        text: `Failed to transfer tokens: ${errorMessage}`,
        error: true,
      });

      return {
        success: false,
        text: 'Failed to transfer tokens',
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: 'TRANSFER_AR_TOKENS',
          errorMessage: errorMessage,
        },
      };
    }
  },
};
