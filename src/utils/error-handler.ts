import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

/**
 * Detects if an error is ArLocal-specific
 * @param error - Error to analyze
 * @param context - Error context
 * @returns true if error is ArLocal-related
 */
function isArLocalError(error: Error, context: Record<string, any>): boolean {
  const errorMessage = error.message.toLowerCase();

  // Check if context indicates ArLocal configuration
  const isArLocalContext =
    context.host === "localhost" ||
    context.host === "127.0.0.1" ||
    context.port === 1984;

  // Check for ArLocal-specific error patterns
  const hasArLocalErrorPattern =
    errorMessage.includes("arlocal") ||
    errorMessage.includes("localhost:1984") ||
    errorMessage.includes("mining") ||
    errorMessage.includes("mint") ||
    (errorMessage.includes("econnrefused") && isArLocalContext) ||
    (errorMessage.includes("fetch failed") && isArLocalContext) ||
    (errorMessage.includes("failed to fetch") && isArLocalContext) ||
    (errorMessage.includes("network error") && isArLocalContext) ||
    (errorMessage.includes("timeout") && isArLocalContext) ||
    (errorMessage.includes("aborted") && isArLocalContext);

  return isArLocalContext || hasArLocalErrorPattern;
}

/**
 * Maps ArLocal-specific errors with enhanced troubleshooting guidance
 * @param error - Original error
 * @param context - Error context
 * @returns Mapped ArweaveError with ArLocal-specific guidance
 */
function mapArLocalError(
  error: Error,
  context: Record<string, any>,
): ArweaveError {
  const errorMessage = error.message.toLowerCase();

  // Connection refused or network errors - ArLocal not running
  if (
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("failed to fetch") ||
    (errorMessage.includes("arlocal") && errorMessage.includes("not running"))
  ) {
    return new ArweaveError(
      "ArLocal is not running on localhost:1984. Please start ArLocal or switch to mainnet configuration.",
      ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      error,
      {
        ...context,
        troubleshooting: {
          steps: [
            "1. Install ArLocal: npm install -g arlocal",
            "2. Start ArLocal: npx arlocal",
            "3. Verify ArLocal is running: curl http://localhost:1984/info",
            "4. Or switch to mainnet by updating environment variables",
          ],
          environmentVariables: {
            arlocal: {
              ARWEAVE_GATEWAY: "localhost",
              ARWEAVE_PORT: "1984",
              ARWEAVE_PROTOCOL: "http",
            },
            mainnet: {
              ARWEAVE_GATEWAY: "arweave.net",
              ARWEAVE_PORT: "443",
              ARWEAVE_PROTOCOL: "https",
            },
          },
        },
      },
    );
  }

  // Timeout errors in ArLocal
  if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
    return new ArweaveError(
      "ArLocal request timed out. Check if ArLocal is running and responsive.",
      ArweaveErrorCode.NETWORK_ERROR,
      error,
      {
        ...context,
        troubleshooting: {
          steps: [
            "1. Check if ArLocal is running: curl http://localhost:1984/info",
            "2. Restart ArLocal if it appears frozen",
            "3. Check system resources (CPU/Memory)",
            "4. Try increasing request timeout in configuration",
          ],
        },
      },
    );
  }

  // Mining-related errors
  if (
    errorMessage.includes("mining") ||
    errorMessage.includes("pending") ||
    errorMessage.includes("queue")
  ) {
    return new ArweaveError(
      "Transactions are pending in ArLocal. Use the /mine endpoint to confirm transactions.",
      ArweaveErrorCode.MINING_REQUIRED,
      error,
      {
        ...context,
        troubleshooting: {
          steps: [
            "1. Mine pending transactions: curl http://localhost:1984/mine",
            "2. Check queue status: curl http://localhost:1984/info",
            "3. Wait for transaction confirmation",
            "4. Retry your operation after mining",
          ],
          queueLength: context.queueLength || "unknown",
        },
      },
    );
  }

  // Token minting errors
  if (errorMessage.includes("mint") || errorMessage.includes("minting")) {
    return new ArweaveError(
      "Token minting failed in ArLocal.",
      ArweaveErrorCode.MINT_FAILED,
      error,
      {
        ...context,
        troubleshooting: {
          steps: [
            "1. Verify address format (43 characters, base64url)",
            "2. Check amount is positive integer in winston",
            "3. Ensure ArLocal is running and responsive",
            "4. Try minting manually: curl http://localhost:1984/mint/{address}/{amount}",
          ],
          addressFormat: "43-character base64url string",
          amountFormat:
            "Positive integer in winston (1 AR = 1000000000000 winston)",
        },
      },
    );
  }

  // HTTP status errors from ArLocal
  if (
    errorMessage.includes("http") &&
    (errorMessage.includes("404") || errorMessage.includes("500"))
  ) {
    const statusMatch = errorMessage.match(/http (\d+)/);
    const status = statusMatch ? statusMatch[1] : "unknown";

    return new ArweaveError(
      `ArLocal returned HTTP ${status}. Check ArLocal server status and endpoint availability.`,
      ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      error,
      {
        ...context,
        httpStatus: status,
        troubleshooting: {
          steps: [
            "1. Check ArLocal server logs for errors",
            "2. Verify the endpoint exists and is supported",
            "3. Restart ArLocal if needed",
            "4. Check ArLocal version compatibility",
          ],
        },
      },
    );
  }

  // Generic ArLocal error fallback
  return new ArweaveError(
    "ArLocal operation failed. Check ArLocal server status and configuration.",
    ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
    error,
    {
      ...context,
      troubleshooting: {
        steps: [
          "1. Verify ArLocal is running: curl http://localhost:1984/info",
          "2. Check ArLocal server logs",
          "3. Restart ArLocal if needed",
          "4. Switch to mainnet configuration if ArLocal issues persist",
        ],
      },
    },
  );
}

