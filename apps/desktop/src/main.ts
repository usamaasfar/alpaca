import path from "node:path";
import { config } from "dotenv";
import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import Store from "electron-store";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";

// Load environment variables from .env file
config();

import "~/main/ipc";
import remote from "~/main/mcp/remote";

// Initialize electron-store for renderer process
Store.initRenderer();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Initialize auto-updater (only in production)
if (!app.isPackaged) {
  console.log("Skipping auto-updater in development mode");
} else {
  updateElectronApp({
    updateSource: { type: UpdateSourceType.ElectronPublicUpdateService, repo: "usamaasfar/alpaca" },
    updateInterval: "1 hour",
    notifyUser: true,
  });

  console.log("Auto-updater initialized");
}

if (process.platform === "win32") app.setAppUserModelId("com.alpaca.desktop");

// Set as default protocol client for OAuth callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("alpaca.computer", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("alpaca.computer");
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "../../icons/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Initialize MCP connections after window is ready
  mainWindow.webContents.once("did-finish-load", async () => {
    await remote.reconnectAll((status) => {
      mainWindow?.webContents.send("mcp-reconnect-status", status);
    });
  });
};

// Handle OAuth callback protocol
app.on("open-url", (event, url) => {
  event.preventDefault();
  console.log("OAuth callback received:", url);

  if (url.startsWith("alpaca.computer://oauth/callback")) {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");
    const state = urlObj.searchParams.get("state") || "";

    if (code && mainWindow) {
      console.log("Sending OAuth callback to renderer:", { code: code.substring(0, 10) + "...", state });

      // Send MCP OAuth callback to renderer (state is optional)
      mainWindow.webContents.send("mcp-oauth-callback", { code, state });

      // Focus the app window
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
