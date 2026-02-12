import storage from "~/main/utils/storage";
import type { PublicServerData, StoredServerData } from "./types";

const SERVERS_INDEX_KEY = "servers::remote";

/**
 * Get the storage key for a server namespace
 */
function serverKey(namespace: string): string {
  return `servers::remote::${namespace}`;
}

/**
 * Load the list of all stored server namespaces
 */
export function loadServerIndex(): string[] {
  return storage.get(SERVERS_INDEX_KEY, []) as string[];
}

/**
 * Load stored data for a specific server
 */
export function loadServer(namespace: string): StoredServerData | undefined {
  return storage.get(serverKey(namespace)) as StoredServerData | undefined;
}

/**
 * Load all stored servers as a map of namespace to server data
 */
export function loadAllServers(): Record<string, StoredServerData> {
  const index = loadServerIndex();
  const result: Record<string, StoredServerData> = {};

  for (const namespace of index) {
    const data = loadServer(namespace);
    if (data) {
      result[namespace] = data;
    }
  }

  return result;
}

/**
 * Save server data to storage
 * Merges with existing data and updates the index
 */
export function saveServer(namespace: string, data: Partial<StoredServerData>): void {
  const existing = loadServer(namespace) || {};
  storage.set(serverKey(namespace), { ...existing, ...data });

  const index = loadServerIndex();
  if (!index.includes(namespace)) {
    storage.set(SERVERS_INDEX_KEY, [...index, namespace]);
  }
}

/**
 * Remove a server from storage
 */
export function removeServer(namespace: string): void {
  storage.delete(serverKey(namespace));

  const index = loadServerIndex();
  storage.set(
    SERVERS_INDEX_KEY,
    index.filter((n) => n !== namespace),
  );
}

/**
 * Sanitize server data for IPC transmission
 * Removes sensitive OAuth fields that should never leave the main process
 */
export function sanitizeServerData(data: StoredServerData, connected: boolean): PublicServerData {
  const { tokens, clientInfo, updatedAt, ...publicData } = data;

  return {
    ...publicData,
    connected,
  };
}
