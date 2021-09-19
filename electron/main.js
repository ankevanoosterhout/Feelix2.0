const electron = require('electron');
const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron')
const url = require("url");
const path = require("path");
const { dialog } = require('electron');
const fs = require('fs');
const jsonfile = require('jsonfile');
const { localStorage } = require('electron-browser-storage');
const { webContents } = require('electron');
const { shell } = require('electron');

const serialPort = require('./serial-communication.js');

let mainWindow, infoWindow = null, effectWindow = null, layerWindow = null, helpWindow = null;
let toolbars = [];
let mainMenu, displays;
let gridSnap = false, gridVisible = false, guidesLock = false;
let effectDetails = null;
let tmpWindow = null;
let activeWindow = null;


/****** start app *****/

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})






/****** create menus *****/


const mainMenuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New File',
        click() {
          createFileSettingWindow("file-settings");
        }
      },
      {
        label: 'Open File',
        accelerator: process.platform == 'darwin' ? 'Command+O' : 'Ctrl+O',
        click() {
          openFileDialog('feelix', 'loadFile', 'loadFileLocation');
        }
      },
      {
        label: 'Save',
        accelerator: process.platform == 'darwin' ? 'Command+S' : 'Ctrl+S',
        click() { mainWindow.webContents.send('saveActiveFile', true); }
      },
      {
        label: 'Save as',
        accelerator: process.platform == 'darwin' ? 'Command+Shift+S' : 'Ctrl+Shift+S',
        click() { mainWindow.webContents.send('saveActiveFile', false); }
      },
      {
        label: 'Settings',
        click() { createFileSettingWindow("file-update-settings"); }
      },
      {
        label: 'Example files',
        submenu: []
      },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click() {
          mainWindow.webContents.send('saveData');
          setTimeout(() => app.quit(), 100);
        }
      }
    ]
  },
  {
    label: 'Effect',
    submenu: [
      {
        label: 'New Effect',
        click() {
          createEffectSettingWindow("effect-settings");
        }
      },
      {
        label: 'Save to Effect Library',
        click() {
          mainWindow.webContents.send('saveEffectToLibrary');
        }
      },
      {
        label: 'Effect Settings',
        click() {
          mainWindow.webContents.send('saveData');
          createEffectSettingWindow("effect-update-settings");
        }
      },
      {
        label: 'Clear effect library',
        click() {
          mainWindow.webContents.send('clearCache');
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: process.platform === 'darwin' ? 'Command+Z' : 'Ctrl+Z',
        enabled: true,
        click() {
          mainWindow.webContents.send('undo');
        }
      },
      {
        label: 'Redo',
        accelerator: process.platform === 'darwin' ? 'Command+Shift+Z' : 'Ctrl+Shift+Z',
        enabled: true,
        click() {
          mainWindow.webContents.send('redo');
        }
      },
      {
        label: 'Transform',
        enabled: true,
        submenu: [
          {
            label: 'Move',
            accelerator: process.platform === 'darwin' ? 'Command+M' : 'Ctrl+M',
            click() {
              mainWindow.webContents.send('requestObjectSize', { type: 'move' });
              createTransform();
            }
          },
          {
            label: 'Reflect',
            accelerator: process.platform === 'darwin' ? 'Command+O' : 'Ctrl+O',
            submenu: [
              {
                label: 'Horizontal',
                click() {
                  mainWindow.webContents.send('reflect:horizontal');
                }
              },
              {
                label: 'Vertical',
                click() {
                  mainWindow.webContents.send('reflect:vertical');
                }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Show rulers',
        accelerator: process.platform == 'darwin' ? 'Command+R' : 'Ctrl+R',
        visible: false,
        click() {
          mainMenu.items[3].submenu.items[0].visible = false;
          mainMenu.items[3].submenu.items[1].visible = true;
          mainWindow.webContents.send('rulers:toggle', true);
        }
      },
      {
        label: 'Hide rulers',
        accelerator: process.platform == 'darwin' ? 'Command+Alt+R' : 'Ctrl+Alt+R',
        visible: true,
        click() {
          mainMenu.items[3].submenu.items[0].visible = true;
          mainMenu.items[3].submenu.items[1].visible = false;
          mainWindow.webContents.send('rulers:toggle', false);
        }
      },
      {
        label: 'Grid',
        submenu: [
          {
            label: 'Show grid',
            accelerator: process.platform == 'darwin' ? 'Command+G' : 'Ctrl+G',
            visible: true,
            click() {
              mainMenu.items[3].submenu.items[2].submenu.items[0].visible = false;
              mainMenu.items[3].submenu.items[2].submenu.items[1].visible = true;
              mainMenu.items[3].submenu.items[2].submenu.items[2].enabled = true;
              mainWindow.webContents.send('grid:toggle', true);
            }
          },
          {
            label: 'Hide grid',
            accelerator: process.platform == 'darwin' ? 'Command+Alt+G' : 'Ctrl+Alt+G',
            visible: false,
            click() {
              mainMenu.items[3].submenu.items[2].submenu.items[0].visible = true;
              mainMenu.items[3].submenu.items[2].submenu.items[1].visible = false;
              mainMenu.items[3].submenu.items[2].submenu.items[2].enabled = false;
              mainMenu.items[3].submenu.items[2].submenu.items[2].checked = false;
              mainWindow.webContents.send('grid:toggle', false);
            }
          },
          {
            label: 'Snap to grid',
            type: 'checkbox',
            checked: false,
            enabled: false,
            click() {
              if (mainMenu.items[3].submenu.items[2].submenu.items[2].enabled) {
                gridSnap = !gridSnap;
                mainMenu.items[3].submenu.items[2].submenu.items[2].checked = gridSnap;
                mainWindow.webContents.send('grid:snap', gridSnap);
              }
            }
          },
          {
            label: 'Grid size',
            click() {
              mainMenu.items[3].submenu.items[2].submenu.items[2].enabled = true;
              adjustGridSettings();
            }
          }
        ]
      },
      {
        label: 'Guides',
        submenu: [
          {
            label: 'Show guides',
            visible: false,
            click() {
              mainMenu.items[2].submenu.items[4].submenu.items[0].visible = false;
              mainMenu.items[2].submenu.items[4].submenu.items[1].visible = true;
              mainWindow.webContents.send('showGuides', true);
            }
          },
          {
            label: 'Hide guides',
            visible: true,
            click() {
              mainMenu.items[2].submenu.items[4].submenu.items[1].visible = false;
              mainMenu.items[2].submenu.items[4].submenu.items[0].visible = true;
              mainWindow.webContents.send('showGuides', false);
            }
          },
          {
            label: 'Lock guides',
            type: 'checkbox',
            checked: false,
            click() {
              guidesLock = !guidesLock;
              mainMenu.items[2].submenu.items[4].submenu.items[2].checked = guidesLock;
              mainWindow.webContents.send('lockGuides', guidesLock);
            }
          }
        ]
      },
    ]
  },
  {
    label: 'Hardware',
    submenu: [
      {
        label: 'Microcontroller settings',
        accelerator: process.platform == 'darwin' ? 'Command+M' : 'Ctrl+M',
        click() {
          createMotorSettingsWindow();
        }
      },
      {
        label: 'Reset microcontroller data',
        click() {
          serialPort.closeAllSerialPorts();
          mainWindow.webContents.send('resetCOMList');
        }
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Info',
        click() {
          if (infoWindow === null) {
            createInfoWindow();
          }
        }
      },
      {
        label: 'Online help Feelix',
        click() { shell.openExternal('https://docs.feelix.xyz/'); }
      },
      {
        label: 'SimpleFOC support',
        click() { shell.openExternal('https://simplefoc.com/'); }
      },
      {
        label: 'Open development tools',
        click() {  mainWindow.webContents.openDevTools(); }
      }
    ]
  }
];




function openFileDialog(extension, storage, location) {
  dialog.showOpenDialog({ filters: [{ name: 'All Files', extensions: [extension, 'json'] }] }, function (fileName) {
    if (fileName != null) {
      jsonfile.readFile(fileName[0], function (err, obj) {
        let loadFile = JSON.stringify(JSON.stringify(obj));
        let loadFileLocation = JSON.stringify(JSON.stringify(fileName[0]));

        // localStorage.removeItem('loadFile');
        // localStorage.removeItem('loadFileLocation');

        localStorage.setItem(storage, (loadFile.substring(1, loadFile.length - 1)));
        localStorage.setItem(location, (loadFileLocation.substring(1, loadFileLocation.length - 1)));
      });
    }
  });
}


/****** save file data *****/

ipcMain.on('saveFile', function (e, data) {
  if (data.overwrite) {
    const existingFile = fs.existsSync(data.file.path);
    if (!existingFile) {
      data.overwrite = false;
    }
  }
  saveFileWidthDialog(data.file, data.overwrite, data.newId, data.extension);
})


function saveFileWidthDialog(file, overwrite, newId, ext) {
  file.date.modified = new Date().getTime();
  file.date.changed = false;

  if (overwrite && file.overwrite) {
    saveChanges(file, 'update', ext);
  } else {
    file._id = newId;

    dialog.showSaveDialog(mainWindow, {
      title: 'Save as',
      defaultPath: '~/' + file.name + ext
    }, function (filePath) {
      if (filePath != null) {
        let fileName = filePath.replace(/^.*[\\\/]/, '');
        let extension = fileName.split(".");
        if (extension[extension.length - 1] === 'feelix') {
          fileName = fileName.slice(0, -5);
        }

        let posName = fileName.lastIndexOf(".");
        file.name = fileName.substr(0, posName < 0 ? fileName.length : posName);

        let posPath = filePath.lastIndexOf(".");
        file.path = filePath.substr(0, posPath < 0 ? filePath.length : posPath) + ext;
        // file.name = fileName;
        // file.path = filePath;
        saveChanges(file, 'add', ext);
      }
    });
  }
}


function saveChanges(file, type, extension = '.feelix') {
  fs.writeFile(file.path, JSON.stringify(file), 'utf8', function (err) {
    if (err) throw err;
    const data = {
      file: file,
      type: type
    };

    mainWindow.webContents.send('updatedFile', data);

  });
}


/****** create windows *****/

function createWindow() {
  displays = electron.screen.getAllDisplays();

  mainWindow = new BrowserWindow({
    backgroundColor: '#4a4a4a',
    fullscreenable: true,
    width: displays[0].bounds.width * 0.8,
    height: displays[0].bounds.height * 0.8,
    minHeight: 600,
    minWidth: 700,
    x: displays[0].bounds.width * 0.1,
    y: displays[0].bounds.height * 0.1,
    icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `../dist/feelix/index.html`),
      protocol: "file:",
      slashes: true
    })
  );

  mainWindow.on('close', function () {
    app.quit();
  })

  mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

  loadExampleFiles();

  Menu.setApplicationMenu(mainMenu);

  const promise = localStorage.getItem('ngx-webstorage|showInfo');

  promise.then(data => {
    if (data !== 'false') { createInfoWindow(); }
  });

  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-finish-load', function() {
    displayStatus('Ready', 'main');
  });

}


