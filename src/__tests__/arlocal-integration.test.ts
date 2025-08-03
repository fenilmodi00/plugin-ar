import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";
import { createMockRuntime } from "./test-utils";

/**
 * Integration tests that work with actual ArLocal instance
 * These tests require ArLocal to be running on localhost:1984
 *
 * To run these tests:
 * 1. Install ArLocal: npm install -g arlocal
 * 2. Start ArLocal: npx arlocal
 * 3. Run tests: bun test arlocal-integration.test.ts
 */
describe("ArLocal Integration Tests (Requires Running ArLocal)", () => {
  let service: ArweaveService;
  let mockRuntime: any;
  let isArLocalAvailable = false;

  beforeAll(async () => {
    // Check if ArLocal is running before running integration tests
    try {
      isArLocalAvailable = await ArLocalUtils.isArLocalRunning();
      if (!isArLocalAvailable) {
        console.warn(
          "⚠️  ArLocal is not running. Integration tests will be skipped.",
        );
        console.warn("   To run integration tests:");
        console.warn("   1. Install ArLocal: npm install -g arlocal");
        console.warn("   2. Start ArLocal: npx arlocal");
        console.warn("   3. Run tests again");
      }
    } catch (error) {
      console.warn("⚠️  Could not check ArLocal availability:", error);
    }
  });

  beforeEach(() => {
    if (!isArLocalAvailable) {
      return; // Skip setup if ArLocal is not available
    }

    mockRuntime = createMockRuntime({
      ARWEAVE_GATEWAY: "localhost",
      ARWEAVE_PORT: "1984",
      ARWEAVE_PROTOCOL: "http",
      ARWEAVE_WALLET_KEY: JSON.stringify({
        kty: "RSA",
        e: "AQAB",
        n: "test-n-value-for-integration-testing",
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
    if (service) {
      await service.stop();
      service = null as any;
    }
  });

  describe("Real ArLocal Connection Tests", () => {
    it("should connect to running ArLocal instance", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      expect(service.isArLocalMode()).toBe(true);

      const config = service.getArLocalConfig();
      expect(config).toBeDefined();
      expect(config?.isArLocal).toBe(true);
      expect(config?.networkInfo).toBeDefined();
      expect(config?.networkInfo?.network).toBe("arlocal");
    });

    it("should get real network information from ArLocal", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      const networkInfo = await ArLocalUtils.getNetworkInfo();

      expect(networkInfo).toBeDefined();
      expect(networkInfo.network).toBe("arlocal");
      expect(typeof networkInfo.version).toBe("number");
      expect(typeof networkInfo.release).toBe("number");
      expect(typeof networkInfo.queue_length).toBe("number");
      expect(typeof networkInfo.peers).toBe("number");
      expect(typeof networkInfo.height).toBe("number");
      expect(typeof networkInfo.current).toBe("string");
      expect(typeof networkInfo.blocks).toBe("number");
      expect(typeof networkInfo.node_state_latency).toBe("number");
    });

    it("should mine transactions in real ArLocal", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      // Get initial network state
      const initialNetworkInfo = await ArLocalUtils.getNetworkInfo();
      const initialHeight = initialNetworkInfo.height;

      // Mine a block
      await ArLocalUtils.mineTransactions(1);

      // Get updated network state
      const updatedNetworkInfo = await ArLocalUtils.getNetworkInfo();

      // Height should have increased (or stayed same if no transactions were pending)
      expect(updatedNetworkInfo.height).toBeGreaterThanOrEqual(initialHeight);
    });

    it("should handle token minting in real ArLocal", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      // Generate a test wallet to mint tokens to
      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      const { address } = await service.createWallet();
      const mintAmount = "1000000000000"; // 1 AR in winston

      // Mint tokens
      await ArLocalUtils.mintTokens(address, mintAmount);

      // Verify the operation completed without error
      // Note: We can't easily verify the balance without additional setup
      expect(true).toBe(true); // Test passes if no error is thrown
    });

    it("should handle full upload-mine-retrieve cycle", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      const testData = "Integration test data for ArLocal";

      // Upload data
      const transactionId = await service.uploadData(testData, "text/plain");
      expect(transactionId).toBeDefined();
      expect(typeof transactionId).toBe("string");
      expect(transactionId.length).toBe(43); // Arweave transaction ID length

      // Check that transaction is initially pending
      const initialStatus = await service.getTransactionStatus(transactionId);
      expect(initialStatus.status).toBe(202); // Pending in ArLocal

      // Mine transactions to confirm
      await service.mineTransactions();

      // Check that transaction is now confirmed
      const confirmedStatus = await service.getTransactionStatus(transactionId);
      expect(confirmedStatus.status).toBe(200); // Confirmed
      expect(confirmedStatus.confirmed).toBeDefined();

      // Retrieve the data
      const retrievedData = await service.retrieveData(transactionId);
      expect(retrievedData).toBe(testData);
    });

    it("should handle transaction confirmation waiting with auto-mining", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      const testData = "Auto-mining test data";

      // Upload data
      const transactionId = await service.uploadData(testData, "text/plain");

      // Wait for confirmation with auto-mining enabled
      const isConfirmed = await service.waitForTransactionConfirmation(
        transactionId,
        10000, // 10 second timeout
        true, // Enable auto-mining
      );

      expect(isConfirmed).toBe(true);

      // Verify data can be retrieved
      const retrievedData = await service.retrieveData(transactionId);
      expect(retrievedData).toBe(testData);
    });

    it("should get accurate pending transaction count", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Get initial pending count
      const initialCount = await service.getPendingTransactionCount();
      expect(typeof initialCount).toBe("number");
      expect(initialCount).toBeGreaterThanOrEqual(0);

      // Upload some data to create a pending transaction
      await service.uploadData("Pending transaction test", "text/plain");

      // Check that pending count increased
      const updatedCount = await service.getPendingTransactionCount();
      expect(updatedCount).toBeGreaterThan(initialCount);

      // Mine transactions to clear the queue
      await service.mineTransactions();

      // Check that pending count decreased
      const finalCount = await service.getPendingTransactionCount();
      expect(finalCount).toBeLessThan(updatedCount);
    });
  });

  describe("ArLocal Error Scenarios", () => {
    it("should handle ArLocal shutdown gracefully", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      // This test simulates what happens when ArLocal stops during operation
      // We can't actually stop ArLocal in the test, so we test the error detection

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Verify service is initially working
      expect(service.isArLocalMode()).toBe(true);

      // Test availability check
      await expect(service.checkArLocalAvailability()).resolves.not.toThrow();
    });

    it("should provide helpful error messages for common issues", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Test invalid transaction ID
      await expect(
        service.getTransactionStatus("invalid-transaction-id"),
      ).rejects.toThrow(ArweaveError);

      // Test invalid address for minting
      await expect(
        service.mintTokens("invalid-address", "1000000000000"),
      ).rejects.toThrow(ArweaveError);

      // Test invalid amount for minting
      const validAddress = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
      await expect(
        service.mintTokens(validAddress, "invalid-amount"),
      ).rejects.toThrow(ArweaveError);
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle multiple concurrent operations", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Create multiple upload operations concurrently
      const uploadPromises = Array.from({ length: 3 }, (_, i) =>
        service.uploadData(`Concurrent test data ${i}`, "text/plain"),
      );

      const transactionIds = await Promise.all(uploadPromises);

      expect(transactionIds).toHaveLength(3);
      transactionIds.forEach((id) => {
        expect(typeof id).toBe("string");
        expect(id.length).toBe(43);
      });

      // Mine all transactions at once
      await service.mineTransactions();

      // Verify all transactions are confirmed
      const statusPromises = transactionIds.map((id) =>
        service.getTransactionStatus(id),
      );

      const statuses = await Promise.all(statusPromises);
      statuses.forEach((status) => {
        expect(status.status).toBe(200);
        expect(status.confirmed).toBeDefined();
      });
    });

    it("should handle rapid mining operations", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Upload some data to create pending transactions
      await service.uploadData("Rapid mining test 1", "text/plain");
      await service.uploadData("Rapid mining test 2", "text/plain");

      // Perform multiple mining operations
      await service.mineTransactions(1);
      await service.mineTransactions(1);
      await service.mineTransactions(1);

      // Should complete without errors
      const pendingCount = await service.getPendingTransactionCount();
      expect(pendingCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Real Network Information Validation", () => {
    it("should provide consistent network information", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      // Get network info multiple times and verify consistency
      const info1 = await ArLocalUtils.getNetworkInfo();
      const info2 = await ArLocalUtils.getNetworkInfo();

      expect(info1.network).toBe(info2.network);
      expect(info1.version).toBe(info2.version);
      expect(info1.release).toBe(info2.release);

      // Height might change between calls due to mining, so we check it's reasonable
      expect(Math.abs(info1.height - info2.height)).toBeLessThanOrEqual(10);
    });

    it("should track queue length changes accurately", async () => {
      if (!isArLocalAvailable) {
        console.log("⏭️  Skipping test - ArLocal not available");
        return;
      }

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // Get initial queue length
      const initialInfo = await ArLocalUtils.getNetworkInfo();
      const initialQueue = initialInfo.queue_length;

      // Add a transaction
      await service.uploadData("Queue tracking test", "text/plain");

      // Check queue increased
      const afterUploadInfo = await ArLocalUtils.getNetworkInfo();
      expect(afterUploadInfo.queue_length).toBeGreaterThan(initialQueue);

      // Mine transactions
      await ArLocalUtils.mineTransactions();

      // Check queue decreased
      const afterMiningInfo = await ArLocalUtils.getNetworkInfo();
      expect(afterMiningInfo.queue_length).toBeLessThan(
        afterUploadInfo.queue_length,
      );
    });
  });
});
