import { Service } from "@elizaos/core";
import {
  ArweaveWalletKey,
  ArweaveTransactionStatus,
  ArweaveUploader,
  ArweaveError,
  ArweaveErrorCode,
  ArweaveConfig,
} from "../types/arweave.types";
import { handleArweaveError } from "../utils/error-handler";
import {
  validateAddress,
  validateAmount,
  validateContentType,
  validateTransactionId,
  validateTags,
} from "../utils/validation";
import { ArLocalUtils, ArLocalConfig } from "../utils/arlocal";
import { ConfigValidator } from "../utils/config-validation";

export class ArweaveService extends Service {
  static serviceType = "arweave";
  public arweave: any;
  public wallet: any;
  private arweaveConfig: ArweaveConfig;
  private arLocalConfig?: ArLocalConfig;

  constructor(runtime?: any) {
    super(runtime);

    // Validate configuration before initialization
    const configValidation = ConfigValidator.validateArweaveConfig(runtime);

    if (!configValidation.isValid) {
      console.error("❌ Arweave configuration validation failed:");
      configValidation.errors.forEach((error) =>
        console.error(`   • ${error}`),
      );
      throw new ArweaveError(
        `Invalid Arweave configuration: ${configValidation.errors.join(", ")}`,
        ArweaveErrorCode.INVALID_CONFIG,
        undefined,
        { errors: configValidation.errors },
      );
    }

    // Log configuration warnings
    if (configValidation.warnings.length > 0) {
      console.warn("⚠️  Arweave configuration warnings:");
      configValidation.warnings.forEach((warning) =>
        console.warn(`   • ${warning}`),
      );
    }

    // Check for environment variable precedence issues
    const precedenceWarnings =
      ConfigValidator.validateEnvironmentPrecedence(runtime);
    if (precedenceWarnings.length > 0) {
      console.warn("⚠️  Environment variable precedence warnings:");
      precedenceWarnings.forEach((warning) => console.warn(`   • ${warning}`));
    }

    // Use validated configuration
    this.arweaveConfig = configValidation.config!;

    // Log configuration summary
    console.log(ConfigValidator.createConfigurationSummary(runtime));

    this.arweave = require("arweave").init({
      host: this.arweaveConfig.gatewayHost,
      port: this.arweaveConfig.port,
      protocol: this.arweaveConfig.protocol,
      timeout: this.arweaveConfig.timeout,
      logging: this.arweaveConfig.logging,
    });
  }

  static async start(runtime: any): Promise<ArweaveService> {
    const service = new ArweaveService(runtime);
    await service.initialize(runtime);
    return service;
  }

  /**
   * Detect if the current configuration is for ArLocal and configure accordingly
   * @private
   */
  private async detectAndConfigureArLocal(): Promise<void> {
    try {
      // Get ArLocal configuration
      this.arLocalConfig = await ArLocalUtils.getArLocalConfig(
        this.arweaveConfig,
      );

      if (this.arLocalConfig.isArLocal) {
        if (this.arLocalConfig.networkInfo) {
          console.log("🔧 ArLocal detected and running:");
          console.log(`   Network: ${this.arLocalConfig.networkInfo.network}`);
          console.log(`   Height: ${this.arLocalConfig.networkInfo.height}`);
          console.log(
            `   Pending transactions: ${this.arLocalConfig.networkInfo.queue_length}`,
          );

          if (this.arLocalConfig.miningRequired) {
            console.log(
              "⚠️  Mining required: Transactions are pending confirmation",
            );
            console.log(
              "   Use the mine endpoint to confirm pending transactions",
            );
          }
        } else {
          console.log(
            "⚠️  ArLocal configuration detected but server is not running",
          );
          console.log(
            "   Please start ArLocal on localhost:1984 or switch to mainnet configuration",
          );

          // Throw error if ArLocal is configured but not running
          throw new ArweaveError(
            "ArLocal is not running on localhost:1984. Please start ArLocal or switch to mainnet configuration.",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
            undefined,
            {
              host: this.arweaveConfig.gatewayHost,
              port: this.arweaveConfig.port,
              protocol: this.arweaveConfig.protocol,
            },
          );
        }
      } else {
        console.log("🌐 Connected to Arweave mainnet");
        console.log(
          `   Gateway: ${this.arweaveConfig.protocol}://${this.arweaveConfig.gatewayHost}:${this.arweaveConfig.port}`,
        );
      }
    } catch (error) {
      if (error instanceof ArweaveError) {
        throw error;
      }

      // Handle unexpected errors during ArLocal detection
      console.error("Error during ArLocal detection:", error);
      throw new ArweaveError(
        "Failed to detect ArLocal configuration",
        ArweaveErrorCode.INVALID_CONFIG,
        error as Error,
        { config: this.arweaveConfig },
      );
    }
  }