function drawTemporaryWindow(width, height, title, resizable, hash, details = null, parent = mainWindow) {

  if (tmpWindow !== null) {
    tmpWindow.close();
  }

  activeWindow = hash;

  tmpWindow = new BrowserWindow({
    show: false,
    width: width,
    height: height,
    title: title,
    backgroundColor: '#333',
    alwaysOnTop: true,
    frame: false,
    resizable: resizable,
    center: false,
    movable: true,
    parent: parent,
    icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  tmpWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `../dist/feelix/index.html`),
      protocol: "file:",
      slashes: true,
      hash: '/' + hash
    })
  )

  tmpWindow.once('ready-to-show', () => {
    tmpWindow.show()
    if (details !== null) {
      tmpWindow.webContents.send('details', details);
    }
    mainWindow.webContents.send('resetCursor');
  })

  // tmpWindow.webContents.openDevTools();

  tmpWindow.on('close', function () {
    tmpWindow = null
  })

}


function createInfoWindow() {
  infoWindow = new BrowserWindow({
    width: 650,
    height: 520,
    title: 'Info',
    titleBarStyle: 'hidden',
    backgroundColor: '#eee',
    resizable: false,
    movable: true,
    show: false,
    icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true
    }
  })

  infoWindow.setMenu(null);

  infoWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `../dist/feelix/index.html`),
      protocol: "file:",
      slashes: true,
      hash: '/info'
    })
  );

  infoWindow.once('ready-to-show', () => {
    infoWindow.show()
  });

  infoWindow.on('close', function () {
    infoWindow = null
  })
}



