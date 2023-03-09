import { Component, OnInit, OnChanges, HostListener, Inject, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { NodeService } from '../../../services/node.service';
import { DataService } from '../../../services/data.service';
import { FileService } from '../../../services/file.service';
import { File } from '../../../models/file.model';
import { DOCUMENT } from '@angular/common';
import * as d3 from 'd3';
import { v4 as uuid } from 'uuid';
import { DrawingPlaneConfig } from 'src/app/models/drawing-plane-config.model';
import { DrawingService } from 'src/app/services/drawing.service';
import { DrawElementsService } from 'src/app/services/draw-elements.service';
import { BBoxService } from 'src/app/services/bbox.service';
import { HistoryService } from 'src/app/services/history.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from 'src/app/components/windows/dialog.component';
import { ExportDialogComponent } from 'src/app/components/windows/export-dialog.component';
import { EffectLibraryService } from 'src/app/services/effect-library.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { HardwareService } from 'src/app/services/hardware.service';
import { CloneService } from 'src/app/services/clone.service';
import { GridService } from 'src/app/services/grid.service';

@Component({
  selector: 'app-drawing-plane',
  template: `
    <div id="field-inset"></div>
  `,
  styleUrls: ['./drawing-plane.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DrawingPlaneComponent implements OnInit, OnChanges, AfterViewInit {

  public file: File;
  public config: DrawingPlaneConfig;



  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public nodeService: NodeService, private fileService: FileService, private dataService: DataService,
              private drawingService: DrawingService, private drawElements: DrawElementsService, private bboxService: BBoxService,
              private effectLibraryService: EffectLibraryService, public dialog: MatDialog, private cloneService: CloneService,
              private motorControlService: MotorControlService, private hardwareService: HardwareService, private historyService: HistoryService,
              private gridService: GridService) {

    this.config = this.drawingService.config;

    this.drawingService.drawFile.subscribe(res => {
      this.drawFileData();
    });

    this.drawingService.showMessage.subscribe(res => {
      this.showMessage(res.msg, res.type, res.action, res.d);
    });

    this.drawingService.align.subscribe(res => {
      this.alignSelectedItems(res);
    });

    this.historyService.reloadFileData.subscribe(res => {
      this.reloadFileData(res);
    });



    this.electronService.ipcRenderer.on('rulers:toggle', (event: Event, visible: boolean) => {
      if (!visible) {
        this.config.rulerWidth = 0;
        this.config.rulerVisible = false;
        this.file.activeEffect.grid.guidesVisible = false;
        this.fileService.updateEffect(this.file.activeEffect);
      } else {
        this.config.rulerWidth = 13;
        this.config.rulerVisible = true;
      }
      this.drawingService.redraw();

    });

    this.electronService.ipcRenderer.on('showGuides', (event: Event, visible: boolean) => {
      this.file.activeEffect.grid.guidesVisible = visible;
      if (visible && !this.config.rulerVisible) {
        this.config.rulerVisible = true;
        this.config.rulerWidth = 13;
      }
      this.fileService.updateEffect(this.file.activeEffect);
    });

    this.electronService.ipcRenderer.on('showMessage', (event: Event, data: any) => {
      this.showMessage(data, 'msg', 'message');
    });


    this.electronService.ipcRenderer.on('lockGuides', (event: Event, lock: boolean) => {
      this.file.activeEffect.grid.lockGuides = lock;
      this.fileService.updateEffect(this.file.activeEffect);
    });

    this.electronService.ipcRenderer.on('updateCursor', (event: Event, details: any) => {
      this.config.svg.select('.cursorConnection').remove();
      this.drawingService.changeCursor(details);
      this.config.svg.select('#selectionBox').remove();
    });


    this.electronService.ipcRenderer.on('resetCursor', (event: Event) => {
      this.document.body.style.cursor = 'default';
    });

    this.electronService.ipcRenderer.on('transform', (event: Event, data: any) => {
      // console.log(data.horizontal, data.vertical);
      this.nodeService.translateSelectedPaths(data);
      this.drawFileData();

      if (data.tmp === false) {
        this.fileService.updateActiveEffectData(this.file);
      }
    });



    this.electronService.ipcRenderer.on('grid:toggle', (event: Event, visible: boolean) => {
      this.file.activeEffect.grid.visible = visible;
      if (!visible) { this.file.activeEffect.grid.snap = false; }
      this.fileService.updateEffect(this.file.activeEffect);
    });

    this.electronService.ipcRenderer.on('grid:snap', (event: Event, snap: boolean) => {
      this.file.activeEffect.grid.snap = snap;
      this.fileService.updateEffect(this.file.activeEffect);
    });

    this.electronService.ipcRenderer.on('reflect:horizontal', (event: Event, snap: boolean) => {

      this.bboxService.mirrorPath('horizontal');
    });

    this.electronService.ipcRenderer.on('reflect:vertical', (event: Event, snap: boolean) => {

      this.bboxService.mirrorPath('vertical');
    });


    this.electronService.ipcRenderer.on('showExport', (event: Event, data: any) => {
      this.showExportWindow('', data.effect, data.microcontrollers);
    });


    this.electronService.ipcRenderer.on('saveToEffectLibrary', (event: Event, effect: any) => {
      effect.path = this.nodeService.getAll();
      this.effectLibraryService.addEffect(effect);
    });

    this.electronService.ipcRenderer.on('clearCache', (event: Event) => {
      this.showMessage('Are you sure you want to clear all effects from the library?', 'verification', 'clearCache');
    });

    this.electronService.ipcRenderer.on('resetCOMList', (event: Event) => {
      this.showMessage('Are you sure you want to clear all microcontroller data?', 'verification', 'resetCOMList');
    });

    this.electronService.ipcRenderer.on('showMessageConfirmation', (event: Event, data: any) => {
      this.showMessage(data.msg, data.type, data.action, data.d);
    });

    this.electronService.ipcRenderer.on('openEffectInNewFile', (event: Event, data: any) => {
      this.fileService.createFileFrom(data);
    });

    this.electronService.ipcRenderer.on('changeViewSettings', (event: Event, data: any) => {
      this.motorControlService.changeViewSettings();
    });

    this.electronService.ipcRenderer.on('changeViewTranslation', (event: Event, data: any) => {
      this.motorControlService.changeTranslationView();
    });

    this.electronService.ipcRenderer.on('saveData', () => {
      if (this.file.activeEffect) {
        this.fileService.updateActiveEffectData(this.file);
      }
    });


  }


  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
    this.file.configuration.rendered = false;
    this.setFilesInServices();

    if (this.file.activeEffect) {
      this.nodeService.loadFile(this.file.activeEffect.paths);
      const activeEffectInFile = this.file.configuration.colors.filter(c => c.type === this.file.activeEffect.type)[0];
      if (activeEffectInFile) {
        this.dataService.setColor(activeEffectInFile.hash[0], activeEffectInFile.hash.length > 1 ? activeEffectInFile.hash[1] : null);
      }
      this.nodeService.setGridLayer(this.file.activeEffect.grid);
      this.updateGridSettingsInMenu(this.file);
      this.electronService.ipcRenderer.send('updateToolbar', { type: this.drawingService.file.activeEffect.type });
    } else {
      this.nodeService.reset();
    }
    this.drawingService.updateResize(this.file.configuration.horizontalScreenDivision, 'horizontal');
    this.drawingService.updateResize(this.file.configuration.verticalScreenDivision, 'vertical');
    this.motorControlService.updateViewSettings(this.file);
    this.drawingService.redraw();

    this.fileService.fileObservable.subscribe(files => {
      const newFile = files.filter(f => f.isActive)[0];
      const differentFile = newFile._id !== this.file._id ? true : false;

      if (newFile.activeEffect) {
        if ((this.file.activeEffect && newFile.activeEffect.id !== this.file.activeEffect.id) || !this.file.activeEffect) {
          this.loadEffectData(newFile);
        }
        const activeEffectColor = newFile.configuration.colors.filter(c => c.type === newFile.activeEffect.type)[0];
        if (activeEffectColor) {
          this.dataService.setColor(activeEffectColor.hash[0], activeEffectColor.hash.length > 1 ? activeEffectColor.hash[1] : null);
        }
        this.nodeService.setGridLayer(newFile.activeEffect.grid);
      } else {
        this.nodeService.reset();
      }
      this.file = newFile;
      this.setFilesInServices();

      if (differentFile) {
        this.drawingService.updateResize(newFile.configuration.horizontalScreenDivision, 'horizontal');
        this.drawingService.updateResize(newFile.configuration.verticalScreenDivision, 'vertical');
        this.motorControlService.updateViewSettings(newFile);
      } else {
        setTimeout(() => {
          this.motorControlService.drawCollections(newFile.collections);
        }, 40);
      }
      this.drawingService.redraw();

    });
  }

  loadEffectData(newFile: File) {
    this.dataService.deselectAll();
    this.nodeService.loadFile(newFile.activeEffect.paths);
    this.updateGridSettingsInMenu(newFile);
  }


  updateGridSettingsInMenu(newFile: File) {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('updateMenu', {
        visible: newFile.activeEffect.grid.visible,
        snap: newFile.activeEffect.grid.snap,
        lock: newFile.activeEffect.grid.lockGuides
      });
    }
  }


  ngOnChanges(): void {
    this.drawingService.setEditBounds();
    this.drawingService.createPlane();
  }


  ngAfterViewInit(): void {
    if (this.file.activeEffect) {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('updateMenu', {
          visible: this.file.activeEffect.grid.visible,
          snap: this.file.activeEffect.grid.snap,
          lock: this.file.activeEffect.grid.lockGuides,
          type: this.file.activeEffect.type });
      }
    }
  }


  reloadFileData(data: any) {
    if (data && data.file) {
      this.file = this.cloneService.deepClone(data.file);
      if (data.file.activeEffect) {
        this.nodeService.loadFile(this.file.activeEffect.paths);
        this.fileService.updateEffect(this.file.activeEffect, false);
      }
      if (data.file.activeCollection) {
        this.fileService.updateCollection(this.file.activeCollection);
        if (data.file.activeCollectionEffect) {
          this.fileService.updateCollectionEffect(this.file.activeCollection, this.file.activeCollectionEffect);
        }
      }

    } else if (data) {
      // console.log(data.type, data.enable);
      // this.electronService.ipcRenderer.send(data.type, data.enable);
    }
  }


  alignSelectedItems(direction: string) {

    this.bboxService.align(direction);
  }



  setFilesInServices() {
    this.drawingService.file = this.file;
    this.drawElements.file = this.file;
    this.historyService.file = this.file;
    this.motorControlService.file = this.file;

  }


  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {

    if (!this.config.zoomable && this.nodeService.scale.scaleX) {
      // e.stopPropagation();
      // e.preventDefault();

      const coords = {
        x: this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left),
        y: this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top - this.config.margin.offsetTop)
      };

      if (this.config.rulerVisible && this.file.activeEffect) { this.drawingService.rulerFunctions(e); }

      if (this.config.newNode !== null && this.config.cursor.slug === 'pen') {
        if (Math.abs(this.config.newNode.pos.x - coords.x) > 0.5 || Math.abs(this.config.newNode.pos.y - coords.y) > 0.5) {
          const cpPoints = this.nodeService.calculateCP(this.config.newNode, coords);
          this.drawElements.drawControlPoints(cpPoints);
        }
        this.drawElements.drawPath(this.config.newNode.path, 'angle');

        this.drawElements.drawPath(this.config.newNode.path, 'pos');
        this.drawElements.drawNodes(this.config.newNode.path);
        this.config.svg.select('.cursorConnection').remove();
        this.drawingService.setCursor('url(./assets/icons/tools/cursor-drag.png), none');

      } else if (this.config.newNode !== null && this.config.cursor.slug === 'brush') {

        // if the path is longer then 1 and the x or y distance of the mouse is far enough, add a new node
        if (coords.y >= this.config.editBounds.yMin && coords.y <= this.config.editBounds.yMax &&
            coords.x >= this.config.editBounds.xMin && coords.x <= this.config.editBounds.xMax) {

          if (Math.abs(coords.x - this.config.newNode.pos.x) > 0.3 || Math.abs(coords.y - this.config.newNode.pos.y) > 0.3) {
            this.config.newNode = this.nodeService.newNode('node', coords, coords);
            if (this.config.newNode) { this.drawFileData(); }
          }
        }

      } else if (this.config.cursor.slug === 'pen' && this.nodeService.selectedNodes.length === 1 && this.config.newNode === null &&
                this.nodeService.checkIfNodeIsAtTheEndOfArrayFromID(this.nodeService.selectedNodes[0])) {
        this.drawElements.drawActiveCursorConn( { x: e.clientX - this.config.margin.left, y: e.clientY - this.config.margin.top - this.config.margin.offsetTop });

      } else if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel') {
        if (this.config.activeSelection && !this.config.newGuide) {
          this.drawElements.drawSelectionBox({ x: e.clientX - this.config.margin.left, y: e.clientY - this.config.margin.offsetTop });
        }
      }
    }

  }

  @HostListener('document:mousedown', ['$event'])
  onMousedown(e: MouseEvent) {
    if (!this.config.zoomable) {
      this.config.mouseDown = { x: e.clientX, y: e.clientY };

      if (e.clientY > this.config.margin.offsetTop + 65 && e.clientX > this.config.margin.left && e.clientY < window.innerHeight - 45 && this.nodeService.scale.scaleX !== null) {

        const coords = {
          x: this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left),
          y: this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top - this.config.margin.offsetTop)
        };

        if (this.config.newNode === null && (this.config.cursor.slug === 'pen' && this.config.cursor.selectedSubcursor !== 'add' ||
            this.config.cursor.slug === 'brush') && 0 !== null) {


          if (coords.x > this.config.editBounds.xMin &&
              (coords.y > this.config.editBounds.yMin && coords.y < this.config.editBounds.yMax)) {

            if (this.config.cursor.slug === 'pen') {

              this.electronService.ipcRenderer.send('disable', { type: 0, enabled: true });
            }

            this.config.newNode = this.nodeService.newNode('node', coords, coords);

            if (this.config.newNode && this.config.cursor.slug === 'pen') {
              const path = this.nodeService.getPath(this.nodeService.selectedPaths[0]);
              if (path.nodes.length > 1) {
                const bboxSize = this.bboxService.getBBox(path);
              }
              this.drawFileData();
              this.dataService.selectElement(this.config.newNode.id, coords.x, coords.y, null, null);
            }

          }
        } else if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel') {
          if (this.config.mouseDown.x >= this.config.margin.left && this.config.mouseDown.y > this.config.margin.offsetTop &&
              this.config.mouseDown.y < window.innerHeight - 45) {
            this.config.selectionStartPoint = { x: this.config.mouseDown.x - this.config.margin.left, y: this.config.mouseDown.y - this.config.margin.offsetTop };
            this.config.activeSelection = true;
          }
        }
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent) {

    if (!this.config.zoomable) {

      const coords = {
        x: this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left),
        y: this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top - this.config.margin.offsetTop)
      };

      if (this.config.newGuide) {
        this.config.newGuide = false;
        this.config.svg.selectAll('.guide.new').remove();
        this.config.mouseDown = { x: null, y: null };

        if (e.clientY - this.config.margin.offsetTop < this.config.svgDy - 22 && e.clientY > this.config.margin.offsetTop + 65 + this.config.rulerWidth
           && e.clientX < this.config.svgDx - this.config.rulerWidth) {

          const obj = {
            id: uuid(),
            axis: this.config.drawRulerAxis,
            coords
          };
          this.file.activeEffect.grid.guides.push(obj);
          this.fileService.updateEffect(this.file.activeEffect);
        }

      } else if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'anchor' ||
                this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'drag') {

        if (e.clientY > this.config.margin.offsetTop + 65) {
          if (!d3.select('#selectionBox').empty() && this.config.activeSelection) {
            const selectionBoxSize = this.config.svg.select('#selectionBox').node().getBoundingClientRect();
            // this.motorControlService.deselectCollectionEffects();
            if (selectionBoxSize.width > 2 && selectionBoxSize.height > 2 &&
              (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel')) {

              const boxSize = {
                x1: this.nodeService.scale.scaleX.invert(selectionBoxSize.left - this.config.margin.left),
                y1: this.nodeService.scale.scaleY.invert(selectionBoxSize.bottom - this.config.margin.top - this.config.margin.offsetTop),
                x2: this.nodeService.scale.scaleX.invert(selectionBoxSize.right - this.config.margin.left),
                y2: this.nodeService.scale.scaleY.invert(selectionBoxSize.top - this.config.margin.top - this.config.margin.offsetTop)
              };
              this.nodeService.getSelectedElementsInBox(boxSize, this.config.cursor.slug, e.shiftKey, e.altKey);
              if (!this.file.activeEffect.grid.lockGuides && this.config.rulerVisible && this.file.activeEffect.grid.guidesVisible) {
                const selectedGuides = this.fileService.getGuidesWithinBox(boxSize, this.file.activeEffect.grid.guides, e.shiftKey, e.altKey);
                if (selectedGuides.length > 0) { this.drawingService.selectGuides(selectedGuides); }
                this.dataService.addSelectedElements(selectedGuides);
              }
              if (this.config.cursor.slug === 'sel') {
                this.bboxService.drawBoundingBox();
              } else {
                for (const path of this.nodeService.selectedPaths) {
                  this.drawElements.drawNodes(path);
                }
              }
            } else {
              this.bboxService.checkIfOutsideBBox({ x: e.clientX - this.config.margin.left, y: e.clientY - this.config.margin.top - this.config.margin.offsetTop });
            }
          } else {
            this.bboxService.checkIfOutsideBBox({ x: e.clientX - this.config.margin.left, y: e.clientY - this.config.margin.top - this.config.margin.offsetTop });
          }
        }
      } else if (this.config.cursor.slug === 'pen') {
        this.drawingService.setCursor(this.config.cursor.cursor);


      } else if (this.config.cursor.slug === 'brush') {
        this.smoothenBrushPath();

      }
      if (this.config.newNode) {
        this.config.newNode = null;
        this.bboxService.getBBoxSelectedPaths();
      }
      this.config.activeSelection = false;
      this.config.svg.select('#selectionBox').remove();
    }
  }




  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.resize();
  }

  resize() {
    this.document.getElementById('top-section').style.height = ((window.innerHeight * this.file.configuration.horizontalScreenDivision / 100) - 23) + 'px';
    this.document.getElementById('bottom-section').style.height = ((window.innerHeight * (100-this.file.configuration.horizontalScreenDivision) / 100) - 20) + 'px';
    this.document.getElementById('field-inset').style.height = ((window.innerHeight * (100-this.file.configuration.horizontalScreenDivision) / 100) - 20) + 'px';
    this.drawingService.redraw();
    this.motorControlService.onResize();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.config.zoomable) {
      const key = e.key;
      if (key === ' ') {
        if (this.config.activeInput === null && !this.nodeService.inputFieldsActive) {
          this.drawingService.deselectAllElements();
          this.config.svg.call(this.config.zoom);
          this.drawingService.setCursor('url(./assets/icons/tools/cursor-move.png), none');
          this.config.zoomable = true;
        }

      } else if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ) {
        if (!this.nodeService.inputFieldsActive && this.config.activeInput === null) {
          if (this.nodeService.selectedPaths.length > 0 || this.nodeService.selectedNodes.length > 0) {


            let inc = { x: 1, y: 1 };
            if (this.file.activeEffect.grid.snap && this.file.activeEffect.grid.visible) {
              inc = {
                x: this.file.activeEffect.grid.settings.spacingX / (this.file.activeEffect.grid.settings.subDivisionsX - 1),
                y: this.file.activeEffect.grid.settings.spacingY / (this.file.activeEffect.grid.settings.subDivisionsY - 1)
              };
            }

            if (key === 'ArrowUp') {
              this.nodeService.translateElement({ width: 1, height: 1, horizontal: 0, vertical: inc.y });
            } else if (key === 'ArrowDown') {
              this.nodeService.translateElement({ width: 1, height: 1, horizontal: 0, vertical: -inc.y });
            } else if (key === 'ArrowLeft') {
              this.nodeService.translateElement({ width: 1, height: 1, horizontal: -inc.x, vertical: 0 });
            } else if (key === 'ArrowRight') {
              this.nodeService.translateElement({ width: 1, height: 1, horizontal: inc.x, vertical: 0 }); }

            if (this.config.cursor.slug === 'sel') {
              this.bboxService.drawBoundingBox();
            }
            this.bboxService.getBBoxSelectedPaths();

            if (this.nodeService.selectedNodes.length === 1) {
              const selectedNode = this.nodeService.getNodeByID(this.nodeService.selectedNodes[0]);
              if (selectedNode) {
                this.dataService.updatePoints(selectedNode.pos.x, selectedNode.pos.y, null, null);
              }
            }
            this.drawFileData();
          }
        }
      } else if (key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.nodeService.selectAll();
        this.nodeService.selectedNodes = [];
        if (this.nodeService.selectedPaths.length > 0) {
          this.bboxService.drawBoundingBox();
        }
      } else if (key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.config.clipboard.empty = this.nodeService.copySelected();
        this.config.clipboard.guides = this.dataService.activeSelection();

      } else if (key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!this.config.clipboard.empty) {
          this.config.clipboard.empty = true;

          // this.electronService.ipcRenderer.send('disable', { type: 0, enabled: true });
          this.nodeService.pasteSelected(this.config.cursor.slug, { x: 0, y: 0 }, e.shiftKey);
          const paths = this.nodeService.getAll();
          for (const path of paths) {
            if (path.box.left === null) {
              this.bboxService.getBBox(path);
            }
          }
          this.drawFileData();

          if (this.nodeService.selectedPaths && this.config.cursor.slug === 'sel') {
            this.bboxService.drawBoundingBox();
          }
        } else if (this.config.clipboard.guides && this.config.rulerVisible) {
          this.drawingService.drawAllGuides(this.file.activeEffect.grid.guides);
        }

      } else if (e.altKey && this.config.cursor.slug === 'pen') {
        // this.electronService.ipcRenderer.send('selectCursor', 'q');
        this.config.cursor.selectedSubcursor = 'remove-cp';
        this.drawingService.setCursor(this.config.cursor.subcursor.filter(c => c.name === this.config.cursor.selectedSubcursor)[0].cursor);

      } else if (e.altKey && this.config.cursor.slug === 'zoom') {
        this.config.cursor.selectedSubcursor = 'min';
        this.drawingService.setCursor(this.config.cursor.subcursor.filter(c => c.name === this.config.cursor.selectedSubcursor)[0].cursor);
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    const key = e.key;
    if (key === ' ') {
      if (this.config.zoomable) {
        this.config.zoomable = false;
        this.config.svg.on('.zoom', null);
        this.drawingService.setCursor(this.config.cursor.cursor);
      }
    } else if ((key === 'p' || key === 'v' || key === 'a' || key === 'l' ||
      key === 'd' || key === 's' || key === 'i' || key === 'q') && !(e.ctrlKey || e.metaKey))  {
      this.electronService.ipcRenderer.send('selectCursor', key);

    } else if (key === 'Delete' || key === 'Backspace') {

      if (!this.nodeService.inputFieldsActive && this.config.activeInput === null) {

        const activeSelection = this.dataService.activeSelection();
        const nrSelectedNodes = this.nodeService.selectedNodes.length;

        if (this.file.activeCollectionEffect !== null && activeSelection.length === 0 && this.nodeService.selectedPaths.length === 0) {
          this.motorControlService.deleteCollectionEffect(this.file.activeCollectionEffect.id);
          this.file.activeCollectionEffect = null;
        } else {

          if (activeSelection) { this.fileService.deleteGuides(activeSelection); }

          if (nrSelectedNodes > 0 || this.nodeService.selectedPaths.length > 0) {
            this.nodeService.deleteSelected();
            if (nrSelectedNodes > 0) {
              this.bboxService.getBBoxSelectedPaths();
              // for (const path of this.nodeService.selectedPaths) {
              //   const pathel = this.nodeService.getPath(path);
              //   const box = this.bboxService.getBBox(pathel);
              //   if (box !== null) { pathel.box = box.path.box; }
              // }
            }
          }

          this.drawingService.deselectAllElements();
          this.config.svg.select('.cpSVG').remove();

          this.drawFileData();
        }
      }
    } else if (key === 'Enter' && this.config.cursor.slug === 'brush' && this.nodeService.selectedNodes.length === 1) {
      this.smoothenBrushPath();
    } else if (key === 'Enter' && this.config.cursor.slug === 'pen' && this.nodeService.selectedNodes.length === 1) {
      this.nodeService.selectedNodes = [];
      this.config.svg.select('.cursorConnection').remove();
    }
    if (this.config.cursor.selectedSubcursor !== null) {
      this.config.cursor.selectedSubcursor = null;
      this.drawingService.setCursor(this.config.cursor.cursor);
    }
  }

  showMessage(msg: string, type: string, action: string, d: any = null) {
    let btns = [];
    if (type === 'verification') {
      btns = ['yes', 'cancel'];
    } else if (type === 'message') {
      btns = ['ok'];
    }
    // if (file.date.changed) {
    const dialogConfig = this.dialog.open(DialogComponent, {
      width: '380px',
      data: { message: msg, buttons: btns },
      disableClose: true,
      autoFocus: true,
      panelClass: 'custom-modalbox'
    });

    dialogConfig.afterClosed().subscribe(
        data => {
          if (data === 'yes') {
            if (action === 'clearCache') {
              this.effectLibraryService.clear();
            } else if (action === 'resetCOMList') {
              this.hardwareService.clearList();
            } else if (action === 'deleteEffect') {
              this.fileService.deleteEffect(d);
            }
          } else if (type === 'message') {
            if (action === 'updateVersion' && d) {
              const microcontroller = this.hardwareService.deleteMicroController(d);
            }
          }
          return false;
        }

    );
  }


  showExportWindow(str: string, effect: any, controllers: any) {

    const dialogConfig = this.dialog.open(ExportDialogComponent, {
      width: '390px',
      data: { d: str, e: effect, microcontrollers: controllers   },
      disableClose: true,
      autoFocus: true,
      panelClass: 'custom-modalbox'
    });

    dialogConfig.afterClosed().subscribe(
        data => {
          if (data === 'Cancel') {
            return false;
          }
        }
    );
  }



  smoothenBrushPath() {
    if (this.config.newNode) {
      this.nodeService.smoothenPath();
      let path = this.nodeService.getPath(this.nodeService.selectedPaths[0]);
      const bboxSize = this.bboxService.getBBox(path);
      if (bboxSize) {
        this.fileService.updateActiveEffectData(this.file);
        path = bboxSize.path;
      }
      this.nodeService.deselectAll();
      this.drawFileData();
    }
    this.config.newNode = null;
  }





  drawFileData() {


    if (this.file.configuration.horizontalScreenDivision < (100 / window.innerHeight) * (window.innerHeight - 50)) {
      this.config.svg.selectAll('.planeSVG, .cpSVG, .pathSVG, .nodesSVG, .bbox, .gridSVG, .forceNodeSVG').remove();

      if (this.file.activeEffect) {
        if (this.file.activeEffect.grid.visible) {
          // this.drawingService.drawGrid(this.file.activeEffect.grid.settings);
          this.gridService.drawGrid(this.file.activeEffect.grid.settings);
        }

        if (this.config.rulerVisible) {
          this.drawingService.drawAllGuides(this.file.activeEffect.grid.guides);
        }

        this.drawElements.redraw();

        if (this.nodeService.selectedPaths.length > 0 && this.nodeService.selectedNodes.length === 0 && this.config.cursor.slug === 'sel') {
          this.bboxService.drawBoundingBox();
        }
        d3.selectAll('.cpSVG, .nodesSVG, .zeroLine').raise();
      }
    }

    if (this.file.configuration.libraryViewSettings !== 'list') {

      this.drawingService.drawEffects();
    }
  }



}
