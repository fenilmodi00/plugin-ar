import { ArweaveError, ArweaveErrorCode } from '../types/arweave.types';

/**
 * Maps Arweave-specific errors to user-friendly messages
 * @param error - Original error
 * @param context - Error context
 * @returns Mapped ArweaveError
 */
export function mapArweaveError(error: Error, context: Record<string, any> = {}): ArweaveError {
  const errorMessage = error.message.toLowerCase();
  
  // Handle common error patterns with heuristics
  if (errorMessage.includes('insufficient') && errorMessage.includes('balance')) {
    return new ArweaveError(
      'Insufficient AR balance to complete this operation.',
      ArweaveErrorCode.INSUFFICIENT_BALANCE,
      error,
      context
    );
  }

  if (errorMessage.includes('invalid') && (errorMessage.includes('address') || errorMessage.includes('format'))) {
    return new ArweaveError(
      'Invalid Arweave address format.',
      ArweaveErrorCode.INVALID_PARAMETERS,
      error,
      context
    );
  }

  if (errorMessage.includes('transaction') && errorMessage.includes('failed')) {
    return new ArweaveError(
      'Transaction failed to be processed by the network.',
      ArweaveErrorCode.TRANSACTION_FAILED,
      error,
      context
    );
  }

  if (errorMessage.includes('data') && errorMessage.includes('not found')) {
    return new ArweaveError(
      'Requested data not found on the Arweave network.',
      ArweaveErrorCode.DATA_NOT_FOUND,
      error,
      context
    );
  }

  if (errorMessage.includes('wallet') && errorMessage.includes('not connected')) {
    return new ArweaveError(
      'No Arweave wallet connected. Please set ARWEAVE_WALLET_KEY in environment.',
      ArweaveErrorCode.WALLET_NOT_CONNECTED,
      error,
      context
    );
  }

  if (errorMessage.includes('upload') && errorMessage.includes('failed')) {
    return new ArweaveError(
      'Data upload failed.',
      ArweaveErrorCode.UPLOAD_FAILED,
      error,
      context
    );
  }

  if (errorMessage.includes('retrieve') && errorMessage.includes('failed')) {
    return new ArweaveError(
      'Data retrieval failed.',
      ArweaveErrorCode.RETRIEVAL_FAILED,
      error,
      context
    );
  }

  if (errorMessage.includes('transfer') && errorMessage.includes('failed')) {
    return new ArweaveError(
      'Token transfer failed.',
      ArweaveErrorCode.TRANSFER_FAILED,
      error,
      context
    );
  }

  if (errorMessage.includes('search') && errorMessage.includes('failed')) {
    return new ArweaveError(
      'Transaction search failed.',
      ArweaveErrorCode.SEARCH_FAILED,
      error,
      context
    );
  }

  // Network and connection errors
  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return new ArweaveError(
      'Network connection error. Please check your internet connection and try again.',
      ArweaveErrorCode.NETWORK_ERROR,
      error,
      context
    );
  }

  // Default to unknown error
  return new ArweaveError(
    'An unexpected error occurred. Please try again.',
    ArweaveErrorCode.UNKNOWN,
    error,
    context
  );
}

/**
 * Handles Arweave-specific errors with enhanced context
 * @param error - Error to handle
 * @param operation - Operation that failed
 * @param context - Additional context
 * @returns Processed ArweaveError
 */
export function handleArweaveError(error: Error, operation: string, context: Record<string, any> = {}): ArweaveError {
  const enhancedContext = {
    ...context,
    operation,
  };

  return mapArweaveError(error, enhancedContext);
}

/**
 * Determines if an error is retryable
 * @param error - ArweaveError to analyze
 * @returns true if retryable
 */
export function isRetryableError(error: ArweaveError): boolean {
  // Network and temporary errors are generally retryable
  const retryableCodes = [
    ArweaveErrorCode.UNKNOWN,
    ArweaveErrorCode.TRANSACTION_FAILED,
    ArweaveErrorCode.NETWORK_ERROR,
  ];

  if (retryableCodes.includes(error.code)) {
    // Check context for specific retryability hints
    if (error.context?.isRetryable !== undefined) {
      return error.context.isRetryable as boolean;
    }
    return true;
  }

  // Validation and configuration errors are not retryable without changes
  const nonRetryableCodes = [
    ArweaveErrorCode.INSUFFICIENT_BALANCE,
    ArweaveErrorCode.INVALID_PARAMETERS,
    ArweaveErrorCode.DATA_NOT_FOUND,
    ArweaveErrorCode.INVALID_WALLET_KEY,
    ArweaveErrorCode.INVALID_CONFIG,
    ArweaveErrorCode.WALLET_NOT_CONNECTED,
  ];

  return !nonRetryableCodes.includes(error.code);
}

/**
 * Creates user-friendly error messages for specific operations
 * @param error - ArweaveError
 * @returns Enhanced user message
 */
export function createUserFriendlyMessage(error: ArweaveError): string {
  const { code, context } = error;
  let baseMessage = error.message;
  let operationContext = '';

  // Add operation-specific context if available
  if (context?.operation) {
    operationContext = ` while ${context.operation}`;
    baseMessage = `${baseMessage}${operationContext}.`;
  }

  // Add recovery suggestion based on error type
  switch (code) {
    case ArweaveErrorCode.INSUFFICIENT_BALANCE:
      baseMessage += ' Please check your wallet balance and try a smaller amount.';
      break;
    case ArweaveErrorCode.INVALID_PARAMETERS:
      baseMessage += ' Please check the parameters and try again.';
      break;
    case ArweaveErrorCode.WALLET_NOT_CONNECTED:
      baseMessage += ' Set the ARWEAVE_WALLET_KEY environment variable with your wallet key.';
      break;
    case ArweaveErrorCode.NETWORK_ERROR:
      baseMessage += ' Check your internet connection and try again.';
      break;
    case ArweaveErrorCode.DATA_NOT_FOUND:
      baseMessage += ' Verify the transaction ID is correct and the data has been confirmed on the network.';
      break;
  }

  return baseMessage;
}
