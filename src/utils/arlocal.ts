import {
  ArweaveError,
  ArweaveErrorCode,
  ArweaveConfig,
} from "../types/arweave.types";

/**
 * ArLocal network information interface
 * Represents the network status and configuration from ArLocal
 */
export interface ArLocalNetworkInfo {
  network: string;
  version: number;
  release: number;
  queue_length: number;
  peers: number;
  height: number;
  current: string;
  blocks: number;
  node_state_latency: number;
}

/**
 * ArLocal configuration interface
 * Represents the configuration state for ArLocal detection
 */
export interface ArLocalConfig {
  isArLocal: boolean;
  networkInfo?: ArLocalNetworkInfo;
  miningRequired: boolean;
}

/**
 * ArLocal utilities class
 * Provides functionality for interacting with ArLocal development server
 */
export class ArLocalUtils {
  private static readonly DEFAULT_ARLOCAL_HOST = "localhost";
  private static readonly DEFAULT_ARLOCAL_PORT = 1984;
  private static readonly DEFAULT_ARLOCAL_PROTOCOL = "http";
  private static readonly REQUEST_TIMEOUT = 5000; // 5 seconds

  /**
   * Check if the current configuration is pointing to ArLocal
   * @param config - Arweave configuration to check
   * @returns true if configuration is for ArLocal
   */
  static isArLocalConfig(config: ArweaveConfig): boolean {
    const isLocalhost =
      config.gatewayHost === "localhost" || config.gatewayHost === "127.0.0.1";
    const isArLocalPort = config.port === this.DEFAULT_ARLOCAL_PORT;
    const isHttpProtocol = config.protocol === "http";

    return isLocalhost && isArLocalPort && isHttpProtocol;
  }

