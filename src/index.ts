import { Plugin } from '@elizaos/core';
import { ArweaveService } from './services/ArweaveService';
import { createWalletAction, uploadAction, retrieveAction, transferAction, searchAction } from './actions';
import { arweaveStatusProvider, walletInfoProvider } from './providers';
import { transactionTrackerEvaluator } from './evaluators';

export const plugin: Plugin = {
  name: 'arweave-plugin',
  description: 'ElizaOS plugin for Arweave integration, enabling permanent data storage and token transfers',

  // Core components
  services: [ArweaveService],
  actions: [
    createWalletAction,
    uploadAction,
    retrieveAction,
    transferAction,
    searchAction
  ],

  // Optional components
  providers: [
    arweaveStatusProvider,
    walletInfoProvider
  ],
  evaluators: [
    transactionTrackerEvaluator
  ],

  // Plugin initialization
  init: async (config, runtime) => {
    console.log('Arweave plugin initialized');
    
    // Check if wallet key is configured
    const walletKey = runtime.getSetting('ARWEAVE_WALLET_KEY');
    if (!walletKey) {
      console.log('No ARWEAVE_WALLET_KEY configured. Wallet operations will be limited.');
    }
  },

  // Configuration schema
  config: {
    ARWEAVE_WALLET_KEY: {
      type: 'string',
      description: 'Arweave wallet key for transaction signing',
      required: false
    },
    ARWEAVE_GATEWAY: {
      type: 'string',
      description: 'Custom Arweave gateway URL',
      required: false,
      default: 'https://arweave.net'
    }
  }
};

export default plugin;

// Re-export components for external use
export { ArweaveService } from './services/ArweaveService';
export { createWalletAction, uploadAction, retrieveAction, transferAction, searchAction } from './actions';
export { arweaveStatusProvider, walletInfoProvider } from './providers';
export { transactionTrackerEvaluator } from './evaluators';
