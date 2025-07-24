import { BigNumber } from 'bignumber.js';

/**
 * Arweave Wallet Key interface
 * Represents the JWK (JSON Web Key) format used by Arweave wallets
 */
export interface ArweaveWalletKey {
  kty: string;
  e: string;
  n: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
}

/**
 * Arweave Transaction Status interface
 * Represents the status of an Arweave transaction
 */
export interface ArweaveTransactionStatus {
  status: number;
  confirmed: {
    block_height: number;
    block_indep_hash: string;
    number_of_confirmations: number;
  } | null;
}

/**
 * Arweave Uploader interface
 * Represents the uploader object for chunked uploads
 */
export interface ArweaveUploader {
  isComplete: boolean;
  pctComplete: number;
  uploadChunk: () => Promise<void>;
}

/**
 * Arweave Error Code enumeration
 * Standardized error codes for Arweave operations
 */
export enum ArweaveErrorCode {
  /** Unknown or unhandled error */
  UNKNOWN = 'UNKNOWN',
  /** Insufficient balance for operation */
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  /** Invalid parameters provided */
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  /** Transaction failed */
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  /** Data not found */
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  /** Invalid wallet key */
  INVALID_WALLET_KEY = 'INVALID_WALLET_KEY',
  /** Invalid configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** Service not initialized */
  SERVICE_NOT_INITIALIZED = 'SERVICE_NOT_INITIALIZED',
  /** Wallet not connected */
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  /** Upload failed */
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  /** Retrieval failed */
  RETRIEVAL_FAILED = 'RETRIEVAL_FAILED',
  /** Transfer failed */
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  /** Search failed */
  SEARCH_FAILED = 'SEARCH_FAILED',
  /** Network error */
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Custom error class for Arweave operations
 */
export class ArweaveError extends Error {
  /** Error code for programmatic handling */
  public readonly code: ArweaveErrorCode;
  /** Original error that caused this error */
  public readonly cause?: Error;
  /** Additional context about the error */
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ArweaveErrorCode = ArweaveErrorCode.UNKNOWN,
    cause?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ArweaveError';
    this.code = code;
    this.cause = cause;
    this.context = context;
  }
}

/**
 * Configuration for Arweave Service
 */
export interface ArweaveConfig {
  /** Gateway host for Arweave network */
  gatewayHost: string;
  /** Protocol for Arweave network (http or https) */
  protocol: string;
  /** Port for Arweave network */
  port: number;
  /** Timeout for Arweave requests */
  timeout: number;
  /** Whether to enable logging */
  logging: boolean;
  /** Optional wallet key for signing operations */
  walletKey?: string;
}

/**
 * Result of a wallet creation operation
 */
export interface WalletCreationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Wallet key in JWK format */
  key: ArweaveWalletKey;
  /** Wallet address */
  address: string;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Result of a wallet balance operation
 */
export interface WalletBalanceResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Balance in AR */
  ar: string;
  /** Balance in winston */
  winston: string;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Parameters for upload operation
 */
export interface UploadParams {
  /** Data to upload */
  data: string | Buffer;
  /** Content type of the data */
  contentType: string;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Transaction ID of the upload */
  transactionId: string;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Result of a retrieval operation
 */
export interface RetrieveResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Retrieved data */
  data: string;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Parameters for transfer operation
 */
export interface TransferParams {
  /** Target address for the transfer */
  targetAddress: string;
  /** Amount to transfer in AR */
  amount: string;
}

/**
 * Result of a transfer operation
 */
export interface TransferResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Transaction ID of the transfer */
  transactionId: string;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Parameters for transaction status operation
 */
export interface TransactionStatusParams {
  /** Transaction ID to check */
  transactionId: string;
}

/**
 * Result of a transaction status operation
 */
export interface TransactionStatusResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Status of the transaction */
  status: ArweaveTransactionStatus;
  /** Error information if operation failed */
  error?: ArweaveError;
}

/**
 * Parameters for search operation
 */
export interface SearchParams {
  /** Tags to search for */
  tags: { name: string; values: string[] }[];
}

/**
 * Result of a search operation
 */
export interface SearchResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of transaction IDs matching the search */
  transactionIds: string[];
  /** Error information if operation failed */
  error?: ArweaveError;
}
