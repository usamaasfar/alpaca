import path from "node:path";
import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import Store from "electron-store";

import "~/main/ipc";
import remote from "~/main/mcp/remote";

// Initialize electron-store for renderer process
Store.initRenderer();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set as default protocol client for OAuth callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("integral.computer", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("integral.computer");
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: "hidden",
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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

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

  if (url.startsWith("integral.computer://oauth/callback")) {
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