/**
 * Maps Arweave-specific errors to user-friendly messages
 * @param error - Original error
 * @param context - Error context
 * @returns Mapped ArweaveError
 */
export function mapArweaveError(
  error: Error,
  context: Record<string, any> = {},
): ArweaveError {
  const errorMessage = error.message.toLowerCase();

  // Enhanced ArLocal error detection - check first for more specific handling
  if (isArLocalError(error, context)) {
    return mapArLocalError(error, context);
  }

  // Handle common error patterns with heuristics
  if (
    errorMessage.includes("insufficient") &&
    errorMessage.includes("balance")
  ) {
    return new ArweaveError(
      "Insufficient AR balance to complete this operation.",
      ArweaveErrorCode.INSUFFICIENT_BALANCE,
      error,
      context,
    );
  }

  if (
    errorMessage.includes("invalid") &&
    (errorMessage.includes("address") || errorMessage.includes("format"))
  ) {
    return new ArweaveError(
      "Invalid Arweave address format.",
      ArweaveErrorCode.INVALID_PARAMETERS,
      error,
      context,
    );
  }

  if (errorMessage.includes("transaction") && errorMessage.includes("failed")) {
    return new ArweaveError(
      "Transaction failed to be processed by the network.",
      ArweaveErrorCode.TRANSACTION_FAILED,
      error,
      context,
    );
  }

  if (errorMessage.includes("data") && errorMessage.includes("not found")) {
    return new ArweaveError(
      "Requested data not found on the Arweave network.",
      ArweaveErrorCode.DATA_NOT_FOUND,
      error,
      context,
    );
  }

  if (
    errorMessage.includes("wallet") &&
    errorMessage.includes("not connected")
  ) {
    return new ArweaveError(
      "No Arweave wallet connected. Please set ARWEAVE_WALLET_KEY in environment.",
      ArweaveErrorCode.WALLET_NOT_CONNECTED,
      error,
      context,
    );
  }

  if (errorMessage.includes("upload") && errorMessage.includes("failed")) {
    return new ArweaveError(
      "Data upload failed.",
      ArweaveErrorCode.UPLOAD_FAILED,
      error,
      context,
    );
  }

  if (errorMessage.includes("retrieve") && errorMessage.includes("failed")) {
    return new ArweaveError(
      "Data retrieval failed.",
      ArweaveErrorCode.RETRIEVAL_FAILED,
      error,
      context,
    );
  }

  if (errorMessage.includes("transfer") && errorMessage.includes("failed")) {
    return new ArweaveError(
      "Token transfer failed.",
      ArweaveErrorCode.TRANSFER_FAILED,
      error,
      context,
    );
  }

  if (errorMessage.includes("search") && errorMessage.includes("failed")) {
    return new ArweaveError(
      "Transaction search failed.",
      ArweaveErrorCode.SEARCH_FAILED,
      error,
      context,
    );
  }

  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout")
  ) {
    return new ArweaveError(
      "Network connection error. Please check your internet connection and try again.",
      ArweaveErrorCode.NETWORK_ERROR,
      error,
      context,
    );
  }

  // Default to unknown error
  return new ArweaveError(
    "An unexpected error occurred. Please try again.",
    ArweaveErrorCode.UNKNOWN,
    error,
    context,
  );
}

