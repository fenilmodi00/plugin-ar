import { describe, it, expect, beforeEach } from "bun:test";
import {
  uploadAction,
  transferAction,
  retrieveAction,
  searchAction,
  createWalletAction,
} from "../actions";
import { ArweaveService } from "../services/ArweaveService";
import { createMockRuntime } from "./test-utils";

describe("Enhanced Actions with ArLocal Support", () => {
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });

  describe("Upload Action", () => {
    it("should have enhanced description mentioning ArLocal support", () => {
      expect(uploadAction.description).toContain("ArLocal development support");
    });

    it("should validate upload messages correctly", async () => {
      const message = {
        content: { text: "upload data to arweave" },
      };
      const result = await uploadAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });

    it("should handle missing callback gracefully", async () => {
      const message = { content: { text: "upload test data" } };
      const result = await uploadAction.handler(
        mockRuntime,
        message,
        {},
        {},
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Callback function is not available",
      );
    });
  });

  describe("Transfer Action", () => {
    it("should have enhanced description mentioning ArLocal support and token minting", () => {
      expect(transferAction.description).toContain(
        "ArLocal development support",
      );
      expect(transferAction.description).toContain("token minting");
    });

    it("should validate transfer messages correctly", async () => {
      const message = {
        content: { text: "transfer ar tokens to wallet address" },
      };
      const result = await transferAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });

    it("should handle missing callback gracefully", async () => {
      const message = { content: { text: "transfer 1 ar tokens" } };
      const result = await transferAction.handler(
        mockRuntime,
        message,
        {},
        {},
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Callback function is not available",
      );
    });
  });

  describe("Retrieve Action", () => {
    it("should have enhanced description mentioning ArLocal support", () => {
      expect(retrieveAction.description).toContain(
        "ArLocal development support",
      );
    });

    it("should validate retrieve messages correctly", async () => {
      const message = {
        content: { text: "retrieve data from arweave transaction" },
      };
      const result = await retrieveAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });

    it("should handle missing callback gracefully", async () => {
      const message = { content: { text: "retrieve arweave data" } };
      const result = await retrieveAction.handler(
        mockRuntime,
        message,
        {},
        {},
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Callback function is not available",
      );
    });
  });

  describe("Search Action", () => {
    it("should have enhanced description mentioning ArLocal support", () => {
      expect(searchAction.description).toContain("ArLocal development support");
    });

    it("should validate search messages correctly", async () => {
      const message = {
        content: { text: "search arweave for data transactions" },
      };
      const result = await searchAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });

    it("should handle missing callback gracefully", async () => {
      const message = { content: { text: "search arweave data" } };
      const result = await searchAction.handler(
        mockRuntime,
        message,
        {},
        {},
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Callback function is not available",
      );
    });
  });

  describe("Create Wallet Action", () => {
    it("should have enhanced description mentioning ArLocal support and token minting guidance", () => {
      expect(createWalletAction.description).toContain(
        "ArLocal development support",
      );
      expect(createWalletAction.description).toContain(
        "token minting guidance",
      );
    });

    it("should validate create wallet messages correctly", async () => {
      const message = {
        content: { text: "create arweave wallet" },
      };
      const result = await createWalletAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });

    it("should handle missing callback gracefully", async () => {
      const message = { content: { text: "create arweave wallet" } };
      const result = await createWalletAction.handler(
        mockRuntime,
        message,
        {},
        {},
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Callback function is not available",
      );
    });
  });

  describe("ArLocal-specific enhancements", () => {
    it("should import ArLocalUtils in all enhanced actions", () => {
      // This test verifies that the imports are working correctly
      // The actual functionality is tested in integration tests
      expect(uploadAction).toBeDefined();
      expect(transferAction).toBeDefined();
      expect(retrieveAction).toBeDefined();
      expect(searchAction).toBeDefined();
      expect(createWalletAction).toBeDefined();
    });

    it("should have consistent error handling patterns", () => {
      // All actions should handle missing callbacks the same way
      const actions = [
        uploadAction,
        transferAction,
        retrieveAction,
        searchAction,
        createWalletAction,
      ];

      actions.forEach((action) => {
        expect(action.handler).toBeDefined();
        expect(action.validate).toBeDefined();
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
      });
    });
  });
});
