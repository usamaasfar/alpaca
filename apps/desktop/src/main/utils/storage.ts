import Store from "electron-store";
import type { JsonValue } from "type-fest";

const store = new Store() as any;

export default {
  set: (key: string, value: JsonValue) => {
    store.set(key, value);
  },
  get: (key: string, defaultValue?: JsonValue) => {
    return store.get(key, defaultValue);
  },
  delete: (key: string) => {
    store.delete(key);
  },
};
