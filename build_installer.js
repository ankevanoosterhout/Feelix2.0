// ./build_installer.js

// 1. Import Modules
const { MSICreator } = require('electron-wix-msi');
const path = require('path');

// 2. Define input and output directory.
// Important: the directories must be absolute, not relative e.g
// appDirectory: "C:\\Users\sdkca\Desktop\OurCodeWorld-win32-x64",
const APP_DIR = path.resolve(__dirname, './release-builds/feelix-win32-x64');
// outputDirectory: "C:\\Users\sdkca\Desktop\windows_installer",
const OUT_DIR = path.resolve(__dirname, './windows_installer');

// 3. Instantiate the MSICreator
const msiCreator = new MSICreator({
    appDirectory: APP_DIR,
    outputDirectory: OUT_DIR,

    // Configure metadata
    description: 'Feelix - A haptic authoring tool',
    exe: 'Feelix',
    name: 'Feelix',
    manufacturer: 'Anke',
    version: '2.0.0',
    arch: 'x64',

    // Configure installer User Interface
    ui: {
        chooseDirectory: true,

        images: {
          background: path.resolve(__dirname, './src/assets/images/installer-bg.png'),
          banner: path.resolve(__dirname, './src/assets/images/installer-banner.png'),
          infoIcon: path.resolve(__dirname, './src/assets/icons/png/32x32.png'),
          newIcon: path.resolve(__dirname, './src/assets/icons/png/16x16.png'),
          upIcon: path.resolve(__dirname, './src/assets/icons/png/16x16.png')
        }
    }
});

// 4. Create a .wxs template file
msiCreator.create().then(function(){

    // Step 5: Compile the template to a .msi file
    msiCreator.compile();
});