/**
 * Handles Arweave-specific errors with enhanced context
 * @param error - Error to handle
 * @param operation - Operation that failed
 * @param context - Additional context
 * @returns Processed ArweaveError
 */
export function handleArweaveError(
  error: Error,
  operation: string,
  context: Record<string, any> = {},
): ArweaveError {
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
    ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
    ArweaveErrorCode.MINING_REQUIRED,
    ArweaveErrorCode.MINT_FAILED,
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
  let operationContext = "";

  // Add operation-specific context if available
  if (context?.operation) {
    operationContext = ` while ${context.operation}`;
    baseMessage = `${baseMessage}${operationContext}.`;
  }

  // Add recovery suggestion based on error type
  switch (code) {
    case ArweaveErrorCode.INSUFFICIENT_BALANCE:
      baseMessage +=
        " Please check your wallet balance and try a smaller amount.";
      break;
    case ArweaveErrorCode.INVALID_PARAMETERS:
      baseMessage += " Please check the parameters and try again.";
      break;
    case ArweaveErrorCode.WALLET_NOT_CONNECTED:
      baseMessage +=
        " Set the ARWEAVE_WALLET_KEY environment variable with your wallet key.";
      break;
    case ArweaveErrorCode.NETWORK_ERROR:
      baseMessage += " Check your internet connection and try again.";
      if (context?.troubleshooting?.steps) {
        baseMessage +=
          "\n\nTroubleshooting steps:\n" +
          context.troubleshooting.steps.join("\n");
      }
      break;
    case ArweaveErrorCode.DATA_NOT_FOUND:
      baseMessage +=
        " Verify the transaction ID is correct and the data has been confirmed on the network.";
      break;
    case ArweaveErrorCode.ARLOCAL_NOT_RUNNING:
      baseMessage +=
        " Start ArLocal with `npx arlocal` or switch to mainnet configuration.";
      if (context?.troubleshooting?.steps) {
        baseMessage +=
          "\n\nTroubleshooting steps:\n" +
          context.troubleshooting.steps.join("\n");
      }
      if (context?.troubleshooting?.environmentVariables) {
        baseMessage += "\n\nEnvironment configuration:\n";
        baseMessage +=
          "For ArLocal:\n" +
          Object.entries(context.troubleshooting.environmentVariables.arlocal)
            .map(([key, value]) => `  ${key}=${value}`)
            .join("\n");
        baseMessage +=
          "\nFor Mainnet:\n" +
          Object.entries(context.troubleshooting.environmentVariables.mainnet)
            .map(([key, value]) => `  ${key}=${value}`)
            .join("\n");
      }
      break;
    case ArweaveErrorCode.MINING_REQUIRED:
      baseMessage +=
        " Call the /mine endpoint to confirm pending transactions.";
      if (context?.troubleshooting?.steps) {
        baseMessage +=
          "\n\nTroubleshooting steps:\n" +
          context.troubleshooting.steps.join("\n");
      }
      if (context?.troubleshooting?.queueLength) {
        baseMessage += `\n\nQueue length: ${context.troubleshooting.queueLength} pending transactions`;
      }
      break;
    case ArweaveErrorCode.MINT_FAILED:
      baseMessage += " Check the address format and amount, then try again.";
      if (context?.troubleshooting?.steps) {
        baseMessage +=
          "\n\nTroubleshooting steps:\n" +
          context.troubleshooting.steps.join("\n");
      }
      if (context?.troubleshooting?.addressFormat) {
        baseMessage += `\n\nAddress format: ${context.troubleshooting.addressFormat}`;
      }
      if (context?.troubleshooting?.amountFormat) {
        baseMessage += `\n\nAmount format: ${context.troubleshooting.amountFormat}`;
      }
      break;
  }

  return baseMessage;
}