function createToolbar(hash, width, type) {

  if (toolbars.filter(t => t.type === type).length === 0) {

    let y = (displays[0].bounds.height * 0.1) + 350;
    if (type === 'motor') {
      y = (displays[0].bounds.height * 0.1) + 70;
    }

    let newToolbar = new BrowserWindow({
      width: width, // 321
      height: 46,
      x: (displays[0].bounds.width * 0.1) + 50,
      y: y,
      title: 'Toolbar',
      // titleBarStyle: 'hiddenInset',
      backgroundColor: '#3a3a3a',
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: false,
      fullscreenable: false,
      center: false,
      movable: true,
      show: false,
      parent: mainWindow,
      icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
      webPreferences: {
        nodeIntegration: true
      }
    })
    newToolbar.loadURL(
      url.format({
        pathname: path.join(__dirname, `../dist/feelix/index.html`),
        protocol: "file:",
        slashes: true,
        hash: hash
      })
    );

    newToolbar.once('ready-to-show', () => {
      newToolbar.show();
    })

    newToolbar.on('close', function () {
      const toolbarEl = toolbars.filter(t => t.type === type);
      if (toolbarEl) {
        const toolbarIndex = toolbars.indexOf(toolbarEl);
        toolbars.splice(toolbarIndex, 1);
      }
      newToolbar = null
    })

    toolbars.push({ toolbar: newToolbar, type: type });
  }

}


