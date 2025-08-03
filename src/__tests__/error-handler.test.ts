import { describe, it, expect, beforeEach } from "bun:test";
import {
  mapArweaveError,
  handleArweaveError,
  isRetryableError,
  createUserFriendlyMessage,
  detectArLocalAvailability,
  createArLocalTroubleshootingGuidance,
} from "../utils/error-handler";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

describe("Error Handler", () => {
  describe("mapArweaveError", () => {
    it("should map ArLocal connection refused error", () => {
      const error = new Error("ECONNREFUSED");
      const context = { host: "localhost", port: 1984 };

      const result = mapArweaveError(error, context);

      expect(result).toBeInstanceOf(ArweaveError);
      expect(result.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      expect(result.message).toContain("ArLocal is not running");
      expect(result.context?.troubleshooting?.steps).toBeDefined();
    });

    it("should map ArLocal timeout error", () => {
      const error = new Error("Request timeout");
      const context = { host: "localhost", port: 1984 };

      const result = mapArweaveError(error, context);

      expect(result).toBeInstanceOf(ArweaveError);
      expect(result.code).toBe(ArweaveErrorCode.NETWORK_ERROR);
      expect(result.message).toContain("timed out");
      expect(result.context?.troubleshooting?.steps).toBeDefined();
    });

    it("should map mining required error", () => {
      const error = new Error("Mining required for pending transactions");
      const context = { queueLength: 3 };

      const result = mapArweaveError(error, context);

      expect(result).toBeInstanceOf(ArweaveError);
      expect(result.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
      expect(result.message).toContain("pending");
      expect(result.context?.troubleshooting?.queueLength).toBe(3);
    });

    it("should map mint failed error", () => {
      const error = new Error("Token minting failed");
      const context = { address: "test-address", amount: "1000" };

      const result = mapArweaveError(error, context);

      expect(result).toBeInstanceOf(ArweaveError);
      expect(result.code).toBe(ArweaveErrorCode.MINT_FAILED);
      expect(result.message).toContain("minting failed");
      expect(result.context?.troubleshooting?.addressFormat).toBeDefined();
    });

    it("should handle non-ArLocal errors normally", () => {
      const error = new Error("Insufficient balance");
      const context = {};

      const result = mapArweaveError(error, context);

      expect(result).toBeInstanceOf(ArweaveError);
      expect(result.code).toBe(ArweaveErrorCode.INSUFFICIENT_BALANCE);
    });
  });

  describe("createUserFriendlyMessage", () => {
    it("should create enhanced message for ARLOCAL_NOT_RUNNING", () => {
      const error = new ArweaveError(
        "ArLocal is not running",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        undefined,
        {
          troubleshooting: {
            steps: ["1. Install ArLocal", "2. Start ArLocal"],
            environmentVariables: {
              arlocal: { ARWEAVE_GATEWAY: "localhost" },
              mainnet: { ARWEAVE_GATEWAY: "arweave.net" },
            },
          },
        },
      );

      const message = createUserFriendlyMessage(error);

      expect(message).toContain("ArLocal is not running");
      expect(message).toContain("Troubleshooting steps:");
      expect(message).toContain("Environment configuration:");
      expect(message).toContain("ARWEAVE_GATEWAY=localhost");
    });

    it("should create enhanced message for MINING_REQUIRED", () => {
      const error = new ArweaveError(
        "Mining required",
        ArweaveErrorCode.MINING_REQUIRED,
        undefined,
        {
          troubleshooting: {
            steps: ["1. Mine transactions"],
            queueLength: 5,
          },
        },
      );

      const message = createUserFriendlyMessage(error);

      expect(message).toContain("Mining required");
      expect(message).toContain("Troubleshooting steps:");
      expect(message).toContain("Queue length: 5");
    });

    it("should create enhanced message for MINT_FAILED", () => {
      const error = new ArweaveError(
        "Mint failed",
        ArweaveErrorCode.MINT_FAILED,
        undefined,
        {
          troubleshooting: {
            steps: ["1. Check address format"],
            addressFormat: "43-character base64url",
            amountFormat: "Positive integer in winston",
          },
        },
      );

      const message = createUserFriendlyMessage(error);

      expect(message).toContain("Mint failed");
      expect(message).toContain("Address format: 43-character base64url");
      expect(message).toContain("Amount format: Positive integer in winston");
    });
  });

  describe("createArLocalTroubleshootingGuidance", () => {
    it("should create guidance for ARLOCAL_NOT_RUNNING", () => {
      const guidance = createArLocalTroubleshootingGuidance(
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      );

      expect(guidance).toContain("ArLocal Troubleshooting Guide");
      expect(guidance).toContain("Issue: ArLocal is not running");
      expect(guidance).toContain("npm install -g arlocal");
      expect(guidance).toContain("npx arlocal");
      expect(guidance).toContain("ARWEAVE_GATEWAY=arweave.net");
    });

    it("should create guidance for MINING_REQUIRED", () => {
      const guidance = createArLocalTroubleshootingGuidance(
        ArweaveErrorCode.MINING_REQUIRED,
        { queueLength: 3 },
      );

      expect(guidance).toContain("Issue: Transactions are pending");
      expect(guidance).toContain("curl http://localhost:1984/mine");
      expect(guidance).toContain("Current queue length: 3");
    });

    it("should create guidance for MINT_FAILED", () => {
      const guidance = createArLocalTroubleshootingGuidance(
        ArweaveErrorCode.MINT_FAILED,
      );

      expect(guidance).toContain("Issue: Token minting failed");
      expect(guidance).toContain("43-character base64url");
      expect(guidance).toContain("1000000000000 winston");
    });

    it("should create general guidance for unknown errors", () => {
      const guidance = createArLocalTroubleshootingGuidance(
        ArweaveErrorCode.UNKNOWN,
      );

      expect(guidance).toContain("General ArLocal troubleshooting");
      expect(guidance).toContain("npm list -g arlocal");
      expect(guidance).toContain("Switch to mainnet if issues persist");
    });
  });

  describe("isRetryableError", () => {
    it("should mark ARLOCAL_NOT_RUNNING as non-retryable", () => {
      const error = new ArweaveError(
        "ArLocal not running",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      );

      expect(isRetryableError(error)).toBe(false);
    });

    it("should mark MINING_REQUIRED as non-retryable", () => {
      const error = new ArweaveError(
        "Mining required",
        ArweaveErrorCode.MINING_REQUIRED,
      );

      expect(isRetryableError(error)).toBe(false);
    });

    it("should mark MINT_FAILED as non-retryable", () => {
      const error = new ArweaveError(
        "Mint failed",
        ArweaveErrorCode.MINT_FAILED,
      );

      expect(isRetryableError(error)).toBe(false);
    });

    it("should mark NETWORK_ERROR as retryable", () => {
      const error = new ArweaveError(
        "Network error",
        ArweaveErrorCode.NETWORK_ERROR,
      );

      expect(isRetryableError(error)).toBe(true);
    });
  });
});