/**
 * Detects if ArLocal instance is unreachable and provides specific guidance
 * @param host - ArLocal host (default: localhost)
 * @param port - ArLocal port (default: 1984)
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns Promise<ArweaveError | null> - Error if unreachable, null if reachable
 */
export async function detectArLocalAvailability(
  host: string = "localhost",
  port: number = 1984,
  timeout: number = 5000,
): Promise<ArweaveError | null> {
  try {
    const url = `http://${host}:${port}/info`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new ArweaveError(
        `ArLocal is running but returned HTTP ${response.status}. Check ArLocal server health.`,
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        undefined,
        {
          host,
          port,
          httpStatus: response.status,
          troubleshooting: {
            steps: [
              "1. Check ArLocal server logs for errors",
              "2. Restart ArLocal: npx arlocal",
              "3. Verify no other service is using port 1984",
              "4. Check system resources (CPU/Memory)",
            ],
          },
        },
      );
    }

    // ArLocal is reachable and responding correctly
    return null;
  } catch (error) {
    const errorMessage = (error as Error).message.toLowerCase();

    // Connection refused - ArLocal not running
    if (errorMessage.includes("econnrefused")) {
      return new ArweaveError(
        "ArLocal is not running on localhost:1984. Please start ArLocal or switch to mainnet configuration.",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        error as Error,
        {
          host,
          port,
          troubleshooting: {
            steps: [
              "1. Install ArLocal: npm install -g arlocal",
              "2. Start ArLocal: npx arlocal",
              "3. Verify ArLocal is running: curl http://localhost:1984/info",
              "4. Or switch to mainnet configuration",
            ],
            environmentVariables: {
              arlocal: {
                ARWEAVE_GATEWAY: "localhost",
                ARWEAVE_PORT: "1984",
                ARWEAVE_PROTOCOL: "http",
              },
              mainnet: {
                ARWEAVE_GATEWAY: "arweave.net",
                ARWEAVE_PORT: "443",
                ARWEAVE_PROTOCOL: "https",
              },
            },
          },
        },
      );
    }

    // Timeout - ArLocal may be running but unresponsive
    if (errorMessage.includes("aborted") || errorMessage.includes("timeout")) {
      return new ArweaveError(
        "ArLocal request timed out. ArLocal may be running but unresponsive.",
        ArweaveErrorCode.NETWORK_ERROR,
        error as Error,
        {
          host,
          port,
          timeout,
          troubleshooting: {
            steps: [
              "1. Check if ArLocal process is running: ps aux | grep arlocal",
              "2. Check system resources (CPU/Memory usage)",
              "3. Restart ArLocal if it appears frozen",
              "4. Increase timeout if system is slow",
              "5. Check for port conflicts: lsof -i :1984",
            ],
          },
        },
      );
    }

    // Network error - general connectivity issue
    if (
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("failed to fetch")
    ) {
      return new ArweaveError(
        "Failed to connect to ArLocal. Check network configuration and ArLocal status.",
        ArweaveErrorCode.NETWORK_ERROR,
        error as Error,
        {
          host,
          port,
          troubleshooting: {
            steps: [
              "1. Verify ArLocal is running: curl http://localhost:1984/info",
              "2. Check firewall settings for port 1984",
              "3. Verify localhost resolution: ping localhost",
              "4. Try alternative host: 127.0.0.1 instead of localhost",
              "5. Restart ArLocal with verbose logging",
            ],
          },
        },
      );
    }

    // Unknown error
    return new ArweaveError(
      "Unknown error while connecting to ArLocal. Check ArLocal status and configuration.",
      ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      error as Error,
      {
        host,
        port,
        troubleshooting: {
          steps: [
            "1. Check ArLocal installation: npm list -g arlocal",
            "2. Reinstall ArLocal if needed: npm install -g arlocal",
            "3. Start ArLocal with verbose logging: npx arlocal --verbose",
            "4. Check system logs for related errors",
            "5. Switch to mainnet configuration as fallback",
          ],
        },
      },
    );
  }
}

