
const { dialog } = require('electron');
const fs = require('fs');



function setFilePath(type, file, win) {

  let fileObj = JSON.parse(file);

  if(type === 'save' && fs.existsSync(fileObj.path + fileObj.name + '.json')) {
    saveChangesToFile(fileObj);
    win.webContents.send('updateFileData', JSON.stringify(fileObj));
  } else {
    dialog.showSaveDialog(win, {
      title: type,
      defaultPath: fileObj.path + fileObj.name + '.json'
    }, function(filePath) {
      // console.log(filePath);
      if(filePath != null) {

          const extension = filePath.split('.');
          fileObj.name = extension[0].replace(/^.*[\\\/]/, '');
          const fileNameLength = fileObj.name.length;
          fileObj.path = extension[0].slice(0, -fileNameLength);

          saveChangesToFile(fileObj);
          win.webContents.send('updateFileData', "test");
      } else {
        return false;
      }

    });
  }
}


function saveChangesToFile(file) {
  fs.writeFile(file.path + file.name + '.json', JSON.stringify(file), 'utf8', function (err) {
      if(err) throw err;
      // console.log(file.path + file.name + '.json saved');
  });
}


exports.setFilePath = setFilePath;
