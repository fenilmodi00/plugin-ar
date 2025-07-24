import { Service } from '@elizaos/core';
import { ArweaveWalletKey, ArweaveTransactionStatus, ArweaveUploader, ArweaveError, ArweaveErrorCode } from '../types/arweave.types';
import { handleArweaveError } from '../utils/error-handler';
import { validateAddress, validateAmount, validateContentType, validateTransactionId, validateTags } from '../utils/validation';

export class ArweaveService extends Service {
  static serviceType = 'arweave';
  public arweave: any;
  public wallet: any;

  constructor(runtime?: any) {
    super(runtime);
    // Initialize Arweave with configurable gateway
    const gatewayHost = runtime.getSetting('ARWEAVE_GATEWAY')?.replace(/^https?:\/\//, '') || 'cu.ardrive.io';
    const protocol = runtime.getSetting('ARWEAVE_PROTOCOL') || 'https';
    const port = parseInt(runtime.getSetting('ARWEAVE_PORT') || (protocol === 'https' ? '443' : '80'));
    
    this.arweave = require('arweave').init({
      host: gatewayHost,
      port: port,
      protocol: protocol,
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
        throw new ArweaveError('Invalid ARWEAVE_WALLET_KEY format', ArweaveErrorCode.INVALID_CONFIG);
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
      throw handleArweaveError(error as Error, 'createWallet');
    }
  }

  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError('No wallet available. Set ARWEAVE_WALLET_KEY in environment.', ArweaveErrorCode.WALLET_NOT_CONNECTED);
    }
    try {
      return await this.arweave.wallets.jwkToAddress(this.wallet);
    } catch (error) {
      console.error('Error getting wallet address:', error);
      throw handleArweaveError(error as Error, 'getWalletAddress');
    }
  }

  async getWalletBalance(): Promise<{ ar: string; winston: string }> {
    try {
      const address = await this.getWalletAddress();
      const winston = await this.arweave.wallets.getBalance(address);
      const ar = this.arweave.ar.winstonToAr(winston);
      return { ar, winston };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw handleArweaveError(error as Error, 'getWalletBalance');
    }
  }

  // Transaction operations
  async uploadData(data: string | Buffer, contentType: string = 'text/plain'): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError('No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.', ArweaveErrorCode.WALLET_NOT_CONNECTED);
    }

    try {
      // Validate content type
      const validatedContentType = validateContentType(contentType);

      // Create transaction
      const transaction = await this.arweave.createTransaction({ data }, this.wallet);
      
      // Add content type tag
      transaction.addTag('Content-Type', validatedContentType);
      
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
      throw handleArweaveError(error as Error, 'uploadData');
    }
  }

  async retrieveData(transactionId: string): Promise<string> {
    try {
      // Validate transaction ID
      const validatedTransactionId = validateTransactionId(transactionId);

      // First get transaction status to ensure it's confirmed
      const status = await this.arweave.transactions.getStatus(validatedTransactionId);
      if (status.status !== 200) {
        throw new ArweaveError(`Transaction not found or not confirmed: ${status.status}`, ArweaveErrorCode.DATA_NOT_FOUND, undefined, { transactionId: validatedTransactionId });
      }

      // Get the data
      const data = await this.arweave.transactions.getData(validatedTransactionId, { decode: true, string: true });
      return data as string;
    } catch (error) {
      console.error('Error retrieving data:', error);
      throw handleArweaveError(error as Error, 'retrieveData', { transactionId });
    }
  }

  async transferTokens(targetAddress: string, amount: string): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError('No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.', ArweaveErrorCode.WALLET_NOT_CONNECTED);
    }

    try {
      // Validate target address
      const validatedAddress = validateAddress(targetAddress);

      // Validate amount
      const arAmount = validateAmount(amount);

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
        throw new ArweaveError(`Transaction post failed with status: ${response.status}`, ArweaveErrorCode.TRANSACTION_FAILED, undefined, { targetAddress, amount });
      }
      
      return transaction.id;
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw handleArweaveError(error as Error, 'transferTokens', { targetAddress, amount });
    }
  }

  async getTransactionStatus(transactionId: string): Promise<ArweaveTransactionStatus> {
    try {
      // Validate transaction ID
      const validatedTransactionId = validateTransactionId(transactionId);
      
      return await this.arweave.transactions.getStatus(validatedTransactionId);
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw handleArweaveError(error as Error, 'getTransactionStatus', { transactionId });
    }
  }

  async searchTransactions(tags: { name: string; values: string[] }[]): Promise<string[]> {
    try {
      // Validate tags
      const validatedTags = validateTags(tags);

      // Build the GraphQL query for Arweave search
      const query = {
        query: `query {
          transactions(
            first: 100,
            tags: [
              ${validatedTags.map(tag => 
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
      throw handleArweaveError(error as Error, 'searchTransactions', { tags });
    }
  }

  get capabilityDescription(): string {
    return 'Provides Arweave network integration for permanent data storage and token transfers with configurable gateway support';
  }

  async stop(): Promise<void> {
    // Clean up resources if needed
    console.log('Arweave service stopped');
  }
}
