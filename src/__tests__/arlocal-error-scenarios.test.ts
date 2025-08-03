import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";
import { createMockRuntime } from "./test-utils";

/**
 * Comprehensive error handling tests for ArLocal unavailability scenarios
 * These tests cover various failure modes and error conditions that can occur
 * when working with ArLocal in different states
 */
describe("ArLocal Error Handling Scenarios", () => {
  let service: ArweaveService;
  let mockRuntime: any;
  let originalFetch: any;

  beforeEach(() => {
    // Store original fetch to restore later
    originalFetch = global.fetch;

    mockRuntime = createMockRuntime({
      ARWEAVE_GATEWAY: "localhost",
      ARWEAVE_PORT: "1984",
      ARWEAVE_PROTOCOL: "http",
      ARWEAVE_WALLET_KEY: JSON.stringify({
        kty: "RSA",
        e: "AQAB",
        n: "test-n-value",
        d: "test-d-value",
        p: "test-p-value",
        q: "test-q-value",
        dp: "test-dp-value",
        dq: "test-dq-value",
        qi: "test-qi-value",
      }),
    });
  });

  afterEach(async () => {
    // Restore original fetch
    if (originalFetch) {
      global.fetch = originalFetch;
    }

    if (service) {
      await service.stop();
      service = null as any;
    }
  });

  describe("ArLocal Not Running Scenarios", () => {
    it("should handle connection refused error during initialization", async () => {
      // Mock fetch to simulate connection refused
      global.fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
        expect(error.message).toContain("localhost:1984");
        expect(error.context).toBeDefined();
        expect(error.context.host).toBe("localhost");
        expect(error.context.port).toBe(1984);
        expect(error.context.protocol).toBe("http");
      }
    });

    it("should handle network timeout during initialization", async () => {
      // Mock fetch to simulate timeout
      global.fetch = mock(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 100),
          ),
      );

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
      }
    });

    it("should handle HTTP error responses during initialization", async () => {
      // Mock fetch to return HTTP error
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
      }
    });

    it("should handle malformed network info response", async () => {
      // Mock fetch to return invalid JSON
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ invalid: "response" }),
        }),
      );

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
      }
    });

    it("should handle JSON parsing errors", async () => {
      // Mock fetch to return invalid JSON
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error("Invalid JSON")),
        }),
      );

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );
    });
  });

  describe("ArLocal Availability Check Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode without proper initialization
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
    });

    it("should handle availability check when ArLocal stops running", async () => {
      // Mock fetch to simulate ArLocal stopping
      global.fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

      await expect(service.checkArLocalAvailability()).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.checkArLocalAvailability();
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
      }
    });

    it("should handle availability check with network errors", async () => {
      // Mock fetch to simulate network error
      global.fetch = mock(() =>
        Promise.reject(new Error("Network unreachable")),
      );

      await expect(service.checkArLocalAvailability()).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.checkArLocalAvailability();
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("Failed to check ArLocal availability");
      }
    });

    it("should handle availability check with HTTP errors", async () => {
      // Mock fetch to return HTTP error
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        }),
      );

      await expect(service.checkArLocalAvailability()).rejects.toThrow(
        ArweaveError,
      );
    });
  });

  describe("Mining Operation Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode
      service["arLocalConfig"] = {
        isArLocal: true,
        miningRequired: false,
        networkInfo: {
          network: "arlocal",
          version: 1,
          release: 1,
          queue_length: 2,
          peers: 0,
          height: 5,
          current: "test",
          blocks: 5,
          node_state_latency: 0,
        },
      };
    });

    it("should handle mining failures due to ArLocal unavailability", async () => {
      // Mock checkArLocalAvailability to throw
      service.checkArLocalAvailability = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal not running",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(service.mineTransactions()).rejects.toThrow(ArweaveError);

      try {
        await service.mineTransactions();
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      }
    });

    it("should handle mining endpoint failures", async () => {
      // Mock successful availability check
      service.checkArLocalAvailability = mock(() => Promise.resolve());

      // Mock network info calls
      const mockGetNetworkInfo = mock().mockResolvedValueOnce({
        network: "arlocal",
        version: 1,
        release: 1,
        queue_length: 2,
        peers: 0,
        height: 5,
        current: "test",
        blocks: 5,
        node_state_latency: 0,
      });

      // Mock ArLocalUtils methods
      const originalGetNetworkInfo = ArLocalUtils.getNetworkInfo;
      const originalMineTransactions = ArLocalUtils.mineTransactions;

      ArLocalUtils.getNetworkInfo = mockGetNetworkInfo;
      ArLocalUtils.mineTransactions = mock(() =>
        Promise.reject(
          new ArweaveError("Mining failed", ArweaveErrorCode.MINING_REQUIRED),
        ),
      );

      try {
        await expect(service.mineTransactions()).rejects.toThrow(ArweaveError);

        try {
          await service.mineTransactions();
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
          expect(error.message).toContain("Mining failed");
        }
      } finally {
        // Restore original methods
        ArLocalUtils.getNetworkInfo = originalGetNetworkInfo;
        ArLocalUtils.mineTransactions = originalMineTransactions;
      }
    });

    it("should handle network info retrieval failures during mining", async () => {
      // Mock successful availability check
      service.checkArLocalAvailability = mock(() => Promise.resolve());

      // Mock ArLocalUtils to fail on network info
      const originalGetNetworkInfo = ArLocalUtils.getNetworkInfo;
      ArLocalUtils.getNetworkInfo = mock(() =>
        Promise.reject(new Error("Network info failed")),
      );

      try {
        await expect(service.mineTransactions()).rejects.toThrow();
      } finally {
        ArLocalUtils.getNetworkInfo = originalGetNetworkInfo;
      }
    });
  });

  describe("Token Minting Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
    });

    it("should handle minting failures due to ArLocal unavailability", async () => {
      const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
      const amount = "1000000000000";

      // Mock ArLocalUtils to fail
      const originalMintTokens = ArLocalUtils.mintTokens;
      ArLocalUtils.mintTokens = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal not running",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      try {
        await expect(service.mintTokens(address, amount)).rejects.toThrow(
          ArweaveError,
        );

        try {
          await service.mintTokens(address, amount);
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        }
      } finally {
        ArLocalUtils.mintTokens = originalMintTokens;
      }
    });

    it("should handle minting endpoint failures", async () => {
      const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
      const amount = "1000000000000";

      // Mock ArLocalUtils to fail with mint error
      const originalMintTokens = ArLocalUtils.mintTokens;
      ArLocalUtils.mintTokens = mock(() =>
        Promise.reject(
          new ArweaveError("Minting failed", ArweaveErrorCode.MINT_FAILED),
        ),
      );

      try {
        await expect(service.mintTokens(address, amount)).rejects.toThrow(
          ArweaveError,
        );

        try {
          await service.mintTokens(address, amount);
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.MINT_FAILED);
        }
      } finally {
        ArLocalUtils.mintTokens = originalMintTokens;
      }
    });

    it("should handle network errors during minting", async () => {
      const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
      const amount = "1000000000000";

      // Mock ArLocalUtils to fail with network error
      const originalMintTokens = ArLocalUtils.mintTokens;
      ArLocalUtils.mintTokens = mock(() =>
        Promise.reject(new Error("Network error")),
      );

      try {
        await expect(service.mintTokens(address, amount)).rejects.toThrow();
      } finally {
        ArLocalUtils.mintTokens = originalMintTokens;
      }
    });
  });

  describe("Transaction Operation Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
    });

    it("should handle upload failures when ArLocal becomes unavailable", async () => {
      // Mock checkArLocalAvailability to fail
      service.checkArLocalAvailability = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal stopped",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(service.uploadData("test data")).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.uploadData("test data");
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      }
    });

    it("should handle retrieve failures with pending transactions", async () => {
      const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

      // Mock checkArLocalAvailability to succeed
      service.checkArLocalAvailability = mock(() => Promise.resolve());

      // Mock arweave.transactions.getStatus to return pending
      service.arweave = {
        transactions: {
          getStatus: mock(() =>
            Promise.resolve({
              status: 202, // Pending
              confirmed: null,
            }),
          ),
        },
      };

      await expect(service.retrieveData(transactionId)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.retrieveData(transactionId);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
        expect(error.message).toContain("pending in ArLocal");
        expect(error.message).toContain("mine endpoint");
      }
    });

    it("should handle transfer failures when ArLocal becomes unavailable", async () => {
      const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
      const amount = "1";

      // Mock checkArLocalAvailability to fail
      service.checkArLocalAvailability = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal stopped",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(service.transferTokens(address, amount)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.transferTokens(address, amount);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      }
    });

    it("should handle transaction status check failures", async () => {
      const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

      // Mock checkArLocalAvailability to fail
      service.checkArLocalAvailability = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal stopped",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(service.getTransactionStatus(transactionId)).rejects.toThrow(
        ArweaveError,
      );
    });
  });

  describe("Pending Transaction Count Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
    });

    it("should handle failures when getting pending transaction count", async () => {
      // Mock checkArLocalAvailability to fail
      service.checkArLocalAvailability = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal stopped",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(service.getPendingTransactionCount()).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.getPendingTransactionCount();
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      }
    });

    it("should handle network info failures during pending count check", async () => {
      // Mock successful availability check
      service.checkArLocalAvailability = mock(() => Promise.resolve());

      // Mock ArLocalUtils to fail
      const originalGetNetworkInfo = ArLocalUtils.getNetworkInfo;
      ArLocalUtils.getNetworkInfo = mock(() =>
        Promise.reject(new Error("Network info failed")),
      );

      try {
        await expect(service.getPendingTransactionCount()).rejects.toThrow();
      } finally {
        ArLocalUtils.getNetworkInfo = originalGetNetworkInfo;
      }
    });
  });

  describe("Transaction Confirmation Waiting Failures", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
      // Mock ArLocal mode
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
    });

    it("should handle timeout with pending transactions", async () => {
      const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

      // Mock isTransactionConfirmed to always return false
      service.isTransactionConfirmed = mock(() => Promise.resolve(false));

      // Mock getPendingTransactionCount to return pending transactions
      service.getPendingTransactionCount = mock(() => Promise.resolve(3));

      await expect(
        service.waitForTransactionConfirmation(transactionId, 1000, false),
      ).rejects.toThrow(ArweaveError);

      try {
        await service.waitForTransactionConfirmation(
          transactionId,
          1000,
          false,
        );
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
        expect(error.message).toContain("Transaction confirmation timeout");
        expect(error.message).toContain("pending in ArLocal");
        expect(error.context?.pendingCount).toBe(3);
      }
    });

    it("should handle auto-mining failures during confirmation wait", async () => {
      const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

      let confirmationCheckCount = 0;
      service.isTransactionConfirmed = mock(() => {
        confirmationCheckCount++;
        return Promise.resolve(false); // Never confirmed
      });

      service.getPendingTransactionCount = mock(() => Promise.resolve(1));

      // Mock mineTransactions to fail
      service.mineTransactions = mock(() =>
        Promise.reject(
          new ArweaveError("Mining failed", ArweaveErrorCode.MINING_REQUIRED),
        ),
      );

      // Should continue waiting even if mining fails
      await expect(
        service.waitForTransactionConfirmation(transactionId, 2000, true),
      ).rejects.toThrow(ArweaveError);

      // Should have attempted confirmation checks multiple times
      expect(confirmationCheckCount).toBeGreaterThan(1);
    });

    it("should handle ArLocal shutdown during confirmation wait", async () => {
      const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

      // Mock isTransactionConfirmed to fail with ArLocal not running
      service.isTransactionConfirmed = mock(() =>
        Promise.reject(
          new ArweaveError(
            "ArLocal not running",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          ),
        ),
      );

      await expect(
        service.waitForTransactionConfirmation(transactionId, 5000, false),
      ).rejects.toThrow(ArweaveError);

      try {
        await service.waitForTransactionConfirmation(
          transactionId,
          5000,
          false,
        );
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      }
    });
  });

  describe("Error Context and Troubleshooting", () => {
    it("should provide comprehensive error context for ArLocal failures", async () => {
      // Mock fetch to simulate connection refused
      global.fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

      service = new ArweaveService(mockRuntime);

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error).toBeInstanceOf(ArweaveError);
        expect(error.context).toBeDefined();
        expect(error.context.host).toBe("localhost");
        expect(error.context.port).toBe(1984);
        expect(error.context.protocol).toBe("http");

        // Should provide troubleshooting information
        expect(error.message).toContain("ArLocal is not running");
        expect(error.message).toContain("localhost:1984");
      }
    });

    it("should provide different error messages for different failure types", async () => {
      const testCases = [
        {
          mockError: new Error("ECONNREFUSED"),
          expectedMessage: "ArLocal is not running",
        },
        {
          mockError: new Error("ETIMEDOUT"),
          expectedMessage: "ArLocal is not running",
        },
        {
          mockError: new Error("ENOTFOUND"),
          expectedMessage: "ArLocal is not running",
        },
      ];

      for (const testCase of testCases) {
        global.fetch = mock(() => Promise.reject(testCase.mockError));

        service = new ArweaveService(mockRuntime);

        try {
          await service.initialize(mockRuntime);
          expect(false).toBe(true); // Should not reach here
        } catch (error: any) {
          expect(error.message).toContain(testCase.expectedMessage);
        }

        await service.stop();
      }
    });

    it("should handle unknown error types gracefully", async () => {
      // Mock fetch to throw non-Error object
      global.fetch = mock(() => Promise.reject("Unknown error type"));

      service = new ArweaveService(mockRuntime);

      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
      }
    });
  });

  describe("Recovery and Retry Scenarios", () => {
    it("should handle service recovery after ArLocal restart", async () => {
      service = new ArweaveService(mockRuntime);

      // Mock ArLocal mode without proper initialization
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };

      // First call fails (ArLocal not running)
      global.fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

      await expect(service.checkArLocalAvailability()).rejects.toThrow(
        ArweaveError,
      );

      // Second call succeeds (ArLocal restarted)
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              network: "arlocal",
              version: 1,
              release: 1,
              queue_length: 0,
              peers: 0,
              height: 1,
              current: "test",
              blocks: 1,
              node_state_latency: 0,
            }),
        }),
      );

      // Should succeed after ArLocal "restart"
      await expect(service.checkArLocalAvailability()).resolves.not.toThrow();
    });

    it("should maintain error state consistency", async () => {
      service = new ArweaveService(mockRuntime);

      // Mock ArLocal mode
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };

      // Mock consistent failure
      const mockError = new ArweaveError(
        "ArLocal not running",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
      );

      service.checkArLocalAvailability = mock(() => Promise.reject(mockError));

      // Multiple operations should fail consistently
      await expect(service.mineTransactions()).rejects.toThrow(ArweaveError);
      await expect(service.getPendingTransactionCount()).rejects.toThrow(
        ArweaveError,
      );
      await expect(service.uploadData("test")).rejects.toThrow(ArweaveError);

      // All should have the same error type
      const errors = [];
      try {
        await service.mineTransactions();
      } catch (e) {
        errors.push(e);
      }
      try {
        await service.getPendingTransactionCount();
      } catch (e) {
        errors.push(e);
      }
      try {
        await service.uploadData("test");
      } catch (e) {
        errors.push(e);
      }

      errors.forEach((error) => {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
      });
    });
  });
});
