/**
 * Arweave-specific types for the ElizaOS plugin
 */

// Arweave transaction types
export interface ArweaveTransaction {
  id: string;
  last_tx: string;
  owner: string;
  tags: Array<{
    name: string;
    value: string;
  }>;
  target: string;
  quantity: string;
  data: string;
  data_size: string;
  data_root: string;
  reward: string;
  signature: string;
}

// Arweave block types
export interface ArweaveBlock {
  nonce: string;
  previous_block: string;
  timestamp: number;
  last_retarget: number;
  diff: string;
  height: number;
  hash: string;
  indep_hash: string;
  txs: string[];
}

// Arweave network info
export interface ArweaveNetworkInfo {
  height: number;
  current: string;
  peers: number;
  queue_length: number;
  version: number;
  release: number;
  uptime: number;
  network: string;
  wallet: string;
}

// Arweave transaction status
export interface ArweaveTransactionStatus {
  status: number;
  confirmed: {
    block_height: number;
    block_indep_hash: string;
    number_of_confirmations: number;
  } | null;
}

// Arweave search query
export interface ArweaveSearchQuery {
  op: string;
  expr1: any;
  expr2: any;
}

// Arweave search result
export interface ArweaveSearchResult {
  data: {
    transactions: {
      edges: Array<{
        node: {
          id: string;
        };
      }>;
    };
  };
}

// Arweave wallet key (JWK format)
export interface ArweaveWalletKey {
  kty: string;
  n: string;
  e: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
}

// Arweave transaction upload status
export interface ArweaveUploader {
  isComplete: boolean;
  uploadedChunks: number;
  totalChunks: number;
  pctComplete: number;
  upload: () => Promise<void>;
}
