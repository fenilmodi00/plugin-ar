import { describe, it, expect, beforeEach } from "bun:test";
import { ConfigValidator } from "../utils/config-validation";
import { ArweaveErrorCode } from "../types/arweave.types";

// Mock runtime for testing
class MockRuntime {
  private settings: Record<string, string> = {};

  setSetting(key: string, value: string): void {
    this.settings[key] = value;
  }

  getSetting(key: string): string | undefined {
    return this.settings[key];
  }

  clearSettings(): void {
    this.settings = {};
  }
}

describe("ConfigValidator", () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    mockRuntime = new MockRuntime();
  });

  describe("validateArweaveConfig", () => {
    it("should validate default mainnet configuration", () => {
      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config!.gatewayHost).toBe("cu.ardrive.io");
      expect(result.config!.protocol).toBe("https");
      expect(result.config!.port).toBe(443);
    });

    it("should validate ArLocal configuration", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "http");
      mockRuntime.setSetting("ARWEAVE_PORT", "1984");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(true);
      expect(result.config!.gatewayHost).toBe("localhost");
      expect(result.config!.protocol).toBe("http");
      expect(result.config!.port).toBe(1984);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("ArLocal"))).toBe(true);
    });

    it("should reject invalid protocol", () => {
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "ftp");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid protocol 'ftp'. Must be 'http' or 'https'.",
      );
    });

    it("should reject invalid port", () => {
      mockRuntime.setSetting("ARWEAVE_PORT", "abc");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid port"))).toBe(true);
    });

    it("should reject empty gateway host", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Gateway host cannot be empty.");
    });

    it("should reject gateway host with protocol", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "https://arweave.net");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Gateway host should not include protocol. Use ARWEAVE_PROTOCOL instead.",
      );
    });

    it("should validate wallet key format", () => {
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

      mockRuntime.setSetting("ARWEAVE_WALLET_KEY", validWalletKey);

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(true);
      expect(result.config!.walletKey).toBe(validWalletKey);
    });

    it("should reject invalid wallet key JSON", () => {
      mockRuntime.setSetting("ARWEAVE_WALLET_KEY", "invalid-json");

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid wallet key JSON format. Must be valid JSON.",
      );
    });

    it("should reject invalid wallet key structure", () => {
      mockRuntime.setSetting(
        "ARWEAVE_WALLET_KEY",
        JSON.stringify({ invalid: "key" }),
      );

      const result = ConfigValidator.validateArweaveConfig(mockRuntime);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Invalid wallet key format. Must be a valid JWK (JSON Web Key).",
      );
    });
  });

  describe("validateArLocalConfig", () => {
    it("should detect ArLocal configuration", () => {
      const result = ConfigValidator.validateArLocalConfig(
        "localhost",
        "http",
        1984,
      );

      expect(result.isArLocal).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect ArLocal with 127.0.0.1", () => {
      const result = ConfigValidator.validateArLocalConfig(
        "127.0.0.1",
        "http",
        1984,
      );

      expect(result.isArLocal).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it("should reject HTTPS for ArLocal", () => {
      const result = ConfigValidator.validateArLocalConfig(
        "localhost",
        "https",
        1984,
      );

      expect(result.isArLocal).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "ArLocal requires HTTP protocol. Set ARWEAVE_PROTOCOL=http for ArLocal.",
      );
    });

    it("should warn about non-standard ArLocal port", () => {
      const result = ConfigValidator.validateArLocalConfig(
        "localhost",
        "http",
        8080,
      );

      expect(result.isArLocal).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes("port 1984"))).toBe(true);
    });

    it("should not detect mainnet as ArLocal", () => {
      const result = ConfigValidator.validateArLocalConfig(
        "arweave.net",
        "https",
        443,
      );

      expect(result.isArLocal).toBe(false);
    });
  });

  describe("resolveConfiguration", () => {
    it("should use default values when no settings provided", () => {
      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.gatewayHost).toBe("cu.ardrive.io");
      expect(config.protocol).toBe("https");
      expect(config.port).toBe(443);
      expect(config.walletKey).toBeUndefined();
    });

    it("should prefer ARWEAVE_GATEWAY over ARWEAVE_HOST", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "gateway.example.com");
      mockRuntime.setSetting("ARWEAVE_HOST", "host.example.com");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.gatewayHost).toBe("gateway.example.com");
    });

    it("should fall back to ARWEAVE_HOST when ARWEAVE_GATEWAY not set", () => {
      mockRuntime.setSetting("ARWEAVE_HOST", "host.example.com");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.gatewayHost).toBe("host.example.com");
    });

    it("should remove protocol prefix from gateway host", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "https://arweave.net");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.gatewayHost).toBe("arweave.net");
    });

    it("should use ArLocal default port for localhost", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.port).toBe(1984);
    });

    it("should use protocol-appropriate default ports for mainnet", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "arweave.net");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "https");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.port).toBe(443);
    });

    it("should use explicit port when provided", () => {
      mockRuntime.setSetting("ARWEAVE_PORT", "8080");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.port).toBe(8080);
    });

    it("should handle invalid port gracefully", () => {
      mockRuntime.setSetting("ARWEAVE_PORT", "invalid");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "https");

      const config = ConfigValidator.resolveConfiguration(mockRuntime);

      expect(config.port).toBe(443); // Falls back to protocol default
    });
  });

  describe("validateEnvironmentPrecedence", () => {
    it("should warn about conflicting gateway settings", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "gateway.com");
      mockRuntime.setSetting("ARWEAVE_HOST", "host.com");

      const warnings =
        ConfigValidator.validateEnvironmentPrecedence(mockRuntime);

      expect(
        warnings.some((w) => w.includes("Conflicting gateway settings")),
      ).toBe(true);
    });

    it("should warn about protocol/port mismatches", () => {
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "https");
      mockRuntime.setSetting("ARWEAVE_PORT", "80");

      const warnings =
        ConfigValidator.validateEnvironmentPrecedence(mockRuntime);

      expect(
        warnings.some((w) => w.includes("Protocol is HTTPS but port is 80")),
      ).toBe(true);
    });

    it("should warn about incomplete ArLocal configuration", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "https");

      const warnings =
        ConfigValidator.validateEnvironmentPrecedence(mockRuntime);

      expect(
        warnings.some((w) =>
          w.includes("ArLocal detected but protocol is not HTTP"),
        ),
      ).toBe(true);
    });

    it("should not warn when configuration is consistent", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "arweave.net");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "https");
      mockRuntime.setSetting("ARWEAVE_PORT", "443");

      const warnings =
        ConfigValidator.validateEnvironmentPrecedence(mockRuntime);

      expect(warnings).toHaveLength(0);
    });
  });

  describe("getConfigurationRecommendations", () => {
    it("should provide ArLocal recommendations", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "http");
      mockRuntime.setSetting("ARWEAVE_PORT", "1984");

      const recommendations =
        ConfigValidator.getConfigurationRecommendations(mockRuntime);

      expect(
        recommendations.some((r) => r.includes("ArLocal Development Mode")),
      ).toBe(true);
      expect(recommendations.some((r) => r.includes("npx arlocal"))).toBe(true);
    });

    it("should provide mainnet recommendations", () => {
      const recommendations =
        ConfigValidator.getConfigurationRecommendations(mockRuntime);

      expect(
        recommendations.some((r) => r.includes("Arweave Mainnet Mode")),
      ).toBe(true);
      expect(recommendations.some((r) => r.includes("real AR tokens"))).toBe(
        true,
      );
    });

    it("should recommend wallet configuration", () => {
      const recommendations =
        ConfigValidator.getConfigurationRecommendations(mockRuntime);

      expect(
        recommendations.some((r) => r.includes("No wallet configured")),
      ).toBe(true);
      expect(
        recommendations.some((r) => r.includes("ARWEAVE_WALLET_KEY")),
      ).toBe(true);
    });

    it("should handle invalid configuration", () => {
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "invalid");

      const recommendations =
        ConfigValidator.getConfigurationRecommendations(mockRuntime);

      expect(recommendations).toContain(
        "Fix configuration errors before proceeding.",
      );
    });
  });

  describe("createConfigurationSummary", () => {
    it("should create ArLocal summary", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "http");
      mockRuntime.setSetting("ARWEAVE_PORT", "1984");

      const summary = ConfigValidator.createConfigurationSummary(mockRuntime);

      expect(summary).toContain("ArLocal Development");
      expect(summary).toContain("http://localhost:1984");
    });

    it("should create mainnet summary", () => {
      const summary = ConfigValidator.createConfigurationSummary(mockRuntime);

      expect(summary).toContain("Arweave Mainnet");
      expect(summary).toContain("https://cu.ardrive.io:443");
    });

    it("should include wallet status", () => {
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

      mockRuntime.setSetting("ARWEAVE_WALLET_KEY", validWalletKey);

      const summary = ConfigValidator.createConfigurationSummary(mockRuntime);

      expect(summary).toContain("Wallet: Configured");
    });

    it("should include warnings in summary", () => {
      mockRuntime.setSetting("ARWEAVE_GATEWAY", "localhost");
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "http");
      mockRuntime.setSetting("ARWEAVE_PORT", "8080");

      const summary = ConfigValidator.createConfigurationSummary(mockRuntime);

      expect(summary).toContain("Warnings:");
    });

    it("should handle invalid configuration", () => {
      mockRuntime.setSetting("ARWEAVE_PROTOCOL", "invalid");

      const summary = ConfigValidator.createConfigurationSummary(mockRuntime);

      expect(summary).toContain("❌ Invalid Arweave configuration");
    });
  });
});