  /**
   * Check if ArLocal is running and accessible
   * @param host - ArLocal host (default: localhost)
   * @param port - ArLocal port (default: 1984)
   * @returns Promise<boolean> - true if ArLocal is running
   */
  static async isArLocalRunning(
    host: string = this.DEFAULT_ARLOCAL_HOST,
    port: number = this.DEFAULT_ARLOCAL_PORT,
  ): Promise<boolean> {
    try {
      const url = `${this.DEFAULT_ARLOCAL_PROTOCOL}://${host}:${port}/info`;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT,
      );

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // ArLocal is not running or not accessible
      return false;
    }
  }

  /**
   * Get network information from ArLocal
   * @param host - ArLocal host (default: localhost)
   * @param port - ArLocal port (default: 1984)
   * @returns Promise<ArLocalNetworkInfo> - Network information
   * @throws ArweaveError if ArLocal is not accessible
   */
  static async getNetworkInfo(
    host: string = this.DEFAULT_ARLOCAL_HOST,
    port: number = this.DEFAULT_ARLOCAL_PORT,
  ): Promise<ArLocalNetworkInfo> {
    try {
      const url = `${this.DEFAULT_ARLOCAL_PROTOCOL}://${host}:${port}/info`;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT,
      );

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ArweaveError(
          `Failed to get network info: HTTP ${response.status}`,
          ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          undefined,
          { host, port, status: response.status },
        );
      }

      const networkInfo = await response.json();

      // Validate the response structure
      if (!this.isValidNetworkInfo(networkInfo)) {
        throw new ArweaveError(
          "Invalid network info response from ArLocal",
          ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          undefined,
          { host, port, response: networkInfo },
        );
      }

      return networkInfo as ArLocalNetworkInfo;
    } catch (error) {
      if (error instanceof ArweaveError) {
        throw error;
      }

      // Handle network errors
      throw new ArweaveError(
        "ArLocal is not running on localhost:1984. Please start ArLocal or switch to mainnet configuration.",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        error as Error,
        { host, port },
      );
    }
  }

  /**
   * Mine transactions in ArLocal (confirm pending transactions)
   * @param blocks - Number of blocks to mine (default: 1)
   * @param host - ArLocal host (default: localhost)
   * @param port - ArLocal port (default: 1984)
   * @returns Promise<void>
   * @throws ArweaveError if mining fails
   */
  static async mineTransactions(
    blocks: number = 1,
    host: string = this.DEFAULT_ARLOCAL_HOST,
    port: number = this.DEFAULT_ARLOCAL_PORT,
  ): Promise<void> {
    try {
      // Validate blocks parameter
      if (!Number.isInteger(blocks) || blocks < 1) {
        throw new ArweaveError(
          "Blocks must be a positive integer",
          ArweaveErrorCode.INVALID_PARAMETERS,
          undefined,
          { blocks },
        );
      }

      const url = `${this.DEFAULT_ARLOCAL_PROTOCOL}://${host}:${port}/mine`;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT * 2,
      ); // Longer timeout for mining

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ArweaveError(
          `Mining failed: HTTP ${response.status}`,
          ArweaveErrorCode.MINING_REQUIRED,
          undefined,
          { host, port, blocks, status: response.status },
        );
      }

      // Mining successful - no need to return anything
    } catch (error) {
      if (error instanceof ArweaveError) {
        throw error;
      }

      throw new ArweaveError(
        "Failed to mine transactions in ArLocal",
        ArweaveErrorCode.MINING_REQUIRED,
        error as Error,
        { host, port, blocks },
      );
    }
  }

  /**
   * Mint test tokens to an address in ArLocal
   * @param address - Target address for minting
   * @param amount - Amount to mint in winston (string)
   * @param host - ArLocal host (default: localhost)
   * @param port - ArLocal port (default: 1984)
   * @returns Promise<void>
   * @throws ArweaveError if minting fails
   */
  static async mintTokens(
    address: string,
    amount: string,
    host: string = this.DEFAULT_ARLOCAL_HOST,
    port: number = this.DEFAULT_ARLOCAL_PORT,
  ): Promise<void> {
    try {
      // Validate address format (43 character base64url)
      if (!address || typeof address !== "string") {
        throw new ArweaveError(
          "Address is required for minting",
          ArweaveErrorCode.INVALID_PARAMETERS,
          undefined,
          { address },
        );
      }

      const trimmedAddress = address.trim();
      if (!trimmedAddress.match(/^[a-zA-Z0-9_-]{43}$/)) {
        throw new ArweaveError(
          "Invalid Arweave address format for minting",
          ArweaveErrorCode.INVALID_PARAMETERS,
          undefined,
          { address: trimmedAddress },
        );
      }

      // Validate amount
      if (!amount || typeof amount !== "string") {
        throw new ArweaveError(
          "Amount is required for minting",
          ArweaveErrorCode.INVALID_PARAMETERS,
          undefined,
          { amount },
        );
      }

      const trimmedAmount = amount.trim();
      if (!trimmedAmount.match(/^\d+$/) || trimmedAmount === "0") {
        throw new ArweaveError(
          "Amount must be a positive integer in winston",
          ArweaveErrorCode.INVALID_PARAMETERS,
          undefined,
          { amount: trimmedAmount },
        );
      }

      const url = `${this.DEFAULT_ARLOCAL_PROTOCOL}://${host}:${port}/mint/${trimmedAddress}/${trimmedAmount}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT,
      );

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ArweaveError(
          `Token minting failed: HTTP ${response.status}`,
          ArweaveErrorCode.MINT_FAILED,
          undefined,
          {
            host,
            port,
            address: trimmedAddress,
            amount: trimmedAmount,
            status: response.status,
          },
        );
      }

      // Minting successful - no need to return anything
    } catch (error) {
      if (error instanceof ArweaveError) {
        throw error;
      }

      throw new ArweaveError(
        "Failed to mint tokens in ArLocal",
        ArweaveErrorCode.MINT_FAILED,
        error as Error,
        { host, port, address, amount },
      );
    }
  }

  /**
   * Get ArLocal configuration based on current settings
   * @param config - Arweave configuration
   * @returns Promise<ArLocalConfig> - ArLocal configuration state
   */
  static async getArLocalConfig(config: ArweaveConfig): Promise<ArLocalConfig> {
    const isArLocal = this.isArLocalConfig(config);

    if (!isArLocal) {
      return {
        isArLocal: false,
        miningRequired: false,
      };
    }

    try {
      const networkInfo = await this.getNetworkInfo(
        config.gatewayHost,
        config.port,
      );
      return {
        isArLocal: true,
        networkInfo,
        miningRequired: networkInfo.queue_length > 0,
      };
    } catch (error) {
      // If we can't get network info, ArLocal is probably not running
      return {
        isArLocal: true,
        miningRequired: false,
      };
    }
  }

  /**
   * Validate network info response structure
   * @param networkInfo - Response to validate
   * @returns boolean - true if valid
   */
  private static isValidNetworkInfo(networkInfo: any): boolean {
    return (
      networkInfo &&
      typeof networkInfo.network === "string" &&
      typeof networkInfo.version === "number" &&
      typeof networkInfo.release === "number" &&
      typeof networkInfo.queue_length === "number" &&
      typeof networkInfo.peers === "number" &&
      typeof networkInfo.height === "number" &&
      typeof networkInfo.current === "string" &&
      typeof networkInfo.blocks === "number" &&
      typeof networkInfo.node_state_latency === "number"
    );
  }

  /**
   * Create a user-friendly message about ArLocal status
   * @param config - ArLocal configuration
   * @returns string - Status message
   */
  static createStatusMessage(config: ArLocalConfig): string {
    if (!config.isArLocal) {
      return "Connected to Arweave mainnet";
    }

    if (!config.networkInfo) {
      return "ArLocal configuration detected but server is not running. Please start ArLocal on localhost:1984";
    }

    const { networkInfo } = config;
    let message = `Connected to ArLocal (${networkInfo.network})`;
    message += `\n- Height: ${networkInfo.height}`;
    message += `\n- Blocks: ${networkInfo.blocks}`;
    message += `\n- Queue: ${networkInfo.queue_length} pending transactions`;

    if (config.miningRequired) {
      message +=
        "\n- Mining required: Use /mine endpoint to confirm pending transactions";
    }

    return message;
  }

  /**
   * Create mining guidance message
   * @param queueLength - Number of pending transactions
   * @returns string - Mining guidance
   */
  static createMiningGuidance(queueLength: number): string {
    if (queueLength === 0) {
      return "No pending transactions. Mining not required.";
    }

    return `${queueLength} transaction(s) pending confirmation. Use the mine endpoint to confirm transactions.`;
  }
}