function createLayerWindow() {

  mainMenu.items[2].submenu.items[5].submenu.items[0].checked = true;

  layerWindow = new BrowserWindow({
    show: false,
    minHeight: 93,
    minWidth: 240,
    maxWidth: 240,
    width: 240,
    height: 93,
    x: displays[0].bounds.width * 0.9 - 325,
    y: (displays[0].bounds.height * 0.1) + 100,
    title: 'Layers',
    // titleBarStyle: 'hiddenInset',
    backgroundColor: '#3a3a3a',
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    center: false,
    movable: true,
    parent: mainWindow,
    icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  layerWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `../dist/feelix/index.html`),
      protocol: "file:",
      slashes: true,
      hash: '/layers'
    })
  )

  layerWindow.once('ready-to-show', () => {
    if (layerWindow) {
      layerWindow.show();
    }
  })

  layerWindow.on('close', function () {
    layerWindow = null
    mainMenu.items[2].submenu.items[5].submenu.items[0].checked = false
  })
}


function createEffectWindow() {

  mainMenu.items[2].submenu.items[5].submenu.items[1].checked = true

  effectWindow = new BrowserWindow({
    width: 240,
    height: 250,
    minWidth: 240,
    maxWidth: 240,
    minHeight: 120,
    x: displays[0].bounds.width * 0.9 - 325,
    y: (displays[0].bounds.height * 0.1) + 193,
    title: 'Effects',
    backgroundColor: '#3a3a3a',
    alwaysOnTop: true,
    frame: false,
    resizable: true,
    center: false,
    movable: true,
    show: false,
    parent: mainWindow,
    icon: path.join(__dirname, '../src/assets/icons/png/64x64.png'),
    webPreferences: {
      nodeIntegration: true,
      enableDragOut: true
    }
  })

  effectWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `../dist/feelix/index.html`),
      protocol: "file:",
      slashes: true,
      hash: '/effects'
    })
  );

  effectWindow.once('ready-to-show', () => {
    effectWindow.show()
  });

  // effectWindow.webContents.openDevTools();

  effectWindow.on('close', function () {
    effectWindow = null
    mainMenu.items[2].submenu.items[5].submenu.items[1].checked = false;
  })
}


