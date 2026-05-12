const path = require("path");
const { app, BrowserWindow, session, shell } = require("electron");
const { createStaticServer } = require("./server");

const APP_PORT = Number(process.env.PORT || 4173);
let mainWindow = null;
let staticServer = null;

const allowPermissions = new Set(["media", "camera", "microphone"]);

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 940,
    minWidth: 1280,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#d7e4ee",
    title: "CAT Mock UI",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const startStaticServer = () =>
  new Promise((resolve, reject) => {
    try {
      staticServer = createStaticServer({
        buildDir: path.join(__dirname, "build"),
      });
      staticServer.once("error", reject);
      staticServer.listen(APP_PORT, "127.0.0.1", () => {
        staticServer.removeListener("error", reject);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowPermissions.has(permission));
  });

  await startStaticServer();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  if (process.platform !== "darwin") app.quit();
});
