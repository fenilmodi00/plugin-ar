import { Evaluator } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const transactionTrackerEvaluator: Evaluator = {
  name: 'ARWEAVE_TRANSACTION_TRACKER',
  description: 'Tracks Arweave transaction confirmations and updates status',
  examples: [],

  validate: async (runtime: any, message: any) => {
    // Run periodically to check transaction status
    const messageCount = await runtime.countMemories(message.roomId);
    // Check every 10 messages
    return messageCount % 10 === 0;
  },

  handler: async (runtime: any, message: any, state: any) => {
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService('arweave') as ArweaveService;
      if (!arweaveService) {
        return { success: false };
      }

      // Get any pending transactions from state
      const pendingTransactions = state.values?.pendingArweaveTransactions || [];
      
      if (pendingTransactions.length === 0) {
        return { success: true };
      }

      // Check status of each pending transaction
      const updatedTransactions = [];
      const confirmedTransactions = [];

      for (const tx of pendingTransactions) {
        try {
          const status = await arweaveService.getTransactionStatus(tx.id);
          
          if (status.status === 200 && status.confirmed && status.confirmed.number_of_confirmations > 0) {
            // Transaction is confirmed
            confirmedTransactions.push({
              id: tx.id,
              confirmations: status.confirmed.number_of_confirmations,
              block_height: status.confirmed.block_height,
              block_hash: status.confirmed.block_indep_hash,
            });
          } else {
            // Still pending
            updatedTransactions.push(tx);
          }
        } catch (error) {
          console.error(`Error checking transaction ${tx.id}:`, error);
          // Keep in pending list if we can't check
          updatedTransactions.push(tx);
        }
      }

      // If any transactions were confirmed, notify the user
      if (confirmedTransactions.length > 0) {
        const messageText = `Arweave transaction(s) confirmed:\n${confirmedTransactions.map(tx => 
          `- ${tx.id.substring(0, 10)}... (${tx.confirmations} confirmations)`
        ).join('\n')}`;
        
        await runtime.createMemory({
          content: { text: messageText },
          roomId: message.roomId,
        });
      }

      // Update state with remaining pending transactions
      if (updatedTransactions.length !== pendingTransactions.length) {
        // Update working memory
        runtime.updateState?.('pendingArweaveTransactions', updatedTransactions);
      }

      return { 
        success: true,
        values: {
          confirmedTransactions: confirmedTransactions.length,
          remainingPending: updatedTransactions.length,
        },
        data: {
          confirmedTransactions,
          updatedPendingTransactions: updatedTransactions,
        },
      };
    } catch (error) {
      console.error('Error in transaction tracker evaluator:', error);
      return { success: false };
    }
  },
};
