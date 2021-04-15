const createDMG = require('electron-installer-dmg');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, './release-builds/Feelix-darwin-x64/Feelix.app');


createDMG({
    appPath: OUT_DIR,
    name: 'Feelix',
    title: 'Feelix',
    background: path.resolve(__dirname,'./src/assets/images/os-installer-bg.png'),
    icon: path.resolve(__dirname,'./src/assets/icons/mac/icon.icns'),
    overwrite: true
}, function (err) {
    console.log(err)
});