/**
 * Creates comprehensive ArLocal troubleshooting guidance
 * @param errorCode - The specific ArLocal error code
 * @param context - Additional error context
 * @returns Detailed troubleshooting message
 */
export function createArLocalTroubleshootingGuidance(
  errorCode: ArweaveErrorCode,
  context: Record<string, any> = {},
): string {
  let guidance = "ArLocal Troubleshooting Guide:\n\n";

  switch (errorCode) {
    case ArweaveErrorCode.ARLOCAL_NOT_RUNNING:
      guidance += "Issue: ArLocal is not running or not accessible\n\n";
      guidance += "Quick Fix:\n";
      guidance += "1. Install: npm install -g arlocal\n";
      guidance += "2. Start: npx arlocal\n";
      guidance += "3. Test: curl http://localhost:1984/info\n\n";
      guidance += "Advanced Troubleshooting:\n";
      guidance += "- Check if port 1984 is in use: lsof -i :1984\n";
      guidance += "- Verify Node.js version compatibility\n";
      guidance += "- Check system resources (RAM/CPU)\n";
      guidance +=
        "- Try starting with verbose logging: npx arlocal --verbose\n\n";
      guidance += "Alternative: Switch to mainnet configuration\n";
      guidance += "Set environment variables:\n";
      guidance += "  ARWEAVE_GATEWAY=arweave.net\n";
      guidance += "  ARWEAVE_PORT=443\n";
      guidance += "  ARWEAVE_PROTOCOL=https\n";
      break;

    case ArweaveErrorCode.MINING_REQUIRED:
      guidance += "Issue: Transactions are pending and need to be mined\n\n";
      guidance += "Quick Fix:\n";
      guidance += "1. Mine transactions: curl http://localhost:1984/mine\n";
      guidance += "2. Check status: curl http://localhost:1984/info\n\n";
      guidance += "Understanding ArLocal Mining:\n";
      guidance += "- ArLocal requires manual mining to confirm transactions\n";
      guidance += "- Transactions remain pending until mined\n";
      guidance += "- Mining processes all pending transactions at once\n";
      if (context.queueLength) {
        guidance += `- Current queue length: ${context.queueLength} transactions\n`;
      }
      break;

    case ArweaveErrorCode.MINT_FAILED:
      guidance += "Issue: Token minting failed in ArLocal\n\n";
      guidance += "Quick Fix:\n";
      guidance += "1. Verify address format (43 characters, base64url)\n";
      guidance += "2. Check amount is positive integer in winston\n";
      guidance +=
        "3. Manual mint: curl http://localhost:1984/mint/{address}/{amount}\n\n";
      guidance += "Format Requirements:\n";
      guidance += "- Address: 43-character base64url string\n";
      guidance +=
        "- Amount: Positive integer in winston (1 AR = 1000000000000 winston)\n";
      guidance +=
        "- Example: curl http://localhost:1984/mint/abc123.../1000000000000\n";
      break;

    case ArweaveErrorCode.NETWORK_ERROR:
      guidance += "Issue: Network connectivity problems with ArLocal\n\n";
      guidance += "Quick Fix:\n";
      guidance += "1. Check ArLocal status: curl http://localhost:1984/info\n";
      guidance += "2. Restart ArLocal if unresponsive\n\n";
      guidance += "Network Diagnostics:\n";
      guidance += "- Test localhost resolution: ping localhost\n";
      guidance += "- Check firewall settings for port 1984\n";
      guidance += "- Verify no proxy interference\n";
      guidance += "- Try 127.0.0.1 instead of localhost\n";
      break;

    default:
      guidance += "General ArLocal troubleshooting steps:\n";
      guidance += "1. Verify installation: npm list -g arlocal\n";
      guidance += "2. Update ArLocal: npm update -g arlocal\n";
      guidance +=
        "3. Check documentation: https://github.com/textury/arlocal\n";
      guidance += "4. Switch to mainnet if issues persist\n";
  }

  guidance += "\nFor persistent issues:\n";
  guidance +=
    "- Check ArLocal GitHub issues: https://github.com/textury/arlocal/issues\n";
  guidance += "- Verify Node.js and npm versions\n";
  guidance +=
    "- Consider using Docker: docker run -p 1984:1984 textury/arlocal\n";

  return guidance;
}
