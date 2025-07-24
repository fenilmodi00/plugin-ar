import { Action, ActionResult } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const searchAction: Action = {
  name: 'SEARCH_ARWEAVE',
  description: 'Searches for transactions on the Arweave network using tags',

  validate: async (runtime: any, message: any) => {
    // Check if the message contains keywords related to searching
    const text = message.content.text.toLowerCase();
    return (text.includes('search') || text.includes('find') || text.includes('query')) && 
           text.includes('arweave') &&
           (text.includes('data') || text.includes('transaction') || text.includes('content'));
  },

  handler: async (runtime, message, state, options, callback): Promise<ActionResult> => {
    // Ensure callback is defined
    if (!callback) {
      return {
        success: false,
        text: 'Callback function is not available',
        error: new Error('Callback function is not available'),
        data: {
          actionName: 'SEARCH_ARWEAVE',
          errorMessage: 'Callback function is not available',
        },
      };
    }
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService<ArweaveService>('arweave');
      if (!arweaveService) {
        await callback({
          text: 'Arweave service is not available.',
          error: true,
        });

        return {
          success: false,
          text: 'Arweave service not available',
          error: new Error('Arweave service not available'),
          data: {
            actionName: 'SEARCH_ARWEAVE',
            errorMessage: 'Arweave service not available',
          },
        };
      }

      // Extract search criteria from message or state
      const text = message.content.text || '';
      const tags = state?.values?.tags || [];
      
      // If no tags provided, try to extract from message
      if (tags.length === 0) {
        // Look for tag patterns in the message (e.g., "tag:content-type=text/html")
        const tagMatches = text.matchAll(/tag:([a-zA-Z0-9_-]+)=([a-zA-Z0-9._-]+)/g);
        for (const match of tagMatches) {
          tags.push({
            name: match[1],
            values: [match[2]]
          });
        }
      }

      if (tags.length === 0) {
        await callback({
          text: 'Please provide search criteria using tags (e.g., "search arweave with tag:content-type=text/html").',
          error: true,
        });

        return {
          success: false,
          text: 'Search criteria not provided',
          error: new Error('Search criteria not provided'),
          data: {
            actionName: 'SEARCH_ARWEAVE',
            errorMessage: 'Search criteria not provided',
          },
        };
      }

      // Search transactions
      const transactionIds = await arweaveService.searchTransactions(tags);

      // Send response to user
      if (callback) {
        await callback({
          text: `Found ${transactionIds.length} transactions matching your search criteria.`,
          action: 'SEARCH_ARWEAVE',
        });
      }

      return {
        success: true,
        text: `Found ${transactionIds.length} transactions`,
        values: {
          transactionIds: transactionIds,
          searchTime: Date.now(),
          searchCriteria: tags,
        },
        data: {
          actionName: 'SEARCH_ARWEAVE',
          transactionIds: transactionIds,
          searchUrls: transactionIds.map(id => `https://arweave.net/${id}`),
          searchCriteria: tags,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await callback({
        text: `Failed to search Arweave: ${errorMessage}`,
        error: true,
      });

      return {
        success: false,
        text: 'Failed to search Arweave',
        error: error instanceof Error ? error : new Error(String(error)),
        data: {
          actionName: 'SEARCH_ARWEAVE',
          errorMessage: errorMessage,
        },
      };
    }
  },
};
