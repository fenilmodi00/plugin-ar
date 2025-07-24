import { Provider } from '@elizaos/core';
import { ArweaveService } from '../services/ArweaveService';

export const arweaveStatusProvider: Provider = {
  name: 'ARWEAVE_STATUS',
  description: 'Provides current Arweave network status and block information',
  dynamic: true,

  get: async (runtime: any, message: any, state: any) => {
    try {
      // Get the Arweave service
      const arweaveService = runtime.getService('arweave') as ArweaveService;
      if (!arweaveService) {
        return {
          text: 'Arweave service is not available.',
        };
      }

      // Get network information
      const networkInfo = await arweaveService.arweave.network.getInfo();
      const currentBlock = await arweaveService.arweave.blocks.getCurrent();

      const text = `Arweave Network Status:
- Height: ${networkInfo.height}
- Current Block: ${currentBlock.indep_hash.substring(0, 10)}...
- Peers: ${networkInfo.peers}
- Uptime: ${networkInfo.uptime}%
- Last Retarget: ${new Date(currentBlock.last_retarget * 1000).toLocaleString()}`;

      return {
        text,
        values: {
          networkHeight: networkInfo.height,
          currentBlockHash: currentBlock.indep_hash,
          peers: networkInfo.peers,
          uptime: networkInfo.uptime,
          lastRetarget: currentBlock.last_retarget,
        },
        data: {
          networkInfo,
          currentBlock,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        text: `Failed to get Arweave network status: ${errorMessage}`,
      };
    }
  },
};
