import {
  ArweaveError,
  ArweaveErrorCode,
  ArweaveConfig,
} from "../types/arweave.types";

/**
 * Configuration validation result interface
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Validated configuration */
  config?: ArweaveConfig;
}

/**
 * ArLocal configuration validation result
 */
export interface ArLocalValidationResult {
  /** Whether ArLocal configuration is detected */
  isArLocal: boolean;
  /** Whether ArLocal configuration is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Configuration validation utilities for Arweave plugin
 */
export class ConfigValidator {
  private static readonly VALID_PROTOCOLS = ["http", "https"];
  private static readonly ARLOCAL_HOST_PATTERNS = ["localhost", "127.0.0.1"];
  private static readonly ARLOCAL_DEFAULT_PORT = 1984;
  private static readonly MAINNET_DEFAULT_PORTS = { http: 80, https: 443 };
  private static readonly MAINNET_GATEWAYS = [
    "arweave.net",
    "cu.ardrive.io",
    "arweave.dev",
    "g8way.io",
  ];

  /**
   * Validate Arweave configuration
   * @param runtime - Runtime object with settings
   * @returns ConfigValidationResult - Validation result
   */
  static validateArweaveConfig(runtime: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get raw configuration values for validation
      const rawGateway =
        runtime.getSetting("ARWEAVE_GATEWAY") ??
        runtime.getSetting("ARWEAVE_HOST");
      const rawProtocol = runtime.getSetting("ARWEAVE_PROTOCOL");
      const rawPort = runtime.getSetting("ARWEAVE_PORT");
      const walletKey = runtime.getSetting("ARWEAVE_WALLET_KEY");

      // Resolve configuration with proper precedence
      const resolved = this.resolveConfiguration(runtime);
      const { gatewayHost, protocol, port } = resolved;

      // Validate protocol
      if (rawProtocol && !this.VALID_PROTOCOLS.includes(rawProtocol)) {
        errors.push(
          `Invalid protocol '${rawProtocol}'. Must be 'http' or 'https'.`,
        );
      }

      // Validate port
      if (rawPort) {
        const parsedPort = parseInt(rawPort);
        if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
          errors.push(
            `Invalid port '${rawPort}'. Must be a number between 1 and 65535.`,
          );
        }
      }

      // Validate gateway host
      if (rawGateway !== undefined && rawGateway.trim().length === 0) {
        errors.push("Gateway host cannot be empty.");
      } else if (rawGateway && rawGateway.includes("://")) {
        errors.push(
          "Gateway host should not include protocol. Use ARWEAVE_PROTOCOL instead.",
        );
      }

      // Validate wallet key format if provided
      if (walletKey) {
        try {
          const parsedKey = JSON.parse(walletKey);
          if (!this.isValidWalletKey(parsedKey)) {
            errors.push(
              "Invalid wallet key format. Must be a valid JWK (JSON Web Key).",
            );
          }
        } catch (parseError) {
          errors.push("Invalid wallet key JSON format. Must be valid JSON.");
        }
      }

      // ArLocal-specific validation
      const arLocalValidation = this.validateArLocalConfig(
        gatewayHost,
        protocol,
        port,
      );
      if (arLocalValidation.isArLocal) {
        errors.push(...arLocalValidation.errors);
        warnings.push(...arLocalValidation.warnings);
      }

      // Mainnet-specific validation
      if (!arLocalValidation.isArLocal) {
        const mainnetValidation = this.validateMainnetConfig(
          gatewayHost,
          protocol,
          port,
        );
        warnings.push(...mainnetValidation.warnings);
      }

      // Create configuration object
      const config: ArweaveConfig = {
        gatewayHost,
        protocol,
        port,
        timeout: 20000,
        logging: false,
        walletKey,
      };

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: errors.length === 0 ? config : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate ArLocal-specific configuration
   * @param gatewayHost - Gateway host
   * @param protocol - Protocol
   * @param port - Port number
   * @returns ArLocalValidationResult - ArLocal validation result
   */
  static validateArLocalConfig(
    gatewayHost: string,
    protocol: string,
    port: number,
  ): ArLocalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const isArLocal = this.ARLOCAL_HOST_PATTERNS.includes(
      gatewayHost.toLowerCase(),
    );

