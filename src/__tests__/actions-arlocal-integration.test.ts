import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  uploadAction,
  transferAction,
  retrieveAction,
  searchAction,
  createWalletAction,
} from "../actions";
import { ArweaveService } from "../services/ArweaveService";
import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";
import { createMockRuntime, setupTest } from "./test-utils";

/**
 * Tests for enhanced actions with ArLocal-specific guidance and functionality
 * These tests verify that actions provide appropriate ArLocal-specific behavior,
 * error messages, and user guidance
 */
describe("Actions ArLocal Integration Tests", () => {
  let mockArweaveService: any;
  let mockRuntime: any;

  beforeEach(() => {
    // Create comprehensive mock ArweaveService
    mockArweaveService = {
      isArLocalMode: mock(() => false),
      getArLocalConfig: mock(() => ({
        isArLocal: false,
        miningRequired: false,
      })),
      uploadData: mock(),
      retrieveData: mock(),
      transferTokens: mock(),
      searchTransactions: mock(),
      createWallet: mock(),
      mineTransactions: mock(),
      mintTokens: mock(),
      getTransactionStatus: mock(),
      getPendingTransactionCount: mock(),
      waitForTransactionConfirmation: mock(),
      checkArLocalAvailability: mock(),
    };

    mockRuntime = createMockRuntime({});
    mockRuntime.getService = mock(() => mockArweaveService);
  });

  describe("Upload Action ArLocal Integration", () => {
    it("should provide ArLocal-specific guidance after successful upload", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = { text: "upload test data to arweave" };

      // Mock ArLocal mode
      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.getArLocalConfig.mockReturnValue({
        isArLocal: true,
        miningRequired: true,
        networkInfo: { queue_length: 1 },
      });
      mockArweaveService.uploadData.mockResolvedValue("test-transaction-id");

      const result = await uploadAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      // Check that callback was called with ArLocal-specific guidance
      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("ArLocal");
      expect(callbackArgs.text).toContain("mining");
      expect(callbackArgs.text).toContain("pending");
    });

    it("should provide mainnet guidance for mainnet uploads", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = { text: "upload test data to arweave" };

      // Mock mainnet mode
      mockArweaveService.isArLocalMode.mockReturnValue(false);
      mockArweaveService.uploadData.mockResolvedValue("test-transaction-id");

      const result = await uploadAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      // Check that callback was called with mainnet guidance
      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("mainnet");
      expect(callbackArgs.text).not.toContain("mining");
    });

    it("should handle ArLocal not running error with helpful guidance", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = { text: "upload test data to arweave" };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.uploadData.mockRejectedValue(
        new ArweaveError(
          "ArLocal is not running",
          ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        ),
      );

      const result = await uploadAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(false);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("ArLocal is not running");
      expect(callbackArgs.text).toContain("start ArLocal");
      expect(callbackArgs.text).toContain("localhost:1984");
    });

    it("should extract data content from various message formats", async () => {
      const testCases = [
        {
          input: "upload 'hello world' to arweave",
          expectedData: "hello world",
        },
        {
          input: 'upload "test data" to arweave',
          expectedData: "test data",
        },
        {
          input: "upload this is my data to arweave",
          expectedData: "this is my data",
        },
        {
          input: 'store \'json data: {"key": "value"}\' on arweave',
          expectedData: 'json data: {"key": "value"}',
        },
      ];

      for (const testCase of testCases) {
        const { mockMessage, mockState, callbackFn } = setupTest();
        mockMessage.content = { text: testCase.input };

        mockArweaveService.uploadData.mockResolvedValue("test-tx-id");
        callbackFn.mockClear();

        await uploadAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          callbackFn,
        );

        expect(mockArweaveService.uploadData).toHaveBeenCalledWith(
          testCase.expectedData,
          "text/plain",
        );
      }
    });
  });

  describe("Transfer Action ArLocal Integration", () => {
    it("should provide token minting guidance for ArLocal transfers", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "transfer 1 AR to abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.transferTokens.mockResolvedValue(
        "test-transaction-id",
      );

      const result = await transferAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("ArLocal");
      expect(callbackArgs.text).toContain("test tokens");
      expect(callbackArgs.text).toContain("minting");
    });

    it("should handle insufficient balance with minting suggestion", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "transfer 1 AR to abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.transferTokens.mockRejectedValue(
        new ArweaveError(
          "Insufficient balance",
          ArweaveErrorCode.INSUFFICIENT_BALANCE,
        ),
      );

      const result = await transferAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(false);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("insufficient balance");
      expect(callbackArgs.text).toContain("mint test tokens");
    });

    it("should extract transfer parameters correctly", async () => {
      const testCases = [
        {
          input: "transfer 1 AR to abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
          expectedAmount: "1",
          expectedAddress: "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
        },
        {
          input:
            "send 0.5 AR tokens to abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
          expectedAmount: "0.5",
          expectedAddress: "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
        },
        {
          input:
            "transfer 10 AR to address abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
          expectedAmount: "10",
          expectedAddress: "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
        },
      ];

      for (const testCase of testCases) {
        const { mockMessage, mockState, callbackFn } = setupTest();
        mockMessage.content = { text: testCase.input };

        mockArweaveService.transferTokens.mockResolvedValue("test-tx-id");
        mockArweaveService.transferTokens.mockClear();

        await transferAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          callbackFn,
        );

        expect(mockArweaveService.transferTokens).toHaveBeenCalledWith(
          testCase.expectedAddress,
          testCase.expectedAmount,
        );
      }
    });
  });

  describe("Retrieve Action ArLocal Integration", () => {
    it("should provide mining guidance for pending transactions", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "retrieve data from abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.retrieveData.mockRejectedValue(
        new ArweaveError(
          "Transaction is pending",
          ArweaveErrorCode.MINING_REQUIRED,
        ),
      );

      const result = await retrieveAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(false);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("pending");
      expect(callbackArgs.text).toContain("mine");
      expect(callbackArgs.text).toContain("confirm");
    });

    it("should provide successful retrieval message for ArLocal", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "retrieve data from abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.retrieveData.mockResolvedValue("Retrieved test data");

      const result = await retrieveAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("Retrieved test data");
      expect(callbackArgs.text).toContain("ArLocal");
    });
  });

  describe("Search Action ArLocal Integration", () => {
    it("should provide ArLocal-specific search guidance", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "search for transactions with tag Content-Type text/plain",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.searchTransactions.mockResolvedValue([
        "tx1-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
        "tx2-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      ]);

      const result = await searchAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("ArLocal");
      expect(callbackArgs.text).toContain("2 transactions");
      expect(callbackArgs.text).toContain("pending confirmation");
    });

    it("should handle empty search results with ArLocal guidance", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = {
        text: "search for transactions with tag App MyApp",
      };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.searchTransactions.mockResolvedValue([]);

      const result = await searchAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("No transactions found");
      expect(callbackArgs.text).toContain("ArLocal");
      expect(callbackArgs.text).toContain("local development");
    });
  });

  // Note: Mine and Mint actions are not implemented yet
  // These would be ArLocal-specific actions for development

  describe("Create Wallet Action ArLocal Integration", () => {
    it("should provide ArLocal-specific guidance for new wallets", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = { text: "create new arweave wallet" };

      mockArweaveService.isArLocalMode.mockReturnValue(true);
      mockArweaveService.createWallet.mockResolvedValue({
        key: { kty: "RSA", n: "test-key" },
        address: "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      });

      const result = await createWalletAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("ArLocal");
      expect(callbackArgs.text).toContain("test tokens");
      expect(callbackArgs.text).toContain("minting");
      expect(callbackArgs.text).toContain("development");
    });

    it("should provide mainnet guidance for new wallets", async () => {
      const { mockMessage, mockState, callbackFn } = setupTest();
      mockMessage.content = { text: "create new arweave wallet" };

      mockArweaveService.isArLocalMode.mockReturnValue(false);
      mockArweaveService.createWallet.mockResolvedValue({
        key: { kty: "RSA", n: "test-key" },
        address: "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
      });

      const result = await createWalletAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        callbackFn,
      );

      expect(result.success).toBe(true);
      expect(callbackFn).toHaveBeenCalled();

      const callbackArgs = callbackFn.mock.calls[0][0];
      expect(callbackArgs.text).toContain("mainnet");
      expect(callbackArgs.text).toContain("real AR tokens");
      expect(callbackArgs.text).not.toContain("minting");
    });
  });

  describe("Action Validation", () => {
    it("should validate upload action messages correctly", async () => {
      const validMessages = [
        "upload data to arweave",
        "store information on arweave",
        "save 'hello world' to arweave",
        "upload file to arweave network",
      ];

      for (const text of validMessages) {
        const message = { content: { text } };
        const result = await uploadAction.validate(mockRuntime, message);
        expect(result).toBe(true);
      }
    });

    it("should validate transfer action messages correctly", async () => {
      const validMessages = [
        "transfer 1 AR to address",
        "send tokens to wallet",
        "transfer 0.5 AR tokens",
        "send AR to recipient",
      ];

      for (const text of validMessages) {
        const message = { content: { text } };
        const result = await transferAction.validate(mockRuntime, message);
        expect(result).toBe(true);
      }
    });

    // Note: Mine and Mint action validation tests would go here
    // when those actions are implemented

    it("should reject invalid action messages", async () => {
      const invalidMessages = [
        "hello world",
        "what is arweave",
        "delete transaction",
        "hack the blockchain",
      ];

      const actions = [
        uploadAction,
        transferAction,
        retrieveAction,
        searchAction,
      ];

      for (const action of actions) {
        for (const text of invalidMessages) {
          const message = { content: { text } };
          const result = await action.validate(mockRuntime, message);
          expect(result).toBe(false);
        }
      }
    });
  });

  describe("Error Handling Consistency", () => {
    it("should handle service unavailability consistently across actions", async () => {
      mockRuntime.getService = mock(() => null);

      const actions = [
        uploadAction,
        transferAction,
        retrieveAction,
        searchAction,
      ];

      for (const action of actions) {
        const { mockMessage, mockState, callbackFn } = setupTest();
        mockMessage.content = { text: "test action" };

        const result = await action.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          callbackFn,
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          "Arweave service is not available",
        );
      }
    });

    it("should handle callback unavailability consistently", async () => {
      const actions = [
        uploadAction,
        transferAction,
        retrieveAction,
        searchAction,
      ];

      for (const action of actions) {
        const { mockMessage, mockState } = setupTest();
        mockMessage.content = { text: "test action" };

        const result = await action.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          null, // No callback
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(
          "Callback function is not available",
        );
      }
    });

    it("should provide consistent error context across actions", async () => {
      const testError = new ArweaveError(
        "Test error",
        ArweaveErrorCode.ARLOCAL_NOT_RUNNING,
        undefined,
        { host: "localhost", port: 1984 },
      );

      mockArweaveService.uploadData.mockRejectedValue(testError);
      mockArweaveService.transferTokens.mockRejectedValue(testError);
      mockArweaveService.retrieveData.mockRejectedValue(testError);

      const actions = [
        { action: uploadAction, text: "upload data" },
        { action: transferAction, text: "transfer 1 AR to address" },
        { action: retrieveAction, text: "retrieve data from tx" },
      ];

      for (const { action, text } of actions) {
        const { mockMessage, mockState, callbackFn } = setupTest();
        mockMessage.content = { text };

        const result = await action.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          callbackFn,
        );

        expect(result.success).toBe(false);
        expect(callbackFn).toHaveBeenCalled();

        const callbackArgs = callbackFn.mock.calls[0][0];
        expect(callbackArgs.text).toContain("ArLocal is not running");
        expect(callbackArgs.text).toContain("localhost:1984");
      }
    });
  });
});
