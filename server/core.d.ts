export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createApp(options: {
  storage: StorageAdapter;
  setupToken?: string;
  assetsFetch?: (request: Request) => Promise<Response>;
}): (request: Request) => Promise<Response>;

export function runScheduled(storage: StorageAdapter): Promise<number>;
