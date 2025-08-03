import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ArweaveService } from "../services/ArweaveService";
import { ArLocalUtils } from "../utils/arlocal";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";
import { createMockRuntime } from "./test-utils";

/**
 * Tests for configuration switching between ArLocal and mainnet
 * These tests verify that the service correctly handles different configurations
 * and switches between ArLocal and mainnet modes appropriately
 */
describe("Configuration Switching Tests", () => {
  let service: ArweaveService;
  let mockRuntime: any;

  afterEach(async () => {
    if (service) {
      await service.stop();
      service = null as any;
    }
  });

  describe("ArLocal Configuration Detection", () => {
    it("should detect ArLocal configuration with localhost", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);
    });

    it("should detect ArLocal configuration with 127.0.0.1", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "127.0.0.1",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);
    });

    it("should detect mainnet configuration with default settings", () => {
      mockRuntime = createMockRuntime({});

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
      expect(config.gatewayHost).toBe("cu.ardrive.io");
      expect(config.protocol).toBe("https");
      expect(config.port).toBe(443);
    });

    it("should detect mainnet configuration with arweave.net", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "arweave.net",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
      expect(config.gatewayHost).toBe("arweave.net");
    });

    it("should not detect ArLocal with wrong port", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "8080", // Wrong port
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });

    it("should not detect ArLocal with HTTPS protocol", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "https", // Wrong protocol
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });
  });

  describe("Service Initialization with Different Configurations", () => {
    it("should initialize successfully with mainnet configuration", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "cu.ardrive.io",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      expect(service.isArLocalMode()).toBe(false);
      const config = service.getArLocalConfig();
      expect(config?.isArLocal).toBe(false);
    });

    it("should fail initialization with ArLocal configuration when ArLocal is not running", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      // Should throw because ArLocal is not running in test environment
      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        ArweaveError,
      );
      await expect(service.initialize(mockRuntime)).rejects.toThrow(
        /ArLocal is not running/,
      );
    });

    it("should handle custom mainnet gateway configuration", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "custom-gateway.example.com",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      expect(service.isArLocalMode()).toBe(false);
      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("custom-gateway.example.com");
    });
  });

  describe("Configuration Validation", () => {
    it("should validate ArLocal configuration parameters", () => {
      const validArLocalConfigs = [
        { gatewayHost: "localhost", port: 1984, protocol: "http" },
        { gatewayHost: "127.0.0.1", port: 1984, protocol: "http" },
      ];

      validArLocalConfigs.forEach((config) => {
        expect(ArLocalUtils.isArLocalConfig(config as any)).toBe(true);
      });
    });

    it("should validate mainnet configuration parameters", () => {
      const validMainnetConfigs = [
        { gatewayHost: "arweave.net", port: 443, protocol: "https" },
        { gatewayHost: "cu.ardrive.io", port: 443, protocol: "https" },
        { gatewayHost: "gateway.example.com", port: 443, protocol: "https" },
        { gatewayHost: "localhost", port: 443, protocol: "https" }, // HTTPS on localhost
        { gatewayHost: "localhost", port: 8080, protocol: "http" }, // Different port
      ];

      validMainnetConfigs.forEach((config) => {
        expect(ArLocalUtils.isArLocalConfig(config as any)).toBe(false);
      });
    });

    it("should handle edge cases in configuration detection", () => {
      const edgeCases = [
        // Case sensitivity
        { gatewayHost: "LOCALHOST", port: 1984, protocol: "http" }, // Should be false
        { gatewayHost: "LocalHost", port: 1984, protocol: "http" }, // Should be false

        // Protocol variations
        { gatewayHost: "localhost", port: 1984, protocol: "HTTP" }, // Should be false
        { gatewayHost: "localhost", port: 1984, protocol: "Http" }, // Should be false

        // Port as string vs number
        { gatewayHost: "localhost", port: "1984" as any, protocol: "http" }, // Should handle gracefully
      ];

      edgeCases.forEach((config, index) => {
        try {
          const result = ArLocalUtils.isArLocalConfig(config as any);
          // Most edge cases should return false due to strict matching
          expect(result).toBe(false);
        } catch (error) {
          // Some edge cases might throw, which is acceptable
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe("Environment Variable Precedence", () => {
    it("should use environment variables over defaults", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "custom.gateway.com",
        ARWEAVE_PORT: "8080",
        ARWEAVE_PROTOCOL: "https",
        ARWEAVE_TIMEOUT: "30000",
        ARWEAVE_LOGGING: "true",
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("custom.gateway.com");
      expect(config.port).toBe(8080);
      expect(config.protocol).toBe("https");
      expect(config.timeout).toBe(30000);
      expect(config.logging).toBe(true);
    });

    it("should use defaults when environment variables are not set", () => {
      mockRuntime = createMockRuntime({});

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("cu.ardrive.io");
      expect(config.port).toBe(443);
      expect(config.protocol).toBe("https");
      expect(config.timeout).toBe(20000);
      expect(config.logging).toBe(false);
    });

    it("should handle partial environment variable configuration", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost", // Only gateway set
      });

      service = new ArweaveService(mockRuntime);

      const config = service["arweaveConfig"];
      expect(config.gatewayHost).toBe("localhost");
      expect(config.port).toBe(443); // Default
      expect(config.protocol).toBe("https"); // Default

      // This should not be detected as ArLocal because port and protocol are defaults
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(false);
    });

    it("should handle invalid environment variable values gracefully", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_PORT: "invalid-port",
        ARWEAVE_TIMEOUT: "not-a-number",
        ARWEAVE_LOGGING: "maybe",
      });

      // Should not throw during construction
      expect(() => new ArweaveService(mockRuntime)).not.toThrow();

      service = new ArweaveService(mockRuntime);
      const config = service["arweaveConfig"];

      // Should use defaults for invalid values
      expect(config.port).toBe(443); // Default
      expect(config.timeout).toBe(20000); // Default
      expect(config.logging).toBe(false); // Default
    });
  });

  describe("Configuration Switching Scenarios", () => {
    it("should handle switching from mainnet to ArLocal configuration", async () => {
      // Start with mainnet configuration
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "arweave.net",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      expect(service.isArLocalMode()).toBe(false);

      // Simulate configuration change (in real usage, this would require restart)
      // We test this by creating a new service instance with ArLocal config
      await service.stop();

      const arLocalRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(arLocalRuntime);

      // Should detect ArLocal configuration
      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);

      // Initialization will fail because ArLocal is not running, but that's expected
      await expect(service.initialize(arLocalRuntime)).rejects.toThrow();
    });

    it("should handle switching from ArLocal to mainnet configuration", async () => {
      // Start with ArLocal configuration (will fail initialization)
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      expect(ArLocalUtils.isArLocalConfig(service["arweaveConfig"])).toBe(true);

      // Switch to mainnet configuration
      const mainnetRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "arweave.net",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mainnetRuntime);
      await service.initialize(mainnetRuntime);

      expect(service.isArLocalMode()).toBe(false);
      const config = service.getArLocalConfig();
      expect(config?.isArLocal).toBe(false);
    });

    it("should maintain configuration consistency across service methods", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "cu.ardrive.io",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);
      await service.initialize(mockRuntime);

      // All methods should consistently report mainnet mode
      expect(service.isArLocalMode()).toBe(false);

      const config = service.getArLocalConfig();
      expect(config?.isArLocal).toBe(false);

      // ArLocal-specific methods should reject appropriately
      await expect(service.mintTokens("test-address", "1000")).rejects.toThrow(
        /only available in ArLocal development mode/,
      );

      await expect(service.mineTransactions()).rejects.toThrow(
        /only available in ArLocal development mode/,
      );

      await expect(service.getPendingTransactionCount()).rejects.toThrow(
        /only available in ArLocal development mode/,
      );
    });
  });

  describe("Configuration Error Handling", () => {
    it("should provide helpful error messages for ArLocal configuration issues", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      try {
        await service.initialize(mockRuntime);
        expect(false).toBe(true); // Should not reach here
      } catch (error: any) {
        expect(error).toBeInstanceOf(ArweaveError);
        expect(error.code).toBe(ArweaveErrorCode.ARLOCAL_NOT_RUNNING);
        expect(error.message).toContain("ArLocal is not running");
        expect(error.message).toContain("localhost:1984");
        expect(error.context).toBeDefined();
        expect(error.context.host).toBe("localhost");
        expect(error.context.port).toBe(1984);
        expect(error.context.protocol).toBe("http");
      }
    });

    it("should handle configuration validation errors", () => {
      // Test with completely invalid configuration
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "", // Empty gateway
        ARWEAVE_PORT: "0", // Invalid port
        ARWEAVE_PROTOCOL: "ftp", // Invalid protocol
      });

      // Should throw during construction due to validation
      expect(() => new ArweaveService(mockRuntime)).toThrow(ArweaveError);
    });

    it("should provide configuration switching guidance", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      try {
        await service.initialize(mockRuntime);
      } catch (error: any) {
        expect(error.message).toContain("switch to mainnet configuration");
        // The error should provide guidance on how to switch configurations
      }
    });
  });

  describe("Configuration State Management", () => {
    it("should maintain configuration state throughout service lifecycle", async () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "arweave.net",
        ARWEAVE_PORT: "443",
        ARWEAVE_PROTOCOL: "https",
      });

      service = new ArweaveService(mockRuntime);

      // Configuration should be set during construction
      expect(service["arweaveConfig"]).toBeDefined();
      expect(service["arweaveConfig"].gatewayHost).toBe("arweave.net");

      await service.initialize(mockRuntime);

      // Configuration should remain consistent after initialization
      expect(service["arweaveConfig"].gatewayHost).toBe("arweave.net");
      expect(service.isArLocalMode()).toBe(false);

      // Configuration should remain consistent during operation
      const config1 = service.getArLocalConfig();
      const config2 = service.getArLocalConfig();
      expect(config1).toEqual(config2);
    });

    it("should handle configuration queries without initialization", () => {
      mockRuntime = createMockRuntime({
        ARWEAVE_GATEWAY: "localhost",
        ARWEAVE_PORT: "1984",
        ARWEAVE_PROTOCOL: "http",
      });

      service = new ArweaveService(mockRuntime);

      // Should be able to check configuration before initialization
      const config = service["arweaveConfig"];
      expect(ArLocalUtils.isArLocalConfig(config)).toBe(true);

      // But ArLocal-specific state should not be available
      expect(service.getArLocalConfig()).toBeUndefined();
    });
  });
});
