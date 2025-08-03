import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ArweaveService } from "../services/ArweaveService";
import { ArweaveErrorCode, ArweaveError } from "../types/arweave.types";

// Mock runtime for testing
const createMockRuntime = (settings: Record<string, string> = {}) => ({
  getSetting: (key: string) => settings[key],
});

describe("ArweaveService ArLocal Integration", () => {
  let service: ArweaveService;
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  describe("ArLocal Configuration Detection", () => {
    it("should detect mainnet configuration by default", async () => {
      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      expect(service.isArLocalMode()).toBe(false);
      expect(service.getArLocalConfig()).toBeDefined();
      expect(service.getArLocalConfig()?.isArLocal).toBe(false);
    });

    it("should detect ArLocal configuration when configured", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      // This should throw because ArLocal is not actually running in test environment
      await expect(service.initialize(mockRuntime)).rejects.toThrow();
    });

    it("should have correct capability description for mainnet", async () => {
      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      const description = service.capabilityDescription;
      expect(description).toContain("Arweave mainnet");
      expect(description).not.toContain("ArLocal");
    });

    it("should detect ArLocal configuration correctly", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      // Check the internal configuration
      expect(service["arweaveConfig"].gatewayHost).toBe("localhost");
      expect(service["arweaveConfig"].port).toBe(1984);
      expect(service["arweaveConfig"].protocol).toBe("http");
    });
  });

  describe("ArLocal Error Handling", () => {
    beforeEach(() => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });
      service = new ArweaveService(mockRuntime);
    });

    it("should throw ARLOCAL_NOT_RUNNING error when ArLocal is not available", async () => {
      try {
        await service.initialize(mockRuntime);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
        expect(error.message).toContain("localhost:1984");
      }
    });

    it("should handle ArLocal availability check", async () => {
      // Skip initialization to avoid the error
      service["arLocalConfig"] = { isArLocal: true, miningRequired: false };

      await expect(service.checkArLocalAvailability()).rejects.toThrow();
    });
  });

  describe("Service Configuration", () => {
    it("should store ArLocal configuration correctly", () => {
      const validWalletKey = JSON.stringify({
        kty: "RSA",
        e: "AQAB",
        n: "test-n",
        d: "test-d",
        p: "test-p",
        q: "test-q",
        dp: "test-dp",
        dq: "test-dq",
        qi: "test-qi",
      });

      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
        ARWEAVE_WALLET_KEY: validWalletKey,
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("localhost");
      expect(config.port).toBe(1984);
      expect(config.protocol).toBe("http");
      expect(config.walletKey).toBe(validWalletKey);
      expect(config.timeout).toBe(20000);
      expect(config.logging).toBe(false);
    });

    it("should use default mainnet configuration", () => {
      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("cu.ardrive.io");
      expect(config.port).toBe(443);
      expect(config.protocol).toBe("https");
      expect(config.timeout).toBe(20000);
      expect(config.logging).toBe(false);
    });

    it("should handle custom mainnet configuration", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "arweave.net",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("arweave.net");
      expect(config.port).toBe(443);
      expect(config.protocol).toBe("https");
    });
  });

  describe("ArLocal Methods", () => {
    beforeEach(() => {
      service = new ArweaveService(mockRuntime);
    });

    it("should return false for isArLocalMode when not configured", async () => {
      await service.initialize(mockRuntime);
      expect(service.isArLocalMode()).toBe(false);
    });

    it("should return ArLocal config when available", async () => {
      await service.initialize(mockRuntime);
      const config = service.getArLocalConfig();
      expect(config).toBeDefined();
      expect(config?.isArLocal).toBe(false);
    });
  });

  describe("Token Minting (ArLocal Only)", () => {
    describe("Mainnet Mode", () => {
      beforeEach(async () => {
        service = new ArweaveService(mockRuntime);
        await service.initialize(mockRuntime);
      });

      it("should reject minting when not in ArLocal mode", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const amount = "1000000000000"; // 1 AR in winston

        await expect(service.mintTokens(address, amount)).rejects.toThrow();

        try {
          await service.mintTokens(address, amount);
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.INVALID_CONFIG);
          expect(error.message).toContain(
            "Token minting is only available in ArLocal development mode",
          );
          expect(error.context?.mode).toBe("mainnet");
        }
      });
    });

    describe("ArLocal Mode (Mocked)", () => {
      beforeEach(() => {
        mockRuntime = createMockRuntime({
          ARWEAVE_GATEWAY: "localhost",
          ARWEAVE_PORT: "1984",
          ARWEAVE_PROTOCOL: "http",
        });
        service = new ArweaveService(mockRuntime);

        // Mock ArLocal mode without initialization to avoid connection errors
        service["arLocalConfig"] = {
          isArLocal: true,
          miningRequired: false,
          networkInfo: {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 0,
            peers: 0,
            height: 1,
            current: "test",
            blocks: 1,
            node_state_latency: 0,
          },
        };
      });

      it("should validate address format", async () => {
        const invalidAddresses = [
          "", // empty
          "short", // too short
          "abcdefghijklmnopqrstuvwxyz1234567890123456789X", // too long
          "abcdefghijklmnopqrstuvwxyz1234567890123456789!", // invalid character
          "abcdefghijklmnopqrstuvwxyz123456789012345678", // too short by 1
        ];

        for (const address of invalidAddresses) {
          await expect(
            service.mintTokens(address, "1000000000000"),
          ).rejects.toThrow();

          try {
            await service.mintTokens(address, "1000000000000");
          } catch (error: any) {
            expect(error.code).toBe(ArweaveErrorCode.INVALID_PARAMETERS);
            expect(error.message).toMatch(/address|Address/);
          }
        }
      });

      it("should validate amount format", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const invalidAmounts = [
          "", // empty
          "abc", // non-numeric
          "-1000", // negative
          "1000.5", // decimal
          "0", // zero (should be positive)
        ];

        for (const amount of invalidAmounts) {
          await expect(service.mintTokens(address, amount)).rejects.toThrow();

          try {
            await service.mintTokens(address, amount);
          } catch (error: any) {
            expect(error.code).toBe(ArweaveErrorCode.INVALID_PARAMETERS);
            expect(error.message).toMatch(/amount|Amount/);
          }
        }
      });

      it("should accept valid address and amount", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const amount = "1000000000000"; // 1 AR in winston

        // Mock the ArLocalUtils.mintTokens to avoid actual network call
        const originalMintTokens =
          require("../utils/arlocal").ArLocalUtils.mintTokens;
        require("../utils/arlocal").ArLocalUtils.mintTokens = async () => {
          // Mock successful minting
          return Promise.resolve();
        };

        try {
          await service.mintTokens(address, amount);
          // If we reach here, the validation passed
          expect(true).toBe(true);
        } catch (error) {
          // Should not throw for valid inputs
          expect(false).toBe(true);
        } finally {
          // Restore original method
          require("../utils/arlocal").ArLocalUtils.mintTokens =
            originalMintTokens;
        }
      });

      it("should handle ArLocal availability check failure", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const amount = "1000000000000";

        // Mock ArLocalUtils.mintTokens to throw ArLocal not running error
        const originalMintTokens =
          require("../utils/arlocal").ArLocalUtils.mintTokens;
        require("../utils/arlocal").ArLocalUtils.mintTokens = async () => {
          throw new ArweaveError(
            "ArLocal is not running",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          );
        };

        try {
          await expect(service.mintTokens(address, amount)).rejects.toThrow();
        } finally {
          require("../utils/arlocal").ArLocalUtils.mintTokens =
            originalMintTokens;
        }
      });

      it("should handle minting operation failure", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const amount = "1000000000000";

        // Mock ArLocalUtils.mintTokens to throw
        const originalMintTokens =
          require("../utils/arlocal").ArLocalUtils.mintTokens;
        require("../utils/arlocal").ArLocalUtils.mintTokens = async () => {
          throw new Error("Minting failed");
        };

        try {
          await expect(service.mintTokens(address, amount)).rejects.toThrow();
        } finally {
          // Restore original method
          require("../utils/arlocal").ArLocalUtils.mintTokens =
            originalMintTokens;
        }
      });

      it("should handle winston to AR conversion gracefully", async () => {
        const address = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const amount = "1000000000000";

        // Mock successful operations
        const originalMintTokens =
          require("../utils/arlocal").ArLocalUtils.mintTokens;
        require("../utils/arlocal").ArLocalUtils.mintTokens = async () =>
          Promise.resolve();

        // Mock arweave.ar.winstonToAr to throw (simulate conversion error)
        const originalWinstonToAr = service.arweave.ar.winstonToAr;
        service.arweave.ar.winstonToAr = () => {
          throw new Error("Conversion failed");
        };

        try {
          // Should not throw even if conversion fails
          await service.mintTokens(address, amount);
          expect(true).toBe(true);
        } catch (error) {
          expect(false).toBe(true); // Should not fail due to conversion error
        } finally {
          // Restore original methods
          require("../utils/arlocal").ArLocalUtils.mintTokens =
            originalMintTokens;
          service.arweave.ar.winstonToAr = originalWinstonToAr;
        }
      });
    });

    describe("Parameter Validation Edge Cases", () => {
      beforeEach(() => {
        service = new ArweaveService(mockRuntime);
        service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
      });

      it("should handle null and undefined parameters", async () => {
        const validAddress = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address

        // Test null address
        await expect(service.mintTokens(null as any, "1000")).rejects.toThrow();

        // Test undefined address
        await expect(
          service.mintTokens(undefined as any, "1000"),
        ).rejects.toThrow();

        // Test null amount
        await expect(
          service.mintTokens(validAddress, null as any),
        ).rejects.toThrow();

        // Test undefined amount
        await expect(
          service.mintTokens(validAddress, undefined as any),
        ).rejects.toThrow();
      });

      it("should handle whitespace in parameters", async () => {
        const validAddress = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG"; // Valid 43-char address
        const originalMintTokens =
          require("../utils/arlocal").ArLocalUtils.mintTokens;
        require("../utils/arlocal").ArLocalUtils.mintTokens = async (
          addr: string,
          amt: string,
        ) => {
          // Verify that whitespace is trimmed by ArLocalUtils
          expect(addr).toBe(`  ${validAddress}  `);
          expect(amt).toBe("  1000000000000  ");
          return Promise.resolve();
        };

        try {
          // Should pass whitespace to ArLocalUtils which handles trimming
          await service.mintTokens(`  ${validAddress}  `, "  1000000000000  ");
          expect(true).toBe(true);
        } finally {
          require("../utils/arlocal").ArLocalUtils.mintTokens =
            originalMintTokens;
        }
      });
    });
  });

  describe("Transaction Mining Support", () => {
    describe("Mainnet Mode", () => {
      beforeEach(async () => {
        service = new ArweaveService(mockRuntime);
        await service.initialize(mockRuntime);
      });

      it("should reject mining when not in ArLocal mode", async () => {
        await expect(service.mineTransactions()).rejects.toThrow();

        try {
          await service.mineTransactions();
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.INVALID_CONFIG);
          expect(error.message).toContain(
            "Transaction mining is only available in ArLocal development mode",
          );
          expect(error.context?.mode).toBe("mainnet");
        }
      });

      it("should reject pending transaction count check when not in ArLocal mode", async () => {
        await expect(service.getPendingTransactionCount()).rejects.toThrow();

        try {
          await service.getPendingTransactionCount();
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.INVALID_CONFIG);
          expect(error.message).toContain(
            "Pending transaction count is only available in ArLocal development mode",
          );
          expect(error.context?.mode).toBe("mainnet");
        }
      });
    });

    describe("ArLocal Mode (Mocked)", () => {
      beforeEach(() => {
        mockRuntime = createMockRuntime({
          ARWEAVE_GATEWAY: "localhost",
          ARWEAVE_PORT: "1984",
          ARWEAVE_PROTOCOL: "http",
        });
        service = new ArweaveService(mockRuntime);

        // Mock ArLocal mode without initialization to avoid connection errors
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

      it("should mine transactions successfully", async () => {
        const originalMineTransactions =
          require("../utils/arlocal").ArLocalUtils.mineTransactions;
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;
        const originalGetArLocalConfig =
          require("../utils/arlocal").ArLocalUtils.getArLocalConfig;

        let mineCallCount = 0;
        let networkInfoCallCount = 0;

        require("../utils/arlocal").ArLocalUtils.mineTransactions = async (
          blocks: number,
        ) => {
          mineCallCount++;
          expect(blocks).toBe(1); // Default blocks
          return Promise.resolve();
        };

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          networkInfoCallCount++;
          if (networkInfoCallCount === 1) {
            // Before mining
            return {
              network: "arlocal",
              version: 1,
              release: 1,
              queue_length: 2,
              peers: 0,
              height: 5,
              current: "test",
              blocks: 5,
              node_state_latency: 0,
            };
          } else {
            // After mining
            return {
              network: "arlocal",
              version: 1,
              release: 1,
              queue_length: 0,
              peers: 0,
              height: 6,
              current: "test",
              blocks: 6,
              node_state_latency: 0,
            };
          }
        };

        require("../utils/arlocal").ArLocalUtils.getArLocalConfig =
          async () => {
            return {
              isArLocal: true,
              miningRequired: false,
              networkInfo: {
                network: "arlocal",
                version: 1,
                release: 1,
                queue_length: 0,
                peers: 0,
                height: 6,
                current: "test",
                blocks: 6,
                node_state_latency: 0,
              },
            };
          };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          await service.mineTransactions();
          expect(mineCallCount).toBe(1);
          expect(networkInfoCallCount).toBe(2); // Before and after mining
        } finally {
          require("../utils/arlocal").ArLocalUtils.mineTransactions =
            originalMineTransactions;
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
          require("../utils/arlocal").ArLocalUtils.getArLocalConfig =
            originalGetArLocalConfig;
        }
      });

      it("should handle no pending transactions gracefully", async () => {
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          return {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 0, // No pending transactions
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          };
        };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          await service.mineTransactions();
          // Should complete without error
          expect(true).toBe(true);
        } finally {
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
        }
      });

      it("should mine custom number of blocks", async () => {
        const originalMineTransactions =
          require("../utils/arlocal").ArLocalUtils.mineTransactions;
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;
        const originalGetArLocalConfig =
          require("../utils/arlocal").ArLocalUtils.getArLocalConfig;

        let mineCallCount = 0;

        require("../utils/arlocal").ArLocalUtils.mineTransactions = async (
          blocks: number,
        ) => {
          mineCallCount++;
          expect(blocks).toBe(3); // Custom blocks
          return Promise.resolve();
        };

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          return {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 1,
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          };
        };

        require("../utils/arlocal").ArLocalUtils.getArLocalConfig =
          async () => {
            return {
              isArLocal: true,
              miningRequired: false,
              networkInfo: {
                network: "arlocal",
                version: 1,
                release: 1,
                queue_length: 0,
                peers: 0,
                height: 8,
                current: "test",
                blocks: 8,
                node_state_latency: 0,
              },
            };
          };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          await service.mineTransactions(3);
          expect(mineCallCount).toBe(1);
        } finally {
          require("../utils/arlocal").ArLocalUtils.mineTransactions =
            originalMineTransactions;
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
          require("../utils/arlocal").ArLocalUtils.getArLocalConfig =
            originalGetArLocalConfig;
        }
      });

      it("should get pending transaction count", async () => {
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          return {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 5,
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          };
        };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          const count = await service.getPendingTransactionCount();
          expect(count).toBe(5);
        } finally {
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
        }
      });

      it("should check transaction confirmation status", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

        // Mock getTransactionStatus to return confirmed status
        service.getTransactionStatus = async (txId: string) => {
          expect(txId).toBe(transactionId);
          return {
            status: 200,
            confirmed: {
              block_height: 10,
              block_indep_hash: "test_hash",
              number_of_confirmations: 5,
            },
          };
        };

        const isConfirmed = await service.isTransactionConfirmed(transactionId);
        expect(isConfirmed).toBe(true);
      });

      it("should handle pending transaction confirmation status", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

        // Mock getTransactionStatus to return pending status
        service.getTransactionStatus = async (txId: string) => {
          expect(txId).toBe(transactionId);
          return {
            status: 202,
            confirmed: null,
          };
        };

        const isConfirmed = await service.isTransactionConfirmed(transactionId);
        expect(isConfirmed).toBe(false);
      });

      it("should handle transaction not found gracefully", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

        // Mock getTransactionStatus to throw DATA_NOT_FOUND error
        service.getTransactionStatus = async (txId: string) => {
          throw new ArweaveError(
            "Transaction not found",
            ArweaveErrorCode.DATA_NOT_FOUND,
          );
        };

        const isConfirmed = await service.isTransactionConfirmed(transactionId);
        expect(isConfirmed).toBe(false);
      });

      it("should provide mining guidance", async () => {
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;
        const originalCreateMiningGuidance =
          require("../utils/arlocal").ArLocalUtils.createMiningGuidance;

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          return {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 3,
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          };
        };

        require("../utils/arlocal").ArLocalUtils.createMiningGuidance = (
          queueLength: number,
        ) => {
          expect(queueLength).toBe(3);
          return "3 transaction(s) pending confirmation. Use the mine endpoint to confirm transactions.";
        };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          const guidance = await service.getMiningGuidance();
          expect(guidance).toContain("3 transaction(s) pending confirmation");
        } finally {
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
          require("../utils/arlocal").ArLocalUtils.createMiningGuidance =
            originalCreateMiningGuidance;
        }
      });
    });

    describe("Transaction Confirmation Waiting", () => {
      beforeEach(() => {
        mockRuntime = createMockRuntime({
          ARWEAVE_GATEWAY: "localhost",
          ARWEAVE_PORT: "1984",
          ARWEAVE_PROTOCOL: "http",
        });
        service = new ArweaveService(mockRuntime);

        // Mock ArLocal mode
        service["arLocalConfig"] = {
          isArLocal: true,
          miningRequired: false,
          networkInfo: {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 1,
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          },
        };
      });

      it("should wait for transaction confirmation successfully", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
        let confirmationCheckCount = 0;

        service.isTransactionConfirmed = async (txId: string) => {
          confirmationCheckCount++;
          expect(txId).toBe(transactionId);

          // Return true on second check (simulate confirmation after first check)
          return confirmationCheckCount >= 2;
        };

        const result = await service.waitForTransactionConfirmation(
          transactionId,
          5000,
        );
        expect(result).toBe(true);
        expect(confirmationCheckCount).toBeGreaterThanOrEqual(2);
      });

      it("should timeout when transaction is not confirmed", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

        service.isTransactionConfirmed = async () => false; // Never confirmed
        service.getPendingTransactionCount = async () => 1; // Has pending transactions

        await expect(
          service.waitForTransactionConfirmation(transactionId, 2000),
        ).rejects.toThrow();

        try {
          await service.waitForTransactionConfirmation(transactionId, 2000);
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
          expect(error.message).toContain("Transaction confirmation timeout");
          expect(error.message).toContain("pending in ArLocal");
        }
      });

      it("should auto-mine when enabled and transaction is pending", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
        let confirmationCheckCount = 0;
        let mineCallCount = 0;

        service.isTransactionConfirmed = async (txId: string) => {
          confirmationCheckCount++;

          if (confirmationCheckCount === 1) {
            return false; // First check: not confirmed
          } else if (confirmationCheckCount === 2) {
            return false; // Second check after getting pending count: still not confirmed
          } else {
            return true; // Third check after mining: confirmed
          }
        };

        service.getPendingTransactionCount = async () => 1;

        service.mineTransactions = async (blocks: number) => {
          mineCallCount++;
          expect(blocks).toBe(1);
          return Promise.resolve();
        };

        const result = await service.waitForTransactionConfirmation(
          transactionId,
          5000,
          true,
        );
        expect(result).toBe(true);
        expect(mineCallCount).toBe(1);
        expect(confirmationCheckCount).toBeGreaterThanOrEqual(3);
      });

      it("should handle mining errors gracefully", async () => {
        const transactionId = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";

        service.isTransactionConfirmed = async () => false;
        service.getPendingTransactionCount = async () => 1;
        service.mineTransactions = async () => {
          throw new ArweaveError(
            "Mining failed",
            ArweaveErrorCode.MINING_REQUIRED,
          );
        };

        // Should continue waiting even if mining fails
        await expect(
          service.waitForTransactionConfirmation(transactionId, 2000, true),
        ).rejects.toThrow();
      });
    });

    describe("Error Handling", () => {
      beforeEach(() => {
        service = new ArweaveService(mockRuntime);
        service["arLocalConfig"] = { isArLocal: true, miningRequired: false };
      });

      it("should handle ArLocal not running during mining", async () => {
        service.checkArLocalAvailability = async () => {
          throw new ArweaveError(
            "ArLocal is not running",
            ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
          );
        };

        await expect(service.mineTransactions()).rejects.toThrow();

        try {
          await service.mineTransactions();
        } catch (error: any) {
          expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        }
      });

      it("should handle mining operation failure", async () => {
        const originalMineTransactions =
          require("../utils/arlocal").ArLocalUtils.mineTransactions;
        const originalGetNetworkInfo =
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo;

        require("../utils/arlocal").ArLocalUtils.getNetworkInfo = async () => {
          return {
            network: "arlocal",
            version: 1,
            release: 1,
            queue_length: 1,
            peers: 0,
            height: 5,
            current: "test",
            blocks: 5,
            node_state_latency: 0,
          };
        };

        require("../utils/arlocal").ArLocalUtils.mineTransactions =
          async () => {
            throw new Error("Mining operation failed");
          };

        // Mock checkArLocalAvailability to avoid network calls
        service.checkArLocalAvailability = async () => Promise.resolve();

        try {
          await expect(service.mineTransactions()).rejects.toThrow();
        } finally {
          require("../utils/arlocal").ArLocalUtils.mineTransactions =
            originalMineTransactions;
          require("../utils/arlocal").ArLocalUtils.getNetworkInfo =
            originalGetNetworkInfo;
        }
      });
    });
  });
});