function createLayerOptionWindow(layerDetails) {
  drawTemporaryWindow(380, 290, 'Layer Options', false, 'layer-option', layerDetails);
}

function createFileSettingWindow(filepath) {
  drawTemporaryWindow(380, 180, 'File Settings', false, filepath);
}

function createEffectSettingWindow(filepath) {
  drawTemporaryWindow(400, 370, 'Effect Settings', true, filepath);
}

function createMotorSettingsWindow() {
  drawTemporaryWindow(520, 450, 'Microcontroller settings', true, 'motor-settings');
}

function adjustGridSettings() {
  drawTemporaryWindow(400, 480, 'Grid size', false, 'grid-settings');
}

// function createZiGZaG() {
//   drawTemporaryWindow(400, 380, 'Zig Zag', false, 'zigzag');
// }

function createTransform() {
  drawTemporaryWindow(400, 270, 'Transform', false, 'transform');
}

function createConnectToCOM(comPorts) {
  // console.log("create window" + JSON.stringify(comPorts));
  mainWindow.webContents.send('updateAvailableCOMPorts', comPorts.serialPort);

  if (tmpWindow !== null && (activeWindow === 'motor-settings')) {
    tmpWindow.webContents.send('comports', comPorts);
  } else {
    createMotorSettingsWindow();
  }

}



function loadExampleFiles() {
  const exampleFileTabs = ['position-based', 'time-based'];

  for (let i = 0; i < 2; i++) {
    fs.readdir(path.join(__dirname, '../../example-files/' + exampleFileTabs[i]), (err, files) => {
      if (files) {
        files.forEach(file => {
          mainMenu.items[0].submenu.items[6].submenu.items[i].submenu.append(
            new MenuItem({
              label: file.split('.').slice(0, -1).join('.'),
              click() { openFile(file, exampleFileTabs[i]); }
            })
          );
        });
      }
    });
  }
}

function openFile(file, tab) {
  const src = path.join(__dirname, '../../example-files/' + tab + '/' + file);
  jsonfile.readFile(src, function (err, obj) {
    let loadFile = JSON.stringify(JSON.stringify(obj));
    let loadFileLocation = JSON.stringify(JSON.stringify(src));

    localStorage.setItem('loadFile', (loadFile.substring(1, loadFile.length - 1)));
    localStorage.setItem('loadFileLocation', (loadFileLocation.substring(1, loadFileLocation.length - 1)));
  });
}




/****** communication *****/

ipcMain.on('openExternalLink', function(e, url) {
  if (!['https:', 'http:'].includes(new URL(url).protocol)) return;
  shell.openExternal(url);
})

ipcMain.on('closeInfoWindow', function() {
  infoWindow.close();
})

ipcMain.on('attachToolbar', function () {
  const selectedToolbar = toolbars.filter(t => t.type === 'edit')[0];
  if (selectedToolbar) {
    selectedToolbar.toolbar.close();
    mainWindow.webContents.send('attachToolbar');
  }
})

ipcMain.on('attachToolbarMotor', function() {
  const selectedToolbar = toolbars.filter(t => t.type === 'motor')[0];
  if (selectedToolbar) {
    selectedToolbar.toolbar.close();
    mainWindow.webContents.send('attachMotorControlToolbar');
  }
})

ipcMain.on('showToolbar', function() {
  createToolbar('/toolbar', 321, 'edit');
  mainMenu.items[2].submenu.items[0].checked = true;
})

ipcMain.on('showToolbarMotor', function() {
  createToolbar('/motor-control-toolbar', 170, 'motor');
})

ipcMain.on('closeLayerWindow', function () {
  layerWindow.close();
})

ipcMain.on('closeAlignWindow', function () {
  alignWindow.close();
})

ipcMain.on('closeEffectWindow', function () {
  effectWindow.close();
})

ipcMain.on('closeTmpWindow', function () {
  tmpWindow.close();
})

ipcMain.on('effectSettings', function(e, filepath) {
  createEffectSettingWindow(filepath);
})

ipcMain.on('export', function (e, data) {
  mainWindow.webContents.send('showExport', data);
})

