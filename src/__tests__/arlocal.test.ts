import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  ArLocalUtils,
  ArLocalNetworkInfo,
  ArLocalConfig,
} from "../utils/arlocal";
import {
  ArweaveError,
  ArweaveErrorCode,
  ArweaveConfig,
} from "../types/arweave.types";

// Mock fetch globally
const mockFetch = mock();
global.fetch = mockFetch;

describe("ArLocalUtils", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe("isArLocalConfig", () => {
    it("should return true for ArLocal configuration", () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "http",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);
    });

    it("should return true for 127.0.0.1 configuration", () => {
      const config: ArweaveConfig = {
        gatewayHost: "127.0.0.1",
        protocol: "http",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);
    });

    it("should return false for mainnet configuration", () => {
      const config: ArweaveConfig = {
        gatewayHost: "arweave.net",
        protocol: "https",
        port: 443,
        timeout: 20000,
        logging: false,
      };

      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });

    it("should return false for localhost with wrong port", () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "http",
        port: 8080,
        timeout: 20000,
        logging: false,
      };

      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });

    it("should return false for localhost with https protocol", () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "https",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });
  });

  describe("isArLocalRunning", () => {
    it("should return true when ArLocal is running", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await ArLocalUtils.isArLocalRunning();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1984/info",
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should return false when ArLocal is not running", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await ArLocalUtils.isArLocalRunning();
      expect(result).toBe(false);
    });

    it("should return false when ArLocal returns error status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await ArLocalUtils.isArLocalRunning();
      expect(result).toBe(false);
    });

    it("should use custom host and port", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await ArLocalUtils.isArLocalRunning("127.0.0.1", 8080);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8080/info",
        expect.any(Object),
      );
    });
  });

  describe("getNetworkInfo", () => {
    const mockNetworkInfo: ArLocalNetworkInfo = {
      network: "arlocal",
      version: 5,
      release: 55,
      queue_length: 0,
      peers: 0,
      height: 100,
      current: "test-block-hash",
      blocks: 100,
      node_state_latency: 0,
    };

    it("should return network info when ArLocal is running", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNetworkInfo,
      });

      const result = await ArLocalUtils.getNetworkInfo();
      expect(result).toEqual(mockNetworkInfo);
    });

    it("should throw ArweaveError when ArLocal is not running", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(ArLocalUtils.getNetworkInfo()).rejects.toThrow(ArweaveError);
      await expect(ArLocalUtils.getNetworkInfo()).rejects.toThrow(
        "ArLocal is not running on localhost:1984",
      );
    });

    it("should throw ArweaveError when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const error = await ArLocalUtils.getNetworkInfo().catch((e) => e);
      expect(error).toBeInstanceOf(ArweaveError);
      expect(error.message).toBe("Failed to get network info: HTTP 500");
      expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
    });

    it("should throw ArweaveError when response is invalid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: "response" }),
      });

      const error = await ArLocalUtils.getNetworkInfo().catch((e) => e);
      expect(error).toBeInstanceOf(ArweaveError);
      expect(error.message).toBe("Invalid network info response from ArLocal");
      expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
    });

    it("should use custom host and port", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNetworkInfo,
      });

      await ArLocalUtils.getNetworkInfo("127.0.0.1", 8080);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8080/info",
        expect.any(Object),
      );
    });
  });

  describe("mineTransactions", () => {
    it("should mine transactions successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await expect(ArLocalUtils.mineTransactions()).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1984/mine",
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should mine multiple blocks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await ArLocalUtils.mineTransactions(5);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:1984/mine",
        expect.any(Object),
      );
    });

    it("should throw ArweaveError for invalid blocks parameter", async () => {
      await expect(ArLocalUtils.mineTransactions(0)).rejects.toThrow(
        ArweaveError,
      );
      await expect(ArLocalUtils.mineTransactions(-1)).rejects.toThrow(
        ArweaveError,
      );
      await expect(ArLocalUtils.mineTransactions(1.5)).rejects.toThrow(
        ArweaveError,
      );
    });

    it("should throw ArweaveError when mining fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const error = await ArLocalUtils.mineTransactions().catch((e) => e);
      expect(error).toBeInstanceOf(ArweaveError);
      expect(error.message).toBe("Mining failed: HTTP 500");
      expect(error.code).toBe(ArweaveErrorCode.MINING_REQUIRED);
    });

    it("should throw ArweaveError when network error occurs", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(ArLocalUtils.mineTransactions()).rejects.toThrow(
        ArweaveError,
      );
      await expect(ArLocalUtils.mineTransactions()).rejects.toThrow(
        "Failed to mine transactions in ArLocal",
      );
    });

    it("should use custom host and port", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await ArLocalUtils.mineTransactions(1, "127.0.0.1", 8080);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8080/mine",
        expect.any(Object),
      );
    });
  });

  describe("mintTokens", () => {
    const validAddress = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG";
    const validAmount = "1000000000000"; // 1 AR in winston

    it("should mint tokens successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await expect(
        ArLocalUtils.mintTokens(validAddress, validAmount),
      ).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:1984/mint/${validAddress}/${validAmount}`,
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should throw ArweaveError for invalid address", async () => {
      await expect(ArLocalUtils.mintTokens("", validAmount)).rejects.toThrow(
        ArweaveError,
      );
      await expect(
        ArLocalUtils.mintTokens("invalid", validAmount),
      ).rejects.toThrow(ArweaveError);
      await expect(
        ArLocalUtils.mintTokens("too-short", validAmount),
      ).rejects.toThrow(ArweaveError);
    });

    it("should throw ArweaveError for invalid amount", async () => {
      await expect(ArLocalUtils.mintTokens(validAddress, "")).rejects.toThrow(
        ArweaveError,
      );
      await expect(
        ArLocalUtils.mintTokens(validAddress, "invalid"),
      ).rejects.toThrow(ArweaveError);
      await expect(
        ArLocalUtils.mintTokens(validAddress, "-100"),
      ).rejects.toThrow(ArweaveError);
      await expect(
        ArLocalUtils.mintTokens(validAddress, "1.5"),
      ).rejects.toThrow(ArweaveError);
    });

    it("should throw ArweaveError when minting fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const error = await ArLocalUtils.mintTokens(
        validAddress,
        validAmount,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(ArweaveError);
      expect(error.message).toBe("Token minting failed: HTTP 500");
      expect(error.code).toBe(ArweaveErrorCode.MINT_FAILED);
    });

    it("should throw ArweaveError when network error occurs", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        ArLocalUtils.mintTokens(validAddress, validAmount),
      ).rejects.toThrow(ArweaveError);
      await expect(
        ArLocalUtils.mintTokens(validAddress, validAmount),
      ).rejects.toThrow("Failed to mint tokens in ArLocal");
    });

    it("should use custom host and port", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await ArLocalUtils.mintTokens(
        validAddress,
        validAmount,
        "127.0.0.1",
        8080,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `http://127.0.0.1:8080/mint/${validAddress}/${validAmount}`,
        expect.any(Object),
      );
    });

    it("should trim whitespace from address and amount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await ArLocalUtils.mintTokens(
        `  ${validAddress}  `,
        `  ${validAmount}  `,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:1984/mint/${validAddress}/${validAmount}`,
        expect.any(Object),
      );
    });
  });

  describe("getArLocalConfig", () => {
    const mockNetworkInfo: ArLocalNetworkInfo = {
      network: "arlocal",
      version: 5,
      release: 55,
      queue_length: 2,
      peers: 0,
      height: 100,
      current: "test-block-hash",
      blocks: 100,
      node_state_latency: 0,
    };

    it("should return non-ArLocal config for mainnet", async () => {
      const config: ArweaveConfig = {
        gatewayHost: "arweave.net",
        protocol: "https",
        port: 443,
        timeout: 20000,
        logging: false,
      };

      const result = await ArLocalUtils.getArLocalConfig(config);
      expect(result).toEqual({
        isArLocal: false,
        miningRequired: false,
      });
    });

    it("should return ArLocal config with network info when running", async () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "http",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNetworkInfo,
      });

      const result = await ArLocalUtils.getArLocalConfig(config);
      expect(result).toEqual({
        isArLocal: true,
        networkInfo: mockNetworkInfo,
        miningRequired: true, // queue_length > 0
      });
    });

    it("should return ArLocal config without network info when not running", async () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "http",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await ArLocalUtils.getArLocalConfig(config);
      expect(result).toEqual({
        isArLocal: true,
        miningRequired: false,
      });
    });

    it("should set miningRequired to false when queue is empty", async () => {
      const config: ArweaveConfig = {
        gatewayHost: "localhost",
        protocol: "http",
        port: 1984,
        timeout: 20000,
        logging: false,
      };

      const emptyQueueNetworkInfo = { ...mockNetworkInfo, queue_length: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => emptyQueueNetworkInfo,
      });

      const result = await ArLocalUtils.getArLocalConfig(config);
      expect(result.miningRequired).toBe(false);
    });
  });

  describe("createStatusMessage", () => {
    it("should create mainnet status message", () => {
      const config: ArLocalConfig = {
        isArLocal: false,
        miningRequired: false,
      };

      const message = ArLocalUtils.createStatusMessage(config);
      expect(message).toBe("Connected to Arweave mainnet");
    });

    it("should create ArLocal not running message", () => {
      const config: ArLocalConfig = {
        isArLocal: true,
        miningRequired: false,
      };

      const message = ArLocalUtils.createStatusMessage(config);
      expect(message).toContain(
        "ArLocal configuration detected but server is not running",
      );
    });

    it("should create ArLocal running status message", () => {
      const networkInfo: ArLocalNetworkInfo = {
        network: "arlocal",
        version: 5,
        release: 55,
        queue_length: 2,
        peers: 0,
        height: 100,
        current: "test-block-hash",
        blocks: 100,
        node_state_latency: 0,
      };

      const config: ArLocalConfig = {
        isArLocal: true,
        networkInfo,
        miningRequired: true,
      };

      const message = ArLocalUtils.createStatusMessage(config);
      expect(message).toContain("Connected to ArLocal (arlocal)");
      expect(message).toContain("Height: 100");
      expect(message).toContain("Blocks: 100");
      expect(message).toContain("Queue: 2 pending transactions");
      expect(message).toContain("Mining required");
    });

    it("should create ArLocal running status message without mining required", () => {
      const networkInfo: ArLocalNetworkInfo = {
        network: "arlocal",
        version: 5,
        release: 55,
        queue_length: 0,
        peers: 0,
        height: 100,
        current: "test-block-hash",
        blocks: 100,
        node_state_latency: 0,
      };

      const config: ArLocalConfig = {
        isArLocal: true,
        networkInfo,
        miningRequired: false,
      };

      const message = ArLocalUtils.createStatusMessage(config);
      expect(message).toContain("Connected to ArLocal (arlocal)");
      expect(message).not.toContain("Mining required");
    });
  });

  describe("createMiningGuidance", () => {
    it("should create no mining required message", () => {
      const message = ArLocalUtils.createMiningGuidance(0);
      expect(message).toBe("No pending transactions. Mining not required.");
    });

    it("should create mining required message for single transaction", () => {
      const message = ArLocalUtils.createMiningGuidance(1);
      expect(message).toBe(
        "1 transaction(s) pending confirmation. Use the mine endpoint to confirm transactions.",
      );
    });

    it("should create mining required message for multiple transactions", () => {
      const message = ArLocalUtils.createMiningGuidance(5);
      expect(message).toBe(
        "5 transaction(s) pending confirmation. Use the mine endpoint to confirm transactions.",
      );
    });
  });
});
