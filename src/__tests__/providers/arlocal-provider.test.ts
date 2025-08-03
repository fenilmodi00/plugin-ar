import { describe, it, expect, beforeEach, mock } from "bun:test";
import { arLocalProvider } from "../../providers/arlocal-provider";
import { ArLocalConfig, ArLocalNetworkInfo } from "../../utils/arlocal";
import type { Memory, State } from "@elizaos/core";

// Mock message and state
const mockMessage: Memory = {
  entityId: "test-entity",
  content: { text: "test message" },
  roomId: "test-room",
  userId: "test-user",
  agentId: "test-agent",
  createdAt: Date.now(),
};

const mockState: State = {
  entityId: "test-entity",
  roomId: "test-room",
  userId: "test-user",
  agentId: "test-agent",
};

// Mock network info that will be used across tests
const mockNetworkInfo: ArLocalNetworkInfo = {
  network: "arlocal",
  version: 1,
  release: 1,
  queue_length: 0,
  peers: 0,
  height: 100,
  current: "test-block-hash",
  blocks: 100,
  node_state_latency: 50,
};

describe("ArLocal Provider", () => {
  let mockArweaveService: any;
  let mockRuntime: any;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockArweaveService = {
      isArLocalMode: mock(() => false),
      getArLocalConfig: mock(() => undefined),
    };

    mockRuntime = {
      getService: mock(() => mockArweaveService),
    };
  });

  describe("Provider Configuration", () => {
    it("should have correct provider configuration", () => {
      expect(arLocalProvider.name).toBe("ARLOCAL_STATUS");
      expect(arLocalProvider.description).toBe(
        "Provides ArLocal network status and mining guidance for development context",
      );
      expect(arLocalProvider.dynamic).toBe(true);
      expect(typeof arLocalProvider.get).toBe("function");
    });
  });

  describe("Service Availability", () => {
    it("should handle missing Arweave service", async () => {
      mockRuntime.getService.mockReturnValue(null);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("Arweave service is not available.");
      expect(mockRuntime.getService).toHaveBeenCalledWith("arweave");
    });
  });

  describe("Mainnet Mode", () => {
    it("should handle mainnet mode correctly", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(false);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe(
        "Connected to Arweave mainnet. ArLocal features are not available.",
      );
      expect(result.values).toEqual({
        isArLocal: false,
        networkType: "mainnet",
      });
      expect(result.data).toEqual({
        isArLocal: false,
        networkType: "mainnet",
      });
      expect(mockArweaveService.isArLocalMode).toHaveBeenCalled();
    });
  });

  describe("ArLocal Mode - Server Not Running", () => {
    it("should handle ArLocal mode when server is not running", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue({
        isArLocal: true,
        networkInfo: undefined,
        miningRequired: false,
      });

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe(
        "ArLocal configuration detected but server is not running. Please start ArLocal on localhost:1984.",
      );
      expect(result.values).toEqual({
        isArLocal: true,
        isRunning: false,
        networkType: "arlocal",
      });
      expect(result.data).toEqual({
        isArLocal: true,
        isRunning: false,
        networkType: "arlocal",
      });
    });

    it("should handle null ArLocal config", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue(null);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe(
        "ArLocal configuration detected but server is not running. Please start ArLocal on localhost:1984.",
      );
      expect(result.values?.isArLocal).toBe(true);
      expect(result.values?.isRunning).toBe(false);
    });
  });

  describe("ArLocal Mode - Server Running", () => {
    const mockArLocalConfig: ArLocalConfig = {
      isArLocal: true,
      networkInfo: mockNetworkInfo,
      miningRequired: false,
    };

    it("should provide status when no mining is required", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue(mockArLocalConfig);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toContain("ArLocal Development Network Status:");
      expect(result.text).toContain("Network: arlocal");
      expect(result.text).toContain("Height: 100");
      expect(result.text).toContain("Blocks: 100");
      expect(result.text).toContain("Pending Transactions: 0");
      expect(result.text).toContain("Peers: 0");
      expect(result.text).toContain("Node State Latency: 50ms");
      expect(result.text).toContain("No pending transactions");
      expect(result.text).toContain("Mining not currently required");
      expect(result.text).toContain("Development Tips:");

      expect(result.values).toEqual({
        isArLocal: true,
        isRunning: true,
        networkType: "arlocal",
        networkName: "arlocal",
        height: 100,
        blocks: 100,
        pendingTransactions: 0,
        miningRequired: false,
        peers: 0,
        nodeStateLatency: 50,
      });

      expect(result.data?.isArLocal).toBe(true);
      expect(result.data?.isRunning).toBe(true);
      expect(result.data?.networkType).toBe("arlocal");
      expect(result.data?.networkInfo).toEqual(mockNetworkInfo);
      expect(result.data?.arLocalConfig).toEqual(mockArLocalConfig);
    });

    it("should provide mining guidance when transactions are pending", async () => {
      const mockNetworkInfoWithQueue: ArLocalNetworkInfo = {
        ...mockNetworkInfo,
        queue_length: 3,
      };

      const mockConfigWithMining: ArLocalConfig = {
        isArLocal: true,
        networkInfo: mockNetworkInfoWithQueue,
        miningRequired: true,
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue(mockConfigWithMining);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toContain("Pending Transactions: 3");
      expect(result.text).toContain("Mining Required:");
      expect(result.text).toContain(
        "3 transaction(s) are pending confirmation",
      );
      expect(result.text).toContain(
        "Transactions will remain pending until manually mined",
      );
      expect(result.text).toContain("Use the mine endpoint or mining action");
      expect(result.text).toContain(
        "Mining will process all pending transactions at once",
      );

      expect(result.values?.pendingTransactions).toBe(3);
      expect(result.values?.miningRequired).toBe(true);

      expect(result.data?.miningGuidance).toContain(
        "3 transaction(s) pending confirmation",
      );
    });

    it("should include development tips in all responses", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue(mockArLocalConfig);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toContain("Development Tips:");
      expect(result.text).toContain(
        "ArLocal runs on localhost:1984 with HTTP protocol",
      );
      expect(result.text).toContain(
        "All transactions require manual mining for confirmation",
      );
      expect(result.text).toContain(
        "Use token minting for testing transfers without real AR",
      );
      expect(result.text).toContain(
        "Switch to mainnet by updating ARWEAVE_GATEWAY environment variable",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      mockArweaveService.isArLocalMode.mockImplementation(() => {
        throw new Error("Service error");
      });

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("Failed to get ArLocal status: Service error");
      expect(result.values).toEqual({
        isArLocal: false,
        isRunning: false,
        error: "Service error",
      });
      expect(result.data).toEqual({
        error: "Service error",
      });
    });

    it("should handle unknown errors", async () => {
      mockArweaveService.isArLocalMode.mockImplementation(() => {
        throw "Unknown error type";
      });

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("Failed to get ArLocal status: Unknown error");
      expect(result.values?.error).toBe("Unknown error");
    });
  });

  describe("Integration with ArLocalUtils", () => {
    it("should use ArLocalUtils for mining guidance", async () => {
      const mockNetworkInfoWithQueue: ArLocalNetworkInfo = {
        network: "arlocal",
        version: 1,
        release: 1,
        queue_length: 2,
        peers: 0,
        height: 100,
        current: "test-block-hash",
        blocks: 100,
        node_state_latency: 50,
      };

      const mockConfigWithMining: ArLocalConfig = {
        isArLocal: true,
        networkInfo: mockNetworkInfoWithQueue,
        miningRequired: true,
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue(mockConfigWithMining);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      // Verify that ArLocalUtils methods are used in the data
      expect(result.data?.miningGuidance).toBeDefined();
      expect(result.data?.statusMessage).toBeDefined();
      expect(result.data?.miningGuidance).toContain(
        "2 transaction(s) pending confirmation",
      );
    });

    it("should handle zero pending transactions correctly", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue({
        isArLocal: true,
        networkInfo: mockNetworkInfo,
        miningRequired: false,
      });

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.data?.miningGuidance).toContain("No pending transactions");
      expect(result.data?.miningGuidance).toContain("Mining not required");
    });
  });

  describe("Data Structure Validation", () => {
    it("should return consistent data structure for mainnet", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(false);

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("values");
      expect(result).toHaveProperty("data");
      expect(result.values).toHaveProperty("isArLocal");
      expect(result.values).toHaveProperty("networkType");
      expect(result.data).toHaveProperty("isArLocal");
      expect(result.data).toHaveProperty("networkType");
    });

    it("should return consistent data structure for ArLocal", async () => {
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue({
        isArLocal: true,
        networkInfo: mockNetworkInfo,
        miningRequired: false,
      });

      const result = await arLocalProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("values");
      expect(result).toHaveProperty("data");

      // Check values structure
      expect(result.values).toHaveProperty("isArLocal");
      expect(result.values).toHaveProperty("isRunning");
      expect(result.values).toHaveProperty("networkType");
      expect(result.values).toHaveProperty("networkName");
      expect(result.values).toHaveProperty("height");
      expect(result.values).toHaveProperty("blocks");
      expect(result.values).toHaveProperty("pendingTransactions");
      expect(result.values).toHaveProperty("miningRequired");
      expect(result.values).toHaveProperty("peers");
      expect(result.values).toHaveProperty("nodeStateLatency");

      // Check data structure
      expect(result.data).toHaveProperty("isArLocal");
      expect(result.data).toHaveProperty("isRunning");
      expect(result.data).toHaveProperty("networkType");
      expect(result.data).toHaveProperty("networkInfo");
      expect(result.data).toHaveProperty("arLocalConfig");
      expect(result.data).toHaveProperty("miningGuidance");
      expect(result.data).toHaveProperty("statusMessage");
    });
  });
});
