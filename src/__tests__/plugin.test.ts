import {
  describe,
  expect,
  it,
  spyOn,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "bun:test";
import { plugin, ArweaveService } from "../index";
import {
  ModelType,
  logger,
  type IAgentRuntime,
  type Service,
} from "@elizaos/core";
import dotenv from "dotenv";

// Setup environment variables
dotenv.config();

// Need to spy on logger for documentation
beforeAll(() => {
  spyOn(logger, "info");
  spyOn(logger, "error");
  spyOn(logger, "warn");
  spyOn(logger, "debug");
});

afterAll(() => {
  // No global restore needed in bun:test
});

// Create a real runtime for testing
function createRealRuntime(): Partial<IAgentRuntime> {
  const services = new Map<string, Service>();

  // Create a real service instance if needed
  const createService = (serviceType: string): Service | null => {
    if (serviceType === ArweaveService.serviceType) {
      return new ArweaveService({
        character: {
          name: "Test Character",
          system: "You are a helpful assistant for testing.",
        },
        getSetting: (key: string) => null,
      } as IAgentRuntime);
    }
    return null;
  };

  return {
    character: {
      name: "Test Character",
      system: "You are a helpful assistant for testing.",
      bio: "A test character for unit testing",
      plugins: [],
      settings: {},
    },
    getSetting: (key: string) => null,
    db: {
      get: async (key: string) => null,
      set: async (key: string, value: unknown) => true,
      delete: async (key: string) => true,
      getKeys: async (pattern: string) => [],
    },
    getService: <T extends Service>(serviceType: string): T | null => {
      // Log the service request for debugging
      logger.debug(`Requesting service: ${serviceType}`);

      // Get from cache or create new
      if (!services.has(serviceType)) {
        logger.debug(`Creating new service: ${serviceType}`);
        const service = createService(serviceType);
        if (service) {
          services.set(serviceType, service);
        }
      }

      return (services.get(serviceType) as T) || null;
    },
    registerService: async (ServiceClass: typeof Service): Promise<void> => {
      logger.debug(`Registering service: ${ServiceClass.serviceType}`);
      const runtime = {
        character: {
          name: "Test Character",
          system: "You are a helpful assistant for testing.",
          bio: "A test character for unit testing",
        },
      } as IAgentRuntime;
      const service = await ServiceClass.start(runtime);
      services.set(ServiceClass.serviceType, service);
    },
  };
}

describe("Plugin Configuration", () => {
  it("should have correct plugin metadata", () => {
    expect(plugin.name).toBe("arweave-plugin");
    expect(plugin.description).toBe(
      "ElizaOS plugin for Arweave integration, enabling permanent data storage and token transfers",
    );
    expect(plugin.config).toBeDefined();
  });

  it("should include all required configuration keys", () => {
    expect(plugin.config).toHaveProperty("ARWEAVE_WALLET_KEY");
    expect(plugin.config).toHaveProperty("ARWEAVE_GATEWAY");
    expect(plugin.config).toHaveProperty("ARWEAVE_PORT");
    expect(plugin.config).toHaveProperty("ARWEAVE_PROTOCOL");
    expect(plugin.config).toHaveProperty("ARWEAVE_TIMEOUT");
    expect(plugin.config).toHaveProperty("ARWEAVE_LOGGING");
  });

  it("should initialize properly with mainnet configuration", async () => {
    const originalEnv = {
      ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
      ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
      ARWEAVE_PORT: process.env.ARWEAVE_PORT,
      ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
    };

    try {
      // Set up mainnet configuration
      process.env.ARWEAVE_WALLET_KEY = JSON.stringify({
        kty: "RSA",
        n: "test-key",
        e: "AQAB",
        d: "test-private",
        p: "test-p",
        q: "test-q",
        dp: "test-dp",
        dq: "test-dq",
        qi: "test-qi",
      });
      process.env.ARWEAVE_GATEWAY = "arweave.net";
      process.env.ARWEAVE_PORT = "443";
      process.env.ARWEAVE_PROTOCOL = "https";

      // Create runtime with getSetting method that returns environment variables
      const runtime = {
        ...createRealRuntime(),
        getSetting: (key: string) => process.env[key] || null,
      };

      if (plugin.init) {
        await plugin.init(
          {
            ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
            ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
            ARWEAVE_PORT: process.env.ARWEAVE_PORT,
            ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
          },
          runtime as IAgentRuntime,
        );
        expect(true).toBe(true); // If we got here, init succeeded
      }
    } finally {
      // Restore original environment
      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    }
  });

  it("should initialize properly with ArLocal configuration", async () => {
    const originalEnv = {
      ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
      ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
      ARWEAVE_PORT: process.env.ARWEAVE_PORT,
      ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
    };

    try {
      // Set up ArLocal configuration
      process.env.ARWEAVE_WALLET_KEY = JSON.stringify({
        kty: "RSA",
        n: "test-key",
        e: "AQAB",
        d: "test-private",
        p: "test-p",
        q: "test-q",
        dp: "test-dp",
        dq: "test-dq",
        qi: "test-qi",
      });
      process.env.ARWEAVE_GATEWAY = "localhost";
      process.env.ARWEAVE_PORT = "1984";
      process.env.ARWEAVE_PROTOCOL = "http";

      // Create runtime with getSetting method that returns environment variables
      const runtime = {
        ...createRealRuntime(),
        getSetting: (key: string) => process.env[key] || null,
      };

      if (plugin.init) {
        // This should succeed even if ArLocal is not running (it will just warn)
        await plugin.init(
          {
            ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
            ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
            ARWEAVE_PORT: process.env.ARWEAVE_PORT,
            ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
          },
          runtime as IAgentRuntime,
        );
        expect(true).toBe(true); // If we got here, init succeeded
      }
    } finally {
      // Restore original environment
      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    }
  });

  it("should handle invalid wallet key gracefully", async () => {
    const originalEnv = {
      ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
      ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
      ARWEAVE_PORT: process.env.ARWEAVE_PORT,
      ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
    };

    try {
      // Set up configuration with invalid wallet key
      process.env.ARWEAVE_WALLET_KEY = "invalid-json";
      process.env.ARWEAVE_GATEWAY = "arweave.net";
      process.env.ARWEAVE_PORT = "443";
      process.env.ARWEAVE_PROTOCOL = "https";

      // Create runtime with getSetting method that returns environment variables
      const runtime = {
        ...createRealRuntime(),
        getSetting: (key: string) => process.env[key] || null,
      };

      if (plugin.init) {
        // This should throw an error due to invalid wallet key
        await expect(
          plugin.init(
            {
              ARWEAVE_WALLET_KEY: process.env.ARWEAVE_WALLET_KEY,
              ARWEAVE_GATEWAY: process.env.ARWEAVE_GATEWAY,
              ARWEAVE_PORT: process.env.ARWEAVE_PORT,
              ARWEAVE_PROTOCOL: process.env.ARWEAVE_PROTOCOL,
            },
            runtime as IAgentRuntime,
          ),
        ).rejects.toThrow();
      }
    } finally {
      // Restore original environment
      Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    }
  });

  it("should have a valid config with proper defaults", () => {
    expect(plugin.config).toBeDefined();
    if (plugin.config) {
      // Check if the config has all expected properties
      const expectedKeys = [
        "ARWEAVE_WALLET_KEY",
        "ARWEAVE_GATEWAY",
        "ARWEAVE_PORT",
        "ARWEAVE_PROTOCOL",
        "ARWEAVE_TIMEOUT",
        "ARWEAVE_LOGGING",
      ];
      expectedKeys.forEach((key) => {
        expect(Object.keys(plugin.config!)).toContain(key);
      });

      // Check default values
      expect(plugin.config.ARWEAVE_GATEWAY.default).toBe("arweave.net");
      expect(plugin.config.ARWEAVE_PORT.default).toBe(443);
      expect(plugin.config.ARWEAVE_PROTOCOL.default).toBe("https");
      expect(plugin.config.ARWEAVE_TIMEOUT.default).toBe(20000);
      expect(plugin.config.ARWEAVE_LOGGING.default).toBe(false);
    }
  });
});

describe("Plugin Components", () => {
  it("should have services defined", () => {
    expect(plugin.services).toBeDefined();
    expect(plugin.services).toHaveLength(1);
    expect(plugin.services[0]).toBe(ArweaveService);
  });

  it("should have actions defined", () => {
    expect(plugin.actions).toBeDefined();
    expect(plugin.actions.length).toBeGreaterThan(0);
  });

  it("should have providers defined", () => {
    expect(plugin.providers).toBeDefined();
    expect(plugin.providers.length).toBeGreaterThan(0);
  });

  it("should have evaluators defined", () => {
    expect(plugin.evaluators).toBeDefined();
    expect(plugin.evaluators.length).toBeGreaterThan(0);
  });
});

describe("ArweaveService", () => {
  it("should start the service", async () => {
    const runtime = createRealRuntime();
    const startResult = await ArweaveService.start(runtime as IAgentRuntime);

    expect(startResult).toBeDefined();
    expect(startResult.constructor.name).toBe("ArweaveService");

    // Test real functionality - check stop method is available
    expect(typeof startResult.stop).toBe("function");
  });

  it("should have correct service type", () => {
    expect(ArweaveService.serviceType).toBe("arweave");
  });

  it("should have capability description", async () => {
    const runtime = createRealRuntime();
    const service = await ArweaveService.start(runtime as IAgentRuntime);

    expect(service.capabilityDescription).toBeDefined();
    expect(typeof service.capabilityDescription).toBe("string");
    expect(service.capabilityDescription.length).toBeGreaterThan(0);
  });
});
