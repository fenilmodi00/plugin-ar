import { Action, ActionResult } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const createWalletAction: Action = {
  name: 'CREATE_ARWEAVE_WALLET',
  description: 'Creates a new Arweave wallet and returns the wallet key and address',

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to creating a wallet
    const text = message.content.text.toLowerCase();
    return text.includes('create') && 
           text.includes('wallet') && 
           text.includes('arweave');
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: 'Callback function is not available',
        error: new Error('Callback function is not available'),
        data: {
          actionName: 'CREATE_ARWEAVE_WALLET',
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
            actionName: 'CREATE_ARWEAVE_WALLET',
            errorMessage: 'Arweave service not available',
          },
        };
      }

      // Create a new wallet
      const wallet = await arweaveService.createWallet();

      // Send response to user
      if (callback) {
        await callback({
          text: `Wallet created successfully! Address: ${wallet.address}. Please save your private key securely.`,
          action: 'CREATE_ARWEAVE_WALLET',
        });
      }

      return {
        success: true,
        text: `Wallet created with address: ${wallet.address}`,
        values: {
          walletAddress: wallet.address,
          walletKey: wallet.key,
          walletCreationTime: Date.now(),
        },
        data: {
          actionName: 'CREATE_ARWEAVE_WALLET',
          walletAddress: wallet.address,
          walletKey: JSON.stringify(wallet.key),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await callback({
        text: `Failed to create wallet: ${errorMessage}`,
        error: true,
      });

      return {
        success: false,
        text: 'Failed to create wallet',
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: 'CREATE_ARWEAVE_WALLET',
          errorMessage: errorMessage,
        },
      };
    }
  },
};
