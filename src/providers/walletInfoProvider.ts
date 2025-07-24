import { Provider } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const walletInfoProvider: Provider = {
  name: 'WALLET_INFO',
  description: 'Provides information about the current Arweave wallet',
  dynamic: true,

  get: async (runtime: any, message: any, state: any) => {
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService('arweave') as ArweaveService;
      if (!arweaveService) {
        return {
          text: 'Arweave service is not available.',
        };
      }

      // Get wallet address
      let address: string;
      try {
        address = await arweaveService.getWalletAddress();
      } catch (error) {
        return {
          text: 'No wallet configured. Set ARWEAVE_WALLET_KEY in environment to use wallet features.',
        };
      }

      // Get wallet balance
      const balance = await arweaveService.getWalletBalance();

      const text = `Arweave Wallet Information:
- Address: ${address.substring(0, 10)}...${address.substring(address.length - 8)}
- Balance: ${parseFloat(balance.ar).toFixed(6)} AR (${balance.winston} winston)
- Network: Arweave`;

      return {
        text,
        values: {
          walletAddress: address,
          walletBalanceAr: parseFloat(balance.ar),
          walletBalanceWinston: balance.winston,
        },
        data: {
          walletAddress: address,
          walletBalance: balance,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        text: `Failed to get wallet information: ${errorMessage}`,
      };
    }
  },
};