  /**
   * Check if the service is configured for ArLocal
   * @returns boolean - true if using ArLocal
   */
  public isArLocalMode(): boolean {
    return this.arLocalConfig?.isArLocal ?? false;
  }

  /**
   * Get ArLocal configuration information
   * @returns ArLocalConfig | undefined - ArLocal configuration if available
   */
  public getArLocalConfig(): ArLocalConfig | undefined {
    return this.arLocalConfig;
  }

  /**
   * Check ArLocal availability and update configuration
   * @returns Promise<void>
   */
  public async checkArLocalAvailability(): Promise<void> {
    if (!this.isArLocalMode()) {
      return;
    }

    try {
      const isRunning = await ArLocalUtils.isArLocalRunning(
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      if (!isRunning) {
        throw new ArweaveError(
          "ArLocal is not running. Please start ArLocal or switch to mainnet configuration.",
          ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          undefined,
          {
            host: this.arweaveConfig.gatewayHost,
            port: this.arweaveConfig.port,
          },
        );
      }

      // Update ArLocal configuration
      this.arLocalConfig = await ArLocalUtils.getArLocalConfig(
        this.arweaveConfig,
      );
    } catch (error) {
      if (error instanceof ArweaveError) {
        throw error;
      }

      throw new ArweaveError(
        "Failed to check ArLocal availability",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        error as Error,
        {
          host: this.arweaveConfig.gatewayHost,
          port: this.arweaveConfig.port,
        },
      );
    }
  }

  async initialize(runtime: any): Promise<void> {
    // Detect and configure ArLocal support
    await this.detectAndConfigureArLocal();

    // Check if wallet key is provided in environment
    const walletKey = runtime.getSetting("ARWEAVE_WALLET_KEY");
    if (walletKey) {
      try {
        this.wallet = JSON.parse(walletKey);
        const networkMode = this.isArLocalMode()
          ? "ArLocal development"
          : "Arweave mainnet";
        console.log(`Arweave wallet loaded from environment (${networkMode})`);
      } catch (error) {
        console.error("Failed to parse ARWEAVE_WALLET_KEY:", error);
        throw new ArweaveError(
          "Invalid ARWEAVE_WALLET_KEY format",
          ArweaveErrorCode.INVALID_CONFIG,
        );
      }
    } else {
      const networkMode = this.isArLocalMode()
        ? "ArLocal development"
        : "Arweave mainnet";
      console.log(
        `No wallet key provided, wallet operations will require input (${networkMode})`,
      );
    }
  }

  // Wallet operations
  async createWallet(): Promise<{ key: ArweaveWalletKey; address: string }> {
    try {
      const key = await this.arweave.wallets.generate();
      const address = await this.arweave.wallets.jwkToAddress(key);
      return { key, address };
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw handleArweaveError(error as Error, "createWallet");
    }
  }

  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError(
        "No wallet available. Set ARWEAVE_WALLET_KEY in environment.",
        ArweaveErrorCode.WALLET_NOT_CONNECTED,
      );
    }
    try {
      return await this.arweave.wallets.jwkToAddress(this.wallet);
    } catch (error) {
      console.error("Error getting wallet address:", error);
      throw handleArweaveError(error as Error, "getWalletAddress");
    }
  }

  async getWalletBalance(): Promise<{ ar: string; winston: string }> {
    try {
      const address = await this.getWalletAddress();
      const winston = await this.arweave.wallets.getBalance(address);
      const ar = this.arweave.ar.winstonToAr(winston);
      return { ar, winston };
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      throw handleArweaveError(error as Error, "getWalletBalance");
    }
  }

  // Transaction operations
  async uploadData(
    data: string | Buffer,
    contentType: string = "text/plain",
  ): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError(
        "No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.",
        ArweaveErrorCode.WALLET_NOT_CONNECTED,
      );
    }

    // Check ArLocal availability if in ArLocal mode
    if (this.isArLocalMode()) {
      await this.checkArLocalAvailability();
    }

    try {
      // Validate content type
      const validatedContentType = validateContentType(contentType);

      // Create transaction
      const transaction = await this.arweave.createTransaction(
        { data },
        this.wallet,
      );

      // Add content type tag
      transaction.addTag("Content-Type", validatedContentType);

      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.wallet);

      // Upload using chunking for resumable uploads
      let uploader = await this.arweave.transactions.getUploader(transaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
        console.log(
          `${networkMode} upload progress: ${uploader.pctComplete.toFixed(2)}%`,
        );
      }

      // ArLocal-specific logging and guidance
      if (this.isArLocalMode()) {
        console.log("📤 Data uploaded to ArLocal successfully");
        console.log(`   Transaction ID: ${transaction.id}`);
        console.log(
          "⚠️  Transaction is pending - use the mine endpoint to confirm",
        );

        // Update ArLocal config to reflect new pending transaction
        try {
          this.arLocalConfig = await ArLocalUtils.getArLocalConfig(
            this.arweaveConfig,
          );
        } catch (configError) {
          // Don't fail the upload if we can't update config
          console.warn(
            "Could not update ArLocal configuration after upload:",
            configError,
          );
        }
      } else {
        console.log("📤 Data uploaded to Arweave successfully");
        console.log(`   Transaction ID: ${transaction.id}`);
      }

      return transaction.id;
    } catch (error) {
      const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
      console.error(`Error uploading data to ${networkMode}:`, error);
      throw this.handleArLocalError(error as Error, "uploadData");
    }
  }

  async retrieveData(transactionId: string): Promise<string> {
    // Check ArLocal availability if in ArLocal mode
    if (this.isArLocalMode()) {
      await this.checkArLocalAvailability();
    }

    try {
      // Validate transaction ID
      const validatedTransactionId = validateTransactionId(transactionId);

      // First get transaction status to ensure it's confirmed
      const status = await this.arweave.transactions.getStatus(
        validatedTransactionId,
      );

      if (status.status !== 200) {
        // ArLocal-specific error messaging
        if (this.isArLocalMode() && status.status === 202) {
          throw new ArweaveError(
            `Transaction ${validatedTransactionId} is pending in ArLocal. Use the mine endpoint to confirm the transaction before retrieving data.`,
            ArweaveErrorCode.MINING_REQUIRED,
            undefined,
            { transactionId: validatedTransactionId, status: status.status },
          );
        }

        throw new ArweaveError(
          `Transaction not found or not confirmed: ${status.status}`,
          ArweaveErrorCode.DATA_NOT_FOUND,
          undefined,
          { transactionId: validatedTransactionId, status: status.status },
        );
      }

      // Get the data
      const data = await this.arweave.transactions.getData(
        validatedTransactionId,
        { decode: true, string: true },
      );

      // ArLocal-specific logging
      if (this.isArLocalMode()) {
        console.log(`📥 Data retrieved from ArLocal successfully`);
        console.log(`   Transaction ID: ${validatedTransactionId}`);
        console.log(`   Data size: ${(data as string).length} characters`);
      }

      return data as string;
    } catch (error) {
      const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
      console.error(`Error retrieving data from ${networkMode}:`, error);
      throw this.handleArLocalError(error as Error, "retrieveData", {
        transactionId,
      });
    }
  }

  async transferTokens(targetAddress: string, amount: string): Promise<string> {
    if (!this.wallet) {
      throw new ArweaveError(
        "No wallet available for signing. Set ARWEAVE_WALLET_KEY in environment.",
        ArweaveErrorCode.WALLET_NOT_CONNECTED,
      );
    }

    // Check ArLocal availability if in ArLocal mode
    if (this.isArLocalMode()) {
      await this.checkArLocalAvailability();
    }

    try {
      // Validate target address
      validateAddress(targetAddress);

      // Validate amount
      validateAmount(amount);

      // Convert AR to winston
      const winston = this.arweave.ar.arToWinston(amount);

      // Create transaction
      const transaction = await this.arweave.createTransaction(
        {
          target: targetAddress,
          quantity: winston,
        },
        this.wallet,
      );

      // Sign and post transaction
      await this.arweave.transactions.sign(transaction, this.wallet);
      const response = await this.arweave.transactions.post(transaction);

      if (response.status !== 200) {
        throw new ArweaveError(
          `Transaction post failed with status: ${response.status}`,
          ArweaveErrorCode.TRANSACTION_FAILED,
          undefined,
          { targetAddress, amount },
        );
      }

      // ArLocal-specific logging and guidance
      if (this.isArLocalMode()) {
        console.log("💸 Token transfer submitted to ArLocal successfully");
        console.log(`   Transaction ID: ${transaction.id}`);
        console.log(`   Amount: ${amount} AR to ${targetAddress}`);
        console.log(
          "⚠️  Transaction is pending - use the mine endpoint to confirm",
        );

        // Update ArLocal config to reflect new pending transaction
        try {
          this.arLocalConfig = await ArLocalUtils.getArLocalConfig(
            this.arweaveConfig,
          );
        } catch (configError) {
          // Don't fail the transfer if we can't update config
          console.warn(
            "Could not update ArLocal configuration after transfer:",
            configError,
          );
        }
      } else {
        console.log("💸 Token transfer submitted to Arweave successfully");
        console.log(`   Transaction ID: ${transaction.id}`);
        console.log(`   Amount: ${amount} AR to ${targetAddress}`);
      }

      return transaction.id;
    } catch (error) {
      const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
      console.error(`Error transferring tokens on ${networkMode}:`, error);
      throw this.handleArLocalError(error as Error, "transferTokens", {
        targetAddress,
        amount,
      });
    }
  }

  async getTransactionStatus(
    transactionId: string,
  ): Promise<ArweaveTransactionStatus> {
    // Check ArLocal availability if in ArLocal mode
    if (this.isArLocalMode()) {
      await this.checkArLocalAvailability();
    }

    try {
      // Validate transaction ID
      const validatedTransactionId = validateTransactionId(transactionId);

      const status = await this.arweave.transactions.getStatus(
        validatedTransactionId,
      );

      // ArLocal-specific logging
      if (this.isArLocalMode()) {
        if (status.status === 200 && status.confirmed) {
          console.log(
            `✅ Transaction ${transactionId} is confirmed in ArLocal`,
          );
          console.log(`   Block height: ${status.confirmed.block_height}`);
          console.log(
            `   Confirmations: ${status.confirmed.number_of_confirmations}`,
          );
        } else if (status.status === 202) {
          console.log(`⏳ Transaction ${transactionId} is pending in ArLocal`);
          console.log("   Use the mine endpoint to confirm this transaction");
        } else {
          console.log(
            `❓ Transaction ${transactionId} status: ${status.status}`,
          );
        }
      }

      return status;
    } catch (error) {
      const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
      console.error(
        `Error getting transaction status from ${networkMode}:`,
        error,
      );
      throw this.handleArLocalError(error as Error, "getTransactionStatus", {
        transactionId,
      });
    }
  }

  async searchTransactions(
    tags: { name: string; values: string[] }[],
  ): Promise<string[]> {
    // Check ArLocal availability if in ArLocal mode
    if (this.isArLocalMode()) {
      await this.checkArLocalAvailability();
    }

    try {
      // Validate tags
      const validatedTags = validateTags(tags);

      // Build the GraphQL query for Arweave search
      const query = {
        query: `query {
          transactions(
            first: 100,
            tags: [
              ${validatedTags
                .map(
                  (tag) =>
                    `{ name: "${tag.name}", values: [${tag.values.map((v) => `"${v}"`).join(", ")}] }`,
                )
                .join(",")}
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
        }`,
      };

      // Execute the GraphQL query
      const response = await this.arweave.api.post("/graphql", query);

      // Extract transaction IDs from the response
      let transactionIds: string[] = [];
      if (
        response.data &&
        response.data.data &&
        response.data.data.transactions
      ) {
        transactionIds = response.data.data.transactions.edges.map(
          (edge: any) => edge.node.id,
        );
      }

      // ArLocal-specific logging
      if (this.isArLocalMode()) {
        console.log(`🔍 Transaction search completed in ArLocal`);
        console.log(
          `   Found ${transactionIds.length} transactions matching the criteria`,
        );
        if (transactionIds.length > 0) {
          console.log("   Note: Some transactions may be pending confirmation");
        }
      }

      return transactionIds;
    } catch (error) {
      const networkMode = this.isArLocalMode() ? "ArLocal" : "Arweave";
      console.error(`Error searching transactions in ${networkMode}:`, error);
      throw this.handleArLocalError(error as Error, "searchTransactions", {
        tags,
      });
    }
  }

  /**
   * Mint test tokens to an address in ArLocal
   * This method is only available when using ArLocal for development
   * @param address - Target address for minting (43 character base64url)
   * @param amount - Amount to mint in winston (string representation of positive integer)
   * @returns Promise<void>
   * @throws ArweaveError if not in ArLocal mode, validation fails, or minting fails
   */
  async mintTokens(address: string, amount: string): Promise<void> {
    // Ensure we're in ArLocal mode
    if (!this.isArLocalMode()) {
      throw new ArweaveError(
        "Token minting is only available in ArLocal development mode. Switch to ArLocal configuration to use this feature.",
        ArweaveErrorCode.INVALID_CONFIG,
        undefined,
        { address, amount, mode: "mainnet" },
      );
    }

    try {
      // Use ArLocalUtils to mint tokens with validation
      // ArLocalUtils will handle parameter validation and ArLocal availability check
      await ArLocalUtils.mintTokens(
        address,
        amount,
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      // Log successful minting
      console.log("🪙 Test tokens minted successfully in ArLocal");
      console.log(`   Address: ${address.trim()}`);
      console.log(`   Amount: ${amount.trim()} winston`);

      // Convert winston to AR for user-friendly display
      try {
        const arAmount = this.arweave.ar.winstonToAr(amount.trim());
        console.log(`   Amount (AR): ${arAmount} AR`);
      } catch (conversionError) {
        // Don't fail if conversion fails, just skip the AR display
        console.log("   (Could not convert to AR for display)");
      }

      console.log("   Note: Tokens are immediately available in ArLocal");
    } catch (error) {
      console.error("Error minting tokens in ArLocal:", error);
      throw this.handleArLocalError(error as Error, "mintTokens", {
        address,
        amount,
      });
    }
  }

  /**
   * Mine transactions in ArLocal to confirm pending transactions
   * This method is only available when using ArLocal for development
   * @param blocks - Number of blocks to mine (default: 1)
   * @returns Promise<void>
   * @throws ArweaveError if not in ArLocal mode or mining fails
   */
  async mineTransactions(blocks: number = 1): Promise<void> {
    // Ensure we're in ArLocal mode
    if (!this.isArLocalMode()) {
      throw new ArweaveError(
        "Transaction mining is only available in ArLocal development mode. Switch to ArLocal configuration to use this feature.",
        ArweaveErrorCode.INVALID_CONFIG,
        undefined,
        { blocks, mode: "mainnet" },
      );
    }

    // Check ArLocal availability
    await this.checkArLocalAvailability();

    try {
      // Get current network info to check pending transactions
      const networkInfoBefore = await ArLocalUtils.getNetworkInfo(
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      if (networkInfoBefore.queue_length === 0) {
        console.log("⚡ No pending transactions to mine in ArLocal");
        console.log(`   Current height: ${networkInfoBefore.height}`);
        return;
      }

      console.log("⛏️  Mining transactions in ArLocal...");
      console.log(`   Pending transactions: ${networkInfoBefore.queue_length}`);
      console.log(`   Current height: ${networkInfoBefore.height}`);
      console.log(`   Mining ${blocks} block(s)...`);

      // Mine the transactions
      await ArLocalUtils.mineTransactions(
        blocks,
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      // Get updated network info to confirm mining
      const networkInfoAfter = await ArLocalUtils.getNetworkInfo(
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      // Update our ArLocal configuration
      this.arLocalConfig = await ArLocalUtils.getArLocalConfig(
        this.arweaveConfig,
      );

      console.log("✅ Mining completed successfully in ArLocal");
      console.log(`   New height: ${networkInfoAfter.height}`);
      console.log(`   Remaining pending: ${networkInfoAfter.queue_length}`);
      console.log(
        `   Confirmed transactions: ${networkInfoBefore.queue_length - networkInfoAfter.queue_length}`,
      );

      if (networkInfoAfter.queue_length > 0) {
        console.log(
          "⚠️  Some transactions still pending - consider mining additional blocks",
        );
      }
    } catch (error) {
      console.error("Error mining transactions in ArLocal:", error);
      throw this.handleArLocalError(error as Error, "mineTransactions", {
        blocks,
      });
    }
  }

  /**
   * Check if a transaction is confirmed in ArLocal
   * @param transactionId - Transaction ID to check
   * @returns Promise<boolean> - true if transaction is confirmed
   * @throws ArweaveError if transaction check fails
   */
  async isTransactionConfirmed(transactionId: string): Promise<boolean> {
    try {
      // Validate transaction ID
      const validatedTransactionId = validateTransactionId(transactionId);

      // Get transaction status
      const status = await this.getTransactionStatus(validatedTransactionId);

      // In ArLocal, status 200 with confirmed data means confirmed
      // Status 202 means pending
      return status.status === 200 && !!status.confirmed;
    } catch (error) {
      // If we can't get the status, assume not confirmed
      if (
        error instanceof ArweaveError &&
        error.code === ArweaveErrorCode.DATA_NOT_FOUND
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get pending transaction count in ArLocal
   * @returns Promise<number> - Number of pending transactions
   * @throws ArweaveError if not in ArLocal mode or check fails
   */
  async getPendingTransactionCount(): Promise<number> {
    // Ensure we're in ArLocal mode
    if (!this.isArLocalMode()) {
      throw new ArweaveError(
        "Pending transaction count is only available in ArLocal development mode.",
        ArweaveErrorCode.INVALID_CONFIG,
        undefined,
        { mode: "mainnet" },
      );
    }

    try {
      // Check ArLocal availability and get network info
      await this.checkArLocalAvailability();

      const networkInfo = await ArLocalUtils.getNetworkInfo(
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      return networkInfo.queue_length;
    } catch (error) {
      console.error(
        "Error getting pending transaction count from ArLocal:",
        error,
      );
      throw this.handleArLocalError(
        error as Error,
        "getPendingTransactionCount",
      );
    }
  }

  /**
   * Wait for a transaction to be confirmed in ArLocal with automatic mining detection
   * @param transactionId - Transaction ID to wait for
   * @param maxWaitTime - Maximum time to wait in milliseconds (default: 30000)
   * @param autoMine - Whether to automatically mine if transaction is pending (default: false)
   * @returns Promise<boolean> - true if transaction was confirmed
   * @throws ArweaveError if wait times out or mining fails
   */
  async waitForTransactionConfirmation(
    transactionId: string,
    maxWaitTime: number = 30000,
    autoMine: boolean = false,
  ): Promise<boolean> {
    // Validate transaction ID
    const validatedTransactionId = validateTransactionId(transactionId);

    const startTime = Date.now();
    const pollInterval = 1000; // Check every second

    console.log(
      `⏳ Waiting for transaction confirmation: ${validatedTransactionId}`,
    );
    if (this.isArLocalMode()) {
      console.log(
        `   ArLocal mode - mining ${autoMine ? "enabled" : "disabled"}`,
      );
    }

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const isConfirmed = await this.isTransactionConfirmed(
          validatedTransactionId,
        );

        if (isConfirmed) {
          console.log(`✅ Transaction confirmed: ${validatedTransactionId}`);
          return true;
        }

        // If in ArLocal mode and auto-mining is enabled, try to mine
        if (this.isArLocalMode() && autoMine) {
          try {
            const pendingCount = await this.getPendingTransactionCount();
            if (pendingCount > 0) {
              console.log(
                `⛏️  Auto-mining ${pendingCount} pending transaction(s)...`,
              );
              await this.mineTransactions(1);

              // Check again after mining
              const isConfirmedAfterMining = await this.isTransactionConfirmed(
                validatedTransactionId,
              );
              if (isConfirmedAfterMining) {
                console.log(
                  `✅ Transaction confirmed after mining: ${validatedTransactionId}`,
                );
                return true;
              }
            }
          } catch (miningError) {
            console.error(
              `Error checking transaction confirmation: ${miningError}`,
            );
            // Continue waiting even if mining fails, but don't retry mining immediately
            // to avoid infinite loops
          }
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`Error checking transaction confirmation: ${error}`);
        // Continue waiting unless it's a critical error
        if (
          error instanceof ArweaveError &&
          error.code === ArweaveErrorCode.ARLOCAL_NOT_RUNNING
        ) {
          throw error;
        }
      }
    }

    // Timeout reached
    if (this.isArLocalMode()) {
      const pendingCount = await this.getPendingTransactionCount();
      if (pendingCount > 0) {
        throw new ArweaveError(
          `Transaction confirmation timeout. ${pendingCount} transaction(s) are still pending in ArLocal. Use mineTransactions() to confirm them manually.`,
          ArweaveErrorCode.MINING_REQUIRED,
          undefined,
          {
            transactionId: validatedTransactionId,
            pendingCount,
            maxWaitTime,
            autoMine,
          },
        );
      }
    }

    throw new ArweaveError(
      `Transaction confirmation timeout after ${maxWaitTime}ms`,
      ArweaveErrorCode.TRANSACTION_TIMEOUT,
      undefined,
      { transactionId: validatedTransactionId, maxWaitTime },
    );
  }

  /**
   * Provide mining guidance based on current ArLocal state
   * @returns Promise<string> - Mining guidance message
   */
  async getMiningGuidance(): Promise<string> {
    if (!this.isArLocalMode()) {
      return "Mining guidance is only available in ArLocal development mode.";
    }

    try {
      await this.checkArLocalAvailability();

      const networkInfo = await ArLocalUtils.getNetworkInfo(
        this.arweaveConfig.gatewayHost,
        this.arweaveConfig.port,
      );

      return ArLocalUtils.createMiningGuidance(networkInfo.queue_length);
    } catch (error) {
      return "Unable to get mining guidance - ArLocal may not be running.";
    }
  }

  /**
   * Handle ArLocal-specific errors with enhanced context
   * @private
   */
  private handleArLocalError(
    error: Error,
    operation: string,
    context?: Record<string, any>,
  ): ArweaveError {
    // If it's already an ArweaveError, just return it
    if (error instanceof ArweaveError) {
      return error;
    }

    // Check for common ArLocal-specific error patterns
    if (this.isArLocalMode()) {
      // Connection refused or network errors likely mean ArLocal is not running
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed") ||
        error.message.includes("Failed to fetch")
      ) {
        return new ArweaveError(
          "ArLocal is not running on localhost:1984. Please start ArLocal or switch to mainnet configuration.",
          ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          error,
          {
            operation,
            host: this.arweaveConfig.gatewayHost,
            port: this.arweaveConfig.port,
            ...context,
          },
        );
      }

      // Timeout errors in ArLocal
      if (
        error.message.includes("timeout") ||
        error.message.includes("aborted")
      ) {
        return new ArweaveError(
          "ArLocal request timed out. Check if ArLocal is running and responsive.",
          ArweaveErrorCode.NETWORK_ERROR,
          error,
          {
            operation,
            host: this.arweaveConfig.gatewayHost,
            port: this.arweaveConfig.port,
            ...context,
          },
        );
      }
    }

    // Fall back to the standard error handler
    return handleArweaveError(error, operation, context);
  }

  get capabilityDescription(): string {
    const networkMode = this.isArLocalMode()
      ? "ArLocal development network"
      : "Arweave mainnet";
    return `Provides Arweave network integration for permanent data storage and token transfers with configurable gateway support (${networkMode})`;
  }

  async stop(): Promise<void> {
    // Clean up resources if needed
    console.log("Arweave service stopped");
  }
}
