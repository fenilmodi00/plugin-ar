import { Plugin } from "@elizaos/core";
import { ArweaveService } from "./services/ArweaveService";
import {
  createWalletAction,
  uploadAction,
  retrieveAction,
  transferAction,
  searchAction,
} from "./actions";
import {
  arweaveStatusProvider,
  walletInfoProvider,
  arLocalProvider,
} from "./providers";
import { transactionTrackerEvaluator } from "./evaluators";
import { ArLocalUtils } from "./utils/arlocal";
import { ConfigValidator } from "./utils/config-validation";

export const plugin: Plugin = {
  name: "arweave-plugin",
  description:
    "ElizaOS plugin for Arweave integration, enabling permanent data storage and token transfers",

  // Core components
  services: [ArweaveService],
  actions: [
    createWalletAction,
    uploadAction,
    retrieveAction,
    transferAction,
    searchAction,
  ],

  // Optional components
  providers: [arweaveStatusProvider, walletInfoProvider, arLocalProvider],
  evaluators: [transactionTrackerEvaluator],

  // Plugin initialization
  init: async (config, runtime) => {
    console.log("🔌 Initializing Arweave plugin...");

    try {
      // Validate configuration before initialization
      const configValidation = ConfigValidator.validateArweaveConfig(runtime);

      if (!configValidation.isValid) {
        console.error("❌ Arweave plugin configuration validation failed:");
        configValidation.errors.forEach((error) =>
          console.error(`   • ${error}`),
        );
        throw new Error(
          `Invalid Arweave configuration: ${configValidation.errors.join(", ")}`,
        );
      }

      // Log configuration warnings
      if (configValidation.warnings.length > 0) {
        console.warn("⚠️  Arweave plugin configuration warnings:");
        configValidation.warnings.forEach((warning) =>
          console.warn(`   • ${warning}`),
        );
      }

      // Check for environment variable precedence issues
      const precedenceWarnings =
        ConfigValidator.validateEnvironmentPrecedence(runtime);
      if (precedenceWarnings.length > 0) {
        console.warn("⚠️  Environment variable precedence warnings:");
        precedenceWarnings.forEach((warning) =>
          console.warn(`   • ${warning}`),
        );
      }

      // Use validated configuration for ArLocal detection
      const arweaveConfig = configValidation.config!;

      // Detect ArLocal configuration and log network mode
      const isArLocalConfig = ArLocalUtils.isArLocalConfig(arweaveConfig);

      if (isArLocalConfig) {
        console.log("🔧 ArLocal configuration detected");
        console.log(
          `   Gateway: ${arweaveConfig.protocol}://${arweaveConfig.gatewayHost}:${arweaveConfig.port}`,
        );

        try {
          // Check if ArLocal is actually running
          const isRunning = await ArLocalUtils.isArLocalRunning(
            arweaveConfig.gatewayHost,
            arweaveConfig.port,
          );

          if (isRunning) {
            // Get network information
            const networkInfo = await ArLocalUtils.getNetworkInfo(
              arweaveConfig.gatewayHost,
              arweaveConfig.port,
            );

            console.log("✅ ArLocal server is running and accessible");
            console.log(`   Network: ${networkInfo.network}`);
            console.log(`   Height: ${networkInfo.height}`);
            console.log(`   Pending transactions: ${networkInfo.queue_length}`);

            if (networkInfo.queue_length > 0) {
              console.log(
                "⚠️  Mining required: Transactions are pending confirmation",
              );
              console.log(
                "   Use mining actions or endpoints to confirm pending transactions",
              );
            }

            console.log("🚀 Plugin ready for ArLocal development mode");
          } else {
            console.warn(
              "⚠️  ArLocal configuration detected but server is not running",
            );
            console.warn(
              "   Please start ArLocal on localhost:1984 or switch to mainnet configuration",
            );
            console.warn(
              "   Plugin will continue initialization but ArLocal features will be unavailable",
            );
          }
        } catch (error) {
          console.warn(
            "⚠️  Could not verify ArLocal server status during initialization:",
          );
          console.warn(
            `   ${error instanceof Error ? error.message : String(error)}`,
          );
          console.warn(
            "   Plugin will continue initialization but ArLocal features may be limited",
          );
        }
      } else {
        console.log("🌐 Mainnet configuration detected");
        console.log(
          `   Gateway: ${arweaveConfig.protocol}://${arweaveConfig.gatewayHost}:${arweaveConfig.port}`,
        );
        console.log("🚀 Plugin ready for Arweave mainnet operations");
      }

      // Check wallet configuration
      const walletKey = runtime.getSetting("ARWEAVE_WALLET_KEY");
      if (walletKey) {
        try {
          // Validate wallet key format
          JSON.parse(walletKey);
          const networkMode = isArLocalConfig
            ? "ArLocal development"
            : "Arweave mainnet";
          console.log(
            `🔑 Wallet key configured and validated (${networkMode})`,
          );
        } catch (error) {
          console.error(
            "❌ Invalid ARWEAVE_WALLET_KEY format - must be valid JSON",
          );
          throw new Error("Invalid ARWEAVE_WALLET_KEY format");
        }
      } else {
        const networkMode = isArLocalConfig
          ? "ArLocal development"
          : "Arweave mainnet";
        console.log(`⚠️  No ARWEAVE_WALLET_KEY configured (${networkMode})`);
        console.log("   Wallet operations will require manual key input");
      }

      // Log configuration summary
      console.log(ConfigValidator.createConfigurationSummary(runtime));
      console.log("✅ Arweave plugin initialization completed successfully");
    } catch (error) {
      console.error("❌ Arweave plugin initialization failed:");
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  },

  // Configuration schema
  config: {
    ARWEAVE_WALLET_KEY: {
      type: "string",
      description: "Arweave wallet key for transaction signing",
      required: false,
    },
    ARWEAVE_GATEWAY: {
      type: "string",
      description:
        "Arweave gateway host (e.g., 'arweave.net' for mainnet, 'localhost' for ArLocal)",
      required: false,
      default: "arweave.net",
    },
    ARWEAVE_PORT: {
      type: "number",
      description:
        "Arweave gateway port (443 for mainnet HTTPS, 1984 for ArLocal)",
      required: false,
      default: 443,
    },
    ARWEAVE_PROTOCOL: {
      type: "string",
      description: "Protocol to use (https for mainnet, http for ArLocal)",
      required: false,
      default: "https",
    },
    ARWEAVE_TIMEOUT: {
      type: "number",
      description: "Request timeout in milliseconds",
      required: false,
      default: 20000,
    },
    ARWEAVE_LOGGING: {
      type: "boolean",
      description: "Enable Arweave client logging",
      required: false,
      default: false,
    },
  },
};

export default plugin;

// Re-export components for external use
export { ArweaveService } from "./services/ArweaveService";
export {
  createWalletAction,
  uploadAction,
  retrieveAction,
  transferAction,
  searchAction,
} from "./actions";
export {
  arweaveStatusProvider,
  walletInfoProvider,
  arLocalProvider,
} from "./providers";
export { transactionTrackerEvaluator } from "./evaluators";
