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
              private historyService: HistoryService, private effectLibraryService: EffectLibraryService, public dialog: MatDialog,
              private motorControlService: MotorControlService) {

    this.config = this.drawingService.config;

    this.drawingService.drawFile.subscribe(res => {
      this.drawFileData();
    });

    this.drawingService.showMessage.subscribe(res => {
      this.showMessage(res.msg, res.type);
    });

    this.drawingService.align.subscribe(res => {
      this.alignSelectedItems(res);
    });



    this.electronService.ipcRenderer.on('rulers:toggle', (event: Event, visible: boolean) => {
      if (!visible) {
        this.config.rulerWidth = 0;
        this.config.rulerVisible = false;
        this.file.activeEffect.grid.guidesVisible = false;
      } else {
        this.config.rulerWidth = 13;
        this.config.rulerVisible = true;
      }
      this.fileService.update(this.file);
    });

    this.electronService.ipcRenderer.on('showGuides', (event: Event, visible: boolean) => {
      this.file.activeEffect.grid.guidesVisible = visible;
      if (visible && !this.config.rulerVisible) {
        this.config.rulerVisible = true;
        this.config.rulerWidth = 13;
      }
      this.fileService.update(this.file);
    });

    this.electronService.ipcRenderer.on('showMessage', (event: Event, data: any) => {
      this.showMessage(data, 'msg');
    });


    this.electronService.ipcRenderer.on('lockGuides', (event: Event, lock: boolean) => {
      this.file.activeEffect.grid.lockGuides = lock;
      this.fileService.update(this.file);
    });

    this.electronService.ipcRenderer.on('updateLayers', (event: Event, data: any) => {
      // 0 = data.selected;
      // this.file.layers = data.layers;
      this.fileService.update(this.file);
    })

    this.electronService.ipcRenderer.on('updateCursor', (event: Event, details: any) => {
      this.config.svg.select('.cursorConnection').remove();
      this.drawingService.changeCursor(details);
      this.config.svg.select('#selectionBox').remove();
    });


    this.electronService.ipcRenderer.on('resetCursor', (event: Event) => {
      this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
    });

    this.electronService.ipcRenderer.on('transform', (event: Event, data: any) => {
      this.historyService.addToHistory();
      this.nodeService.translateSelectedPaths(data);
      this.drawingService.drawFileData();
    });

    this.electronService.ipcRenderer.on('grid:toggle', (event: Event, visible: boolean) => {
      this.file.activeEffect.grid.visible = visible;
      if (!visible) { this.file.activeEffect.grid.snap = false; }
      this.fileService.update(this.file);
    });

    this.electronService.ipcRenderer.on('grid:snap', (event: Event, snap: boolean) => {
      this.file.activeEffect.grid.snap = snap;
      this.fileService.update(this.file);
    });

    this.electronService.ipcRenderer.on('reflect:horizontal', (event: Event, snap: boolean) => {
      this.historyService.addToHistory();
      this.bboxService.mirrorPath('horizontal');
    });

    this.electronService.ipcRenderer.on('reflect:vertical', (event: Event, snap: boolean) => {
      this.historyService.addToHistory();
      this.bboxService.mirrorPath('vertical');
    });


    // this.electronService.ipcRenderer.on('showExport', (event: Event, data: any) => {
    //   this.showExportWindow('', data, microcontrollers);
    // });

    this.electronService.ipcRenderer.on('addHapticEffect', (event: Event, data: any) => {
      // data.interface.layer = 0;
      this.config.tmpEffect = data;
    });

    this.electronService.ipcRenderer.on('addHapticLibEffect', (event: Event, data: any) => {
      // data.effect.interface.layer = 0;
      this.config.tmpEffect = data.effect;
    });


    this.electronService.ipcRenderer.on('updateHapticEffect', (event: Event, data: any) => {
      this.fileService.updateHapticEffect(data, true);
    });

    this.electronService.ipcRenderer.on('saveToEffectLibrary', (event: Event, effect: any) => {
      const pathEl = this.nodeService.getPath(effect.path);
      this.effectLibraryService.addEffect(effect, pathEl, this.file.activeEffect.grid.units, 'default');
    });

    this.electronService.ipcRenderer.on('undo', (event: Event) => {
      const data = this.historyService.undo();
      this.reloadFileData(data);
    });

    this.electronService.ipcRenderer.on('redo', (event: Event) => {
      const data = this.historyService.redo();
      this.reloadFileData(data);
    });


    this.electronService.ipcRenderer.on('clearCache', (event: Event) => {
      this.effectLibraryService.clear();
    });


    this.electronService.ipcRenderer.on('openEffectInNewFile', (event: Event, data: any) => {
      this.fileService.createFileFrom(data);
    });


    this.electronService.ipcRenderer.on('updateStatus', (event: Event, data: any) => {
      if (data.microcontroller && data.connected !== undefined && !data.connected) {
        this.config.playing = false;
      }
    });

  }


  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
    console.log(this.file);
    this.file.configuration.rendered = false;
    this.setFilesInServices();
    this.nodeService.loadFile(this.file.activeEffect.paths);
    this.nodeService.setGridLayer(this.file.activeEffect.grid);
    this.drawingService.redraw();
    this.motorControlService.updateViewSettings(this.file);

    this.fileService.fileObservable.subscribe(files => {
      const newFile = files.filter(f => f.isActive)[0];
      let newFileData = false;
      if (newFile._id !== this.file._id) {
        this.dataService.deselectAll();
        newFileData = true;
        this.nodeService.loadFile(newFile.activeEffect.paths);
      }
      this.file = newFile;
      this.setFilesInServices();
      this.nodeService.setGridLayer(this.file.activeEffect.grid);
      this.drawingService.updateResize(this.file.configuration.horizontalScreenDivision, 'horizontal');
      this.drawingService.updateResize(this.file.configuration.verticalScreenDivision, 'vertical');
      this.motorControlService.updateViewSettings(this.file);

      if (newFileData) {
        if (this.electronService.isElectronApp) {
          this.electronService.ipcRenderer.send('updateMenu', {
            visible: this.file.activeEffect.grid.visible,
            snap: this.file.activeEffect.grid.snap,
            lock: this.file.activeEffect.grid.lockGuides
          });
        }
      }
    });
  }

  ngOnChanges(): void {
    this.drawingService.setEditBounds();
    this.drawingService.createPlane();
  }


  ngAfterViewInit(): void {

    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('updateMenu', {
        visible: this.file.activeEffect.grid.visible,
        snap: this.file.activeEffect.grid.snap,
        lock: this.file.activeEffect.grid.lockGuides,
        type: this.file.activeEffect.type });
    }
  }


  reloadFileData(data: any) {
    if (data.file) {
      if (data.file.mode === 'default') {
        this.nodeService.loadFile(data.file.activeEffect.paths);
      } else {
        const activeTab = data.file.moduleTabs.filter(t => t.selected)[0];
        const effect = data.file.effects.filter(e => e.id === activeTab.el)[0];
        if (effect) {
          this.nodeService.loadFile(effect.nodes);
        }
      }
      this.fileService.update(data.file);
    } else {
      if (data.index) { data.index = false; }
    }
  }


  alignSelectedItems(direction: string) {
    this.historyService.addToHistory();
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

    if (!this.config.zoomable && this.nodeService.scale.scaleX !== null) {
      // e.stopPropagation();
      // e.preventDefault();

      const coords = {
        x: this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left),
        y: this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top - this.config.margin.offsetTop)
      };

      if (this.config.rulerVisible) { this.drawingService.rulerFunctions(e); }

      if (this.config.newNode !== null && this.config.cursor.slug === 'pen') {
        if (Math.abs(this.config.newNode.pos.x - coords.x) > 0.5 || Math.abs(this.config.newNode.pos.y - coords.y) > 0.5) {
          const cpPoints = this.nodeService.calculateCP(this.config.newNode, coords);
          this.drawElements.drawControlPoints(cpPoints);
        }
        this.drawElements.drawPath(this.config.newNode.path, 'angle');

        this.drawElements.drawPath(this.config.newNode.path, 'pos');
        this.drawElements.drawNodes(this.config.newNode.path);
        this.config.svg.select('.cursorConnection').remove();
        this.document.getElementById('field-inset').style.cursor = 'url(./assets/icons/tools/cursor-drag.png), none';

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

      if (e.clientY > 45 && e.clientX > this.config.rulerWidth && e.clientY < window.innerHeight - 45 && this.nodeService.scale.scaleX !== null) {

        const coords = {
          x: this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left),
          y: this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top - this.config.margin.offsetTop)
        };

        if (this.config.newNode === null && (this.config.cursor.slug === 'pen' && this.config.cursor.selectedSubcursor !== 'add' ||
            this.config.cursor.slug === 'brush') && 0 !== null) {


          if (coords.x > this.config.editBounds.xMin &&
              (coords.y > this.config.editBounds.yMin && coords.y < this.config.editBounds.yMax)) {

            if (this.config.cursor.slug === 'pen') {
              this.historyService.addToHistory();
              this.electronService.ipcRenderer.send('disable', { type: 0, enabled: true });
            }

            this.config.newNode = this.nodeService.newNode('node', coords, coords);

            if (this.config.newNode && this.config.cursor.slug === 'pen') {
              const path = this.nodeService.getPath(this.nodeService.selectedPaths[0]);
              if (path.nodes.length > 1) {
                const bboxSize = this.bboxService.getBBox(path);
                if (bboxSize !== null) {
                  this.fileService.updatePathEffect(bboxSize.path);
                }
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

        if (e.clientY - this.config.margin.offsetTop < this.config.svgDy && e.clientY > this.config.margin.offsetTop) {

          const obj = {
            id: uuid(),
            axis: this.config.drawRulerAxis,
            coords
          };
          this.file.activeEffect.grid.guides.push(obj);
          this.fileService.update(this.file);
        }

      } else if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'anchor' ||
                this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'drag') {

        if (e.clientY > this.config.margin.offsetTop) {
          if (!d3.select('#selectionBox').empty() && this.config.activeSelection) {
            const selectionBoxSize = this.config.svg.select('#selectionBox').node().getBoundingClientRect();
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
        this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;


      } else if (this.config.cursor.slug === 'brush') {
        this.smoothenBrushPath();
        this.historyService.addToHistory();
      }
      this.config.newNode = null;
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
        if (this.config.activeInput === null) {
          this.drawingService.deselectAllElements();
          this.config.svg.call(this.config.zoom);
          this.document.getElementById('field-inset').style.cursor = 'url(./assets/icons/tools/cursor-move.png), none';
          this.config.zoomable = true;
        }

      } else if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ) {
        if (!this.nodeService.inputFieldsActive && this.config.activeInput === null) {
          if (this.nodeService.selectedPaths.length > 0 || this.nodeService.selectedNodes.length > 0) {
            this.historyService.addToHistory();

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
            for (const item of this.nodeService.selectedPaths) {
              const boxEl = this.bboxService.getBBox(this.nodeService.getPath(item));
            }

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
        this.nodeService.selectAll();
        this.nodeService.selectedNodes = [];
        if (this.nodeService.selectedPaths.length > 0) {
          this.bboxService.drawBoundingBox();
        }
      } else if (key === 'c' && (e.ctrlKey || e.metaKey)) {

        this.config.clipboard.empty = this.nodeService.copySelected();
        this.config.clipboard.guides = this.dataService.activeSelection();

      } else if (key === 'v' && (e.ctrlKey || e.metaKey)) {

        if (!this.config.clipboard.empty) {
          this.config.clipboard.empty = true;
          this.historyService.addToHistory();
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
        this.document.getElementById('field-inset').style.cursor =
            this.config.cursor.subcursor.filter(c => c.name === this.config.cursor.selectedSubcursor)[0].cursor;

      } else if (e.altKey && this.config.cursor.slug === 'zoom') {
        this.config.cursor.selectedSubcursor = 'min';
        this.document.getElementById('field-inset').style.cursor =
            this.config.cursor.subcursor.filter(c => c.name === this.config.cursor.selectedSubcursor)[0].cursor;
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
        this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
      }
    } else if ((key === 'p' || key === 'v' || key === 'a' || key === 'l' ||
      key === 'd' || key === 's' || key === 'i' || key === 'q') && !(e.ctrlKey || e.metaKey))  {
      this.electronService.ipcRenderer.send('selectCursor', key);

    } else if (key === 'Delete' || key === 'Backspace') {

      if (!this.nodeService.inputFieldsActive && this.config.activeInput === null) {
        this.historyService.addToHistory();

        const activeSelection = this.dataService.activeSelection();
        if (activeSelection) { this.fileService.deleteGuides(activeSelection); }

        const nrSelectedNodes = this.nodeService.selectedNodes.length;

        if (nrSelectedNodes > 0 || this.nodeService.selectedPaths.length > 0) {
          this.nodeService.deleteSelected();
          if (nrSelectedNodes > 0) {
            for (const path of this.nodeService.selectedPaths) {
              const pathel = this.nodeService.getPath(path);
              const box = this.bboxService.getBBox(pathel);
              if (box !== null) { pathel.box = box.path.box; }
            }
          }
        }

        this.drawingService.deselectAllElements();
        this.config.svg.select('.cpSVG').remove();

        this.drawFileData();
      }
    } else if (key === 'Enter' && this.config.cursor.slug === 'brush' && this.nodeService.selectedNodes.length === 1) {
      this.smoothenBrushPath();
    } else if (key === 'Enter' && this.config.cursor.slug === 'pen' && this.nodeService.selectedNodes.length === 1) {
      this.nodeService.selectedNodes = [];
      this.config.svg.select('.cursorConnection').remove();
    }
    if (this.config.cursor.selectedSubcursor !== null) {
      this.config.cursor.selectedSubcursor = null;
      this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
    }
  }

  showMessage(msg: string, type: string) {
    let btns = [];
    if (type === 'motionService') {
      btns = ['ok', 'cancel'];
    } else {
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
          if (data === 'ok') {
          } else {
            return false;
          }
        }
    );
  }


  showExportWindow(str: string, effect: any, controllers: any) {

    // if (file.date.changed) {
    const dialogConfig = this.dialog.open(ExportDialogComponent, {
      width: '350px',
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
      if (bboxSize !== null) {
        this.fileService.updatePathEffect(bboxSize.path);
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


      if (this.file.activeEffect.grid.visible) {
        this.drawingService.drawGrid(this.file.activeEffect.grid.settings);
      }

      if (this.config.rulerVisible) {
        this.drawingService.drawAllGuides(this.file.activeEffect.grid.guides);
      }

      this.drawElements.redraw();

      if (this.nodeService.selectedPaths.length > 0 && this.nodeService.selectedNodes.length === 0 && this.config.cursor.slug === 'sel') {
        this.bboxService.drawBoundingBox();
      }
      d3.selectAll('.cpSVG, .nodesSVG').raise();
    }
  }

}
