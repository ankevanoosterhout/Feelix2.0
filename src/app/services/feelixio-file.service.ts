import { Injectable } from '@angular/core';
import { FeelixioFile } from '../models/feelixio-file.model';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';


@Injectable()
export class FeelixioFileService {

  public static readonly  LOAD_FILE = 'loadFeelixioFile';
  public static readonly  LOAD_FILE_LOCATION = 'loadFeelixioFileLocation';
  public static readonly  FILES_LOCATION = 'ngx-webstorage|FeelixioFiles';

  public feelixioFileObservable = new Subject<FeelixioFile[]>();
  fs: any;

  feelixioFiles = [];

  constructor(private localSt: LocalStorageService) {

    localStorage.removeItem(FeelixioFileService.LOAD_FILE);
    localStorage.removeItem(FeelixioFileService.LOAD_FILE_LOCATION);

    // retrive files stored in local storage
    const storedFiles = this.localSt.retrieve('FeelixioFiles');
    if (storedFiles) {
      this.feelixioFiles = storedFiles;
      this.setAnyActive();
    }

    window.addEventListener( 'storage', event => {
      if (event.storageArea === localStorage) {
        if (event.key === FeelixioFileService.FILES_LOCATION) {
          const files: FeelixioFile[] = JSON.parse(localStorage.getItem(FeelixioFileService.FILES_LOCATION));
          this.feelixioFiles = files;
          this.feelixioFileObservable.next(this.feelixioFiles);
        }

        if (event.key.startsWith(FeelixioFileService.LOAD_FILE)) {
          const fileLocation: string = JSON.parse(localStorage.getItem(FeelixioFileService.LOAD_FILE_LOCATION));

          this.parseFile(localStorage.getItem(FeelixioFileService.LOAD_FILE)).then((file: FeelixioFile) => {
            try {
              file.path = fileLocation;
              this.feelixioFiles.push(file);
              this.setActive(file);
            } catch (error) {
            }
          });

          localStorage.removeItem(FeelixioFileService.LOAD_FILE);
          localStorage.removeItem(FeelixioFileService.LOAD_FILE_LOCATION);
        }
      }
    }, false );

  }

  parseFile(file: any) {
    return new Promise((resolve, reject) => {
      resolve(JSON.parse(file));
    });
  }

  newFile() {
    const newFile = new FeelixioFile(uuid(), 'untitled-' + (this.feelixioFiles.length + 1));
    this.feelixioFiles.push(newFile);
    this.setActive(newFile);
    this.store();
    return newFile;
  }

  add(file: FeelixioFile) {
    if (file !== null) {
      if (file.isActive) { file.isActive = false; }
      this.feelixioFiles.push(file);
      this.setActive(file);
      this.store();
    }
  }

  delete(file: FeelixioFile) {
    const index = this.feelixioFiles.indexOf(file, 0);
    if (index > -1) {
      this.feelixioFiles.splice(index, 1);
      if (this.feelixioFiles.length === 0) {
        this.newFile();
      }
    }
    if (file.isActive && this.feelixioFiles.length > 0) {
      this.feelixioFiles[this.feelixioFiles.length - 1].isActive = true;
    }
    this.store();
  }

  update(file: FeelixioFile, changes = true) {
    const originalFile = this.feelixioFiles.filter(f => f._id === file._id)[0];
    const index = this.feelixioFiles.indexOf(originalFile, 0);
    if (index > -1) {
      this.feelixioFiles[index] = file;
      this.feelixioFiles[index].date.changed = changes;
      this.store();
    }
  }

  getAll() {
    return this.feelixioFiles;
  }

  setActive(file: FeelixioFile) {
    // deactive current active file
    const currentActiveFile = this.feelixioFiles.filter(f => f.isActive)[0];
    if (currentActiveFile) {
      currentActiveFile.isActive = false;
    }
    // activate new file
    const newActiveFile = this.feelixioFiles.filter(f => f._id === file._id)[0];
    newActiveFile.isActive = true;
    this.store();
  }

  setAnyActive() {
    const currentActiveFile = this.feelixioFiles.filter(f => f.isActive)[0];
    if (!currentActiveFile) {
      const newActiveFile = this.feelixioFiles[this.feelixioFiles.length - 1];
      newActiveFile.isActive = true;
      this.store();
    }
  }

  getActiveFile() {
    return this.feelixioFiles.filter(f => f.isActive)[0];
  }

  store() {
    this.feelixioFileObservable.next(this.feelixioFiles);
    this.localSt.store('FeelixioFiles', this.feelixioFiles);
    // console.log('store');
  }

}
