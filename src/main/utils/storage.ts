import { safeStorage } from "electron";
import Store from "electron-store";
import type { JsonValue } from "type-fest";

const store = new Store() as any;

export default {
  store: {
    set: (key: string, value: JsonValue) => {
      store.set(key, value);
    },
    get: (key: string, defaultValue?: JsonValue) => {
      return store.get(key, defaultValue);
    },
  },
  secureStore: {
    set: (key: string, value: string) => {
      if (!safeStorage.isEncryptionAvailable()) throw new Error("Encryption not available");

      const encrypted = safeStorage.encryptString(value);
      store.set(`secure::${key}`, encrypted.toString("base64"));
    },
    get: (key: string) => {
      if (!safeStorage.isEncryptionAvailable()) throw new Error("Encryption not available");

      const encrypted = store.get(`secure::${key}`);
      const buffer = Buffer.from(encrypted as string, "base64");
      return safeStorage.decryptString(buffer);
    },
  },
};