    if (isArLocal) {
      // Validate ArLocal protocol
      if (protocol !== "http") {
        errors.push(
          "ArLocal requires HTTP protocol. Set ARWEAVE_PROTOCOL=http for ArLocal.",
        );
      }

      // Validate ArLocal port
      if (port !== this.ARLOCAL_DEFAULT_PORT) {
        warnings.push(
          `ArLocal typically runs on port ${this.ARLOCAL_DEFAULT_PORT}. Current port: ${port}. ` +
            "Ensure ArLocal is running on the specified port.",
        );
      }

      // Add ArLocal usage warnings
      warnings.push(
        "ArLocal configuration detected. Ensure ArLocal is running with: npx arlocal",
      );
      warnings.push(
        "ArLocal transactions require manual mining. Use: curl http://localhost:1984/mine",
      );
    }

    return {
      isArLocal,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate mainnet-specific configuration
   * @param gatewayHost - Gateway host
   * @param protocol - Protocol
   * @param port - Port number
   * @returns Validation warnings for mainnet configuration
   */
  private static validateMainnetConfig(
    gatewayHost: string,
    protocol: string,
    port: number,
  ): { warnings: string[] } {
    const warnings: string[] = [];

    // Check for known mainnet gateways
    const isKnownGateway = this.MAINNET_GATEWAYS.some((gateway) =>
      gatewayHost.toLowerCase().includes(gateway.toLowerCase()),
    );

    if (!isKnownGateway) {
      warnings.push(
        `Unknown gateway '${gatewayHost}'. Ensure this is a valid Arweave gateway.`,
      );
    }

    // Check protocol/port combinations
    const expectedPort =
      this.MAINNET_DEFAULT_PORTS[
        protocol as keyof typeof this.MAINNET_DEFAULT_PORTS
      ];
    if (expectedPort && port !== expectedPort) {
      warnings.push(
        `Unusual port ${port} for ${protocol.toUpperCase()} protocol. ` +
          `Expected port ${expectedPort} for mainnet.`,
      );
    }

    // HTTPS recommendation for mainnet
    if (protocol === "http" && isKnownGateway) {
      warnings.push(
        "Using HTTP for mainnet connection. HTTPS is recommended for security.",
      );
    }

    return { warnings };
  }

  /**
   * Validate wallet key structure
   * @param key - Parsed wallet key object
   * @returns boolean - true if valid JWK format
   */
  private static isValidWalletKey(key: any): boolean {
    const requiredFields = ["kty", "e", "n", "d", "p", "q", "dp", "dq", "qi"];

    if (!key || typeof key !== "object") {
      return false;
    }

    // Check all required fields are present and are strings
    for (const field of requiredFields) {
      if (!key[field] || typeof key[field] !== "string") {
        return false;
      }
    }

    // Check key type is RSA
    if (key.kty !== "RSA") {
      return false;
    }

    return true;
  }

  /**
   * Get configuration recommendations based on current settings
   * @param runtime - Runtime object with settings
   * @returns Array of configuration recommendations
   */
  static getConfigurationRecommendations(runtime: any): string[] {
    const recommendations: string[] = [];
    const validation = this.validateArweaveConfig(runtime);

    if (!validation.config) {
      recommendations.push("Fix configuration errors before proceeding.");
      return recommendations;
    }

    const { config } = validation;
    const isArLocal = this.ARLOCAL_HOST_PATTERNS.includes(
      config.gatewayHost.toLowerCase(),
    );

    if (isArLocal) {
      recommendations.push(
        "ArLocal Development Mode:",
        "• Start ArLocal: npx arlocal",
        "• Mine transactions: curl http://localhost:1984/mine",
        "• Mint test tokens: curl http://localhost:1984/mint/{address}/{amount}",
        "• All data is local and temporary",
      );
    } else {
      recommendations.push(
        "Arweave Mainnet Mode:",
        "• Transactions require real AR tokens",
        "• Transactions are permanent and immutable",
        "• Consider using ArLocal for development and testing",
      );
    }

    if (!config.walletKey) {
      recommendations.push(
        "No wallet configured:",
        "• Set ARWEAVE_WALLET_KEY for wallet operations",
        "• Generate a wallet using the createWallet action",
      );
    }

    return recommendations;
  }

  /**
   * Create a configuration summary for logging
   * @param runtime - Runtime object with settings
   * @returns Configuration summary string
   */
  static createConfigurationSummary(runtime: any): string {
    const validation = this.validateArweaveConfig(runtime);

    if (!validation.config) {
      return `❌ Invalid Arweave configuration:\n${validation.errors.join("\n")}`;
    }

    const { config } = validation;
    const isArLocal = this.ARLOCAL_HOST_PATTERNS.includes(
      config.gatewayHost.toLowerCase(),
    );
    const mode = isArLocal ? "ArLocal Development" : "Arweave Mainnet";
    const endpoint = `${config.protocol}://${config.gatewayHost}:${config.port}`;
    const walletStatus = config.walletKey ? "Configured" : "Not configured";

    let summary = `🔧 Arweave Configuration Summary:\n`;
    summary += `   Mode: ${mode}\n`;
    summary += `   Endpoint: ${endpoint}\n`;
    summary += `   Wallet: ${walletStatus}`;

    if (validation.warnings.length > 0) {
      summary += `\n⚠️  Warnings:\n${validation.warnings.map((w) => `   • ${w}`).join("\n")}`;
    }

    return summary;
  }

  /**
   * Validate environment variable precedence and conflicts
   * @param runtime - Runtime object with settings
   * @returns Array of precedence warnings
   */
  static validateEnvironmentPrecedence(runtime: any): string[] {
    const warnings: string[] = [];

    // Check for conflicting gateway configurations
    const gateway = runtime.getSetting("ARWEAVE_GATEWAY");
    const host = runtime.getSetting("ARWEAVE_HOST"); // Legacy setting

    if (gateway && host && gateway !== host) {
      warnings.push(
        `Conflicting gateway settings: ARWEAVE_GATEWAY='${gateway}' and ARWEAVE_HOST='${host}'. ` +
          "ARWEAVE_GATEWAY takes precedence. Consider removing ARWEAVE_HOST.",
      );
    }

    // Check for protocol/port mismatches
    const protocol = runtime.getSetting("ARWEAVE_PROTOCOL");
    const port = runtime.getSetting("ARWEAVE_PORT");

    if (protocol === "https" && port === "80") {
      warnings.push(
        "Protocol is HTTPS but port is 80 (HTTP default). Consider using port 443 for HTTPS.",
      );
    } else if (protocol === "http" && port === "443") {
      warnings.push(
        "Protocol is HTTP but port is 443 (HTTPS default). Consider using port 80 for HTTP.",
      );
    }

    // Check for ArLocal configuration completeness
    if (gateway === "localhost" || gateway === "127.0.0.1") {
      if (protocol !== "http") {
        warnings.push(
          "ArLocal detected but protocol is not HTTP. Set ARWEAVE_PROTOCOL=http for ArLocal.",
        );
      }
      if (port && port !== "1984") {
        warnings.push(
          `ArLocal detected but port is ${port}. ArLocal typically runs on port 1984.`,
        );
      }
    }

    return warnings;
  }

  /**
   * Resolve configuration with proper precedence handling
   * Handles legacy environment variables and provides fallbacks
   * @param runtime - Runtime object with settings
   * @returns Resolved configuration values
   */
  static resolveConfiguration(runtime: any): {
    gatewayHost: string;
    protocol: string;
    port: number;
    walletKey?: string;
  } {
    // Gateway resolution with precedence: ARWEAVE_GATEWAY > ARWEAVE_HOST > default
    let gatewayHost = runtime.getSetting("ARWEAVE_GATEWAY");
    if (!gatewayHost || gatewayHost.trim().length === 0) {
      gatewayHost = runtime.getSetting("ARWEAVE_HOST"); // Legacy support
    }
    if (!gatewayHost || gatewayHost.trim().length === 0) {
      gatewayHost = "cu.ardrive.io"; // Default
    }

    // Remove protocol prefix if present
    gatewayHost = gatewayHost.replace(/^https?:\/\//, "");

    // Protocol resolution
    const protocol = runtime.getSetting("ARWEAVE_PROTOCOL") || "https";

    // Port resolution with protocol-aware defaults
    let port: number;
    const portSetting = runtime.getSetting("ARWEAVE_PORT");
    if (portSetting) {
      port = parseInt(portSetting);
      if (isNaN(port)) {
        port = protocol === "https" ? 443 : 80;
      }
    } else {
      // Smart defaults based on gateway and protocol
      if (gatewayHost === "localhost" || gatewayHost === "127.0.0.1") {
        port = 1984; // ArLocal default
      } else {
        port = protocol === "https" ? 443 : 80; // Mainnet defaults
      }
    }

    // Wallet key resolution
    const walletKey = runtime.getSetting("ARWEAVE_WALLET_KEY");

    return {
      gatewayHost,
      protocol,
      port,
      walletKey,
    };
  }
}
