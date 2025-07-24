import { Service } from '@elizaos/core';
import { ArweaveWalletKey, ArweaveTransactionStatus, ArweaveUploader } from '../types/arweave.types';

export class ArweaveService extends Service {
  static serviceType = 'arweave';
  public arweave: any;
  public wallet: any;

  constructor(runtime?: any) {
    super(runtime);
    // Initialize Arweave with testnet gateway
    this.arweave = require('arweave').init({
      host: runtime.getSetting('ARWEAVE_HOST') || 'cu.ardrive.io', // AR.IO Network Testnet gateway
      port: parseInt(runtime.getSetting('ARWEAVE_PORT') || '443'),
      protocol: runtime.getSetting('ARWEAVE_PROTOCOL') || 'https',
      timeout: 20000,
      logging: false,
    });
  }

  static async start(runtime: any): Promise<ArweaveService> {
    const service = new ArweaveService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async initialize(runtime: any): Promise<void> {
    // Check if wallet key is provided in environment
    const walletKey = runtime.getSetting('ARWEAVE_WALLET_KEY');
    if (walletKey) {
      try {
        this.wallet = JSON.parse(walletKey);
        console.log('Arweave wallet loaded from environment');
      } catch (error) {
        console.error('Failed to parse ARWEAVE_WALLET_KEY:', error);
        throw new Error('Invalid ARWEAVE_WALLET_KEY format');
      }
    } else {
      console.log('No wallet key provided, wallet operations will require input');
    }
  }

  // Wallet operations
  async createWallet(): Promise<{ key: ArweaveWalletKey; address: string }> {
    try {
      const key = await this.arweave.wallets.generate();
      const address = await this.arweave.wallets.jwkToAddress(key);
      return { key, address };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet available. Set ARWEAVE_WALLET_KEY in environment.');
    }
    return await this.arweave.wallets.jwkToAddress(this.wallet);
  }

  async getWalletBalance(): Promise<{ ar: string; winston: string }> {
    const address = await this.getWalletAddress();
    const winston = await this.arweave.wallets.getBalance(address);
    const ar = this.arweave.ar.winstonToAr(winston);
    return { ar, winston };
  }

  // Transaction operations
  async uploadData(data: string | Buffer, contentType: string = 'text/plain'): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.');
    }

    try {
      // Create transaction
      const transaction = await this.arweave.createTransaction({ data }, this.wallet);
      
      // Add content type tag
      transaction.addTag('Content-Type', contentType);
      
      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.wallet);
      
      // Upload using chunking for resumable uploads
      let uploader = await this.arweave.transactions.getUploader(transaction);
      
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(`Upload progress: ${uploader.pctComplete.toFixed(2)}%`);
      }
      
      return transaction.id;
    } catch (error) {
      console.error('Error uploading data:', error);
      throw new Error(`Failed to upload data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieveData(transactionId: string): Promise<string> {
    try {
      // First get transaction status to ensure it's confirmed
      const status = await this.arweave.transactions.getStatus(transactionId);
      if (status.status !== 200) {
        throw new Error(`Transaction not found or not confirmed: ${status.status}`);
      }

      // Get the data
      const data = await this.arweave.transactions.getData(transactionId, { decode: true, string: true });
      return data as string;
    } catch (error) {
      console.error('Error retrieving data:', error);
      throw new Error(`Failed to retrieve data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async transferTokens(targetAddress: string, amount: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.');
    }

    try {
      // Validate target address
      if (!targetAddress || targetAddress.length !== 43) {
        throw new Error('Invalid target address format');
      }

      // Validate amount
      const arAmount = parseFloat(amount);
      if (isNaN(arAmount) || arAmount <= 0) {
        throw new Error('Invalid amount. Must be a positive number.');
      }

      // Convert AR to winston
      const winston = this.arweave.ar.arToWinston(amount);
      
      // Create transaction
      const transaction = await this.arweave.createTransaction({
        target: targetAddress,
        quantity: winston
      }, this.wallet);
      
      // Sign and post transaction
      await this.arweave.transactions.sign(transaction, this.wallet);
      const response = await this.arweave.transactions.post(transaction);
      
      if (response.status !== 200) {
        throw new Error(`Transaction post failed with status: ${response.status}`);
      }
      
      return transaction.id;
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw new Error(`Failed to transfer tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTransactionStatus(transactionId: string): Promise<ArweaveTransactionStatus> {
    try {
      return await this.arweave.transactions.getStatus(transactionId);
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchTransactions(tags: { name: string; values: string[] }[]): Promise<string[]> {
    try {
      // Build the GraphQL query for Arweave search
      const query = {
        query: `query {
          transactions(
            first: 100,
            tags: [
              ${tags.map(tag => 
                `{ name: "${tag.name}", values: [${tag.values.map(v => `"${v}"`).join(', ')}] }`
              ).join(',')}
            ]
          ) {
            edges {
              node {
                id
                block {
                  height
                }
              }
            }
          }
        }`
      };

      // Execute the GraphQL query
      const response = await this.arweave.api.post('/graphql', query);
      
      // Extract transaction IDs from the response
      if (response.data && response.data.data && response.data.data.transactions) {
        return response.data.data.transactions.edges.map((edge: any) => edge.node.id);
      }
      
      return [];
    } catch (error) {
      console.error('Error searching transactions:', error);
      throw new Error(`Failed to search transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  get capabilityDescription(): string {
    return 'Provides Arweave network integration for permanent data storage and token transfers on the AR.IO Network Testnet';
  }

  async stop(): Promise<void> {
    // Clean up resources if needed
    console.log('Arweave service stopped');
  }
}