ipcMain.on('updateButtonState', function(e, data) {
  mainWindow.send('updateButtonState', data);
})

ipcMain.on('transform', function (e, data) {
  mainWindow.webContents.send('transform', data);
  if (!data.tmp) {
    tmpWindow.close();
  }
})

ipcMain.on('openLayerOptionWindow', function (e, details) {
  createLayerOptionWindow(details);
})

ipcMain.on('updateCursor', function (e, details) {
  mainWindow.webContents.send('updateCursor', details);
  mainWindow.focus();
})

ipcMain.on('selectCursor', function (e, acc) {
  const selectedToolbar = toolbars.filter(t => t.type === 'edit')[0];
  if (selectedToolbar) {
    selectedToolbar.toolbar.webContents.send('selectCursor', acc);
  }

})

ipcMain.on('updateToolbarSize', function (e, size) {
  const selectedToolbar = toolbars.filter(t => t.type === 'edit')[0];
  if (selectedToolbar) {
    if (size === 'large') {
      selectedToolbar.toolbar.setBounds({ width: 321 });
    } else { selectedToolbar.toolbar.setBounds({ width: 284 }); }
  }
});


ipcMain.on('increaseHeightCOMWindow', function (e, height) {
  tmpWindow.setSize(500, height);
})

ipcMain.on('updateHeightSettings', function (e, height) {
  tmpWindow.setSize(430, height);
});

ipcMain.on('listSerialPorts', function (e, data) {
  serialPort.listSerialPorts(createConnectToCOM);
})


ipcMain.on('addMicrocontroller', function (e, data) {
  console.log(data);
  serialPort.createConnection(data);
  mainWindow.webContents.send('updateStatus', { microcontroller: data, connected: false, error: false });
})

ipcMain.on('connectToSerialPort', function (e, data) {
  if (data.connect) {
    serialPort.connectToSerialPort(data.COM);
  } else {
    serialPort.closeSerialPort(data.COM);
  }
})



ipcMain.on('playEffect', function(e, data) {
  serialPort.playEffect(data.play, data.microcontroller);
})

ipcMain.on('motorSettings', function (e, data) {
  createMotorSettingsWindow();
});

ipcMain.on('changeViewSettings', function(e, data) {
  mainWindow.webContents.send('changeViewSettings');
});



ipcMain.on('saveLogFile', function(e, data) {
  const timeStamp = new Date().getTime();

  dialog.showSaveDialog(mainWindow, {
    title: 'Save data log',
    defaultPath: '~/log-' + timeStamp + '.txt'
  }, function (filePath) {
    if (filePath != null) {
      fs.writeFile(filePath, data, 'utf8', function (err) {
        if (err) throw err;
      });
    }
  });
})




ipcMain.on('updateMenu', function (e, item) {

  gridVisible = item.visible;
  gridSnap = item.snap;
  gridLock = item.lock;
  fileType = item.type;
  mainMenu.items[3].submenu.items[2].submenu.items[0].visible = !item.visible;
  mainMenu.items[3].submenu.items[2].submenu.items[1].visible = item.visible;
  mainMenu.items[3].submenu.items[2].submenu.items[2].checked = item.snap;
  mainMenu.items[3].submenu.items[2].submenu.items[2].enabled = item.visible === false ? false : true;
})



ipcMain.on('showMessage', (event, data) => {
  mainWindow.webContents.send('showMessage', data);
});

ipcMain.on('ondragstart', (event, data) => {
  mainWindow.webContents.send('addHapticEffect', data);
})

ipcMain.on('ondragstartLib', (event, data) => {
  mainWindow.webContents.send('addHapticLibEffect', data);
})

ipcMain.on('showHapticEffectDetails', (event, details) => {
  effectDetails = details;
  if (effectWindow === null) {
    createEffectWindow();
  } else {
    effectWindow.webContents.send('showEffectDetails', details);
  }
})

ipcMain.on('updateEffects', (event, effectList) => {
  if (effectWindow !== null) {
    effectWindow.webContents.send('updateEffects', effectList);
  }
});

ipcMain.on('getEffects', (event) => {
  mainWindow.webContents.send('getEffects');
});

ipcMain.on('updateLayerColors', (event, data) => {
  mainWindow.webContents.send('updateEffectColors', data);
});


ipcMain.on('update', (event, details) => {
  effectDetails = details;
  if (effectWindow === null) {
    createEffectWindow();
  } else {
    effectWindow.webContents.send('showEffectDetails', details);
  }
});

ipcMain.on('updateToolbar', (event, data) => {
  const selectedToolbar = toolbars.filter(t => t.type === 'edit')[0];
  if (selectedToolbar) {
    selectedToolbar.toolbar.webContents.send('updateToolbar', data);
  } else {
    mainWindow.webContents.send('updateToolbar', data);
  }
});


ipcMain.on('showTabEffectWindow', (event, tab) => {
  if (effectWindow !== null) {
    effectWindow.webContents.send('showTab', tab);
  }
});


ipcMain.on('repeatEffect', (event, data) => {
  mainWindow.webContents.send('repeatEffect', data);
});

ipcMain.on('mirrorEffect', (event, data) => {
  mainWindow.webContents.send('mirrorEffect', data);
});

ipcMain.on('changeLayerEffect', (event, data) => {
  mainWindow.webContents.send('changeLayerEffect', data);
});

ipcMain.on('saveToEffectLibrary', (event, data) => {
  mainWindow.webContents.send('saveToEffectLibrary', data);
});


ipcMain.on('updateMicrocontrollerDetails', (event, microcontrollerDetails) => {
  mainWindow.webContents.send('updateControllerDetails', microcontrollerDetails);
})


ipcMain.on('upload', (event, data) => {
  serialPort.uploadData(data);
});



ipcMain.on('moveToPos', (event, data) => {
  serialPort.moveToPos(data.microcontroller, data.pos);
});

ipcMain.on('getCalibrationValue', (event, data) => {
  serialPort.calibrateMotor(data.motor, data.port);
});

ipcMain.on('saveCalibrationValueToEEPROM', (event, data) => {
  serialPort.saveCalibrationValueToEEPROM(data.motor, data.microcontroller);
});

ipcMain.on('updateStartPos', (event, data) => {
  serialPort.updateStartPosition(data.microcontroller, data.position);
});

ipcMain.on('updateEffectData', (event, data) => {
  serialPort.updateEffectData(data.type, data.data, data.effectIndex, data.microcontroller); ///type, data, effectIndex, serialData
});

ipcMain.on('updateSleepmode', (event, data) => {
  serialPort.updateSleepmode(data.microcontroller, data.sleep);
});

ipcMain.on('updateExternalDevice', (event, data) => {
  serialPort.updateExternalDevice(data.COM, data.list);
});

ipcMain.on('openEffectInNewFile', (event, effect) => {
  mainWindow.send('openEffectInNewFile', effect);
  mainWindow.focus();
})

function updateSerialStatus(status) {
  if (status.microcontroller) {
    mainWindow.webContents.send('updateStatus', status);
  }

}

function updateSerialProgress(progress) {
  mainWindow.webContents.send('updateProgress', progress);
}

function updateAvailablePortList(list) {
  mainWindow.webContents.send('updateAvailableCOMPorts', list);
}

function displayStatus(data, page) {
  if (page === 'main') {
    mainWindow.webContents.send('statusMsg', data);
  }
}

function visualizaMotorData(data) {
  mainWindow.webContents.send('playData', data);
}


function updateZeroElectricAngle(data) {
  mainWindow.webContents.send('zero_electric_angle', data);

  if (tmpWindow !== null && (activeWindow === 'motor-settings')) {
    tmpWindow.webContents.send('zero_electric_angle', data);
  }

}

function uploadSuccesful(collection) {
  mainWindow.webContents.send('upload_succesful', collection);

}




exports.updateSerialStatus = updateSerialStatus;
exports.displayStatus = displayStatus;
exports.updateAvailablePortList = updateAvailablePortList;
exports.visualizaMotorData = visualizaMotorData;
exports.updateSerialProgress = updateSerialProgress;
exports.updateZeroElectricAngle = updateZeroElectricAngle;
exports.uploadSuccesful = uploadSuccesful;
