import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ɵɵclassMapInterpolate5 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxWebstorageModule } from 'ngx-webstorage';
import { NgxFsModule } from 'ngx-fs';

import { AppComponent } from './app.component';
import { InfoPageComponent } from './pages/info-page.component';
import { ToolbarComponent } from './components/interface-elements/toolbars/toolbar.component';
import { ToolbarInsetComponent } from './components/interface-elements/toolbars/toolbar-inset.component'
import { NgxElectronModule } from 'ngx-electron';
import { MainPageComponent } from './pages/main-page.component';
import { AppRoutingModule } from './app-routing.module';
import { EffectsComponent } from './components/windows/effects/effects.component';
import { FileListComponent } from './components/file/file-list.component';
import { FileSettingsComponent } from './components/windows/settings/file-settings.component';
import { EffectListComponent } from './components/file/effect-list.component';
import { EffectSettingsComponent } from './components/windows/settings/effect-settings.component';
import { FileComponent } from './components/file/file.component';
import { FileService } from './services/file.service';
import { DataService } from './services/data.service';
import { ToolService } from './services/tool.service';
import { NodeService } from './services/node.service';
import { BezierService } from './services/bezier.service';
import { MotorControlService } from './services/motor-control.service';
import { DialogComponent } from './components/windows/dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FileSaverModule } from 'ngx-filesaver';
import { GridSettingsComponent } from './components/windows/settings/grid-settings.component';
import { ZigZagComponent } from './components/windows/zigzag-effect.component';
import { TransformComponent } from './components/windows/transform.component';
import { DrawingPlaneComponent } from './components/interface-elements/drawing-plane/drawing-plane.component';
import { FixedToolbarComponent } from './components/interface-elements/toolbar-header/fixed-toolbar.component';
import { DrawingService } from './services/drawing.service';
import { BBoxService } from './services/bbox.service';
import { DrawElementsService } from './services/draw-elements.service';
import { HardwareService } from './services/hardware.service';
import { StatusbarComponent } from './components/interface-elements/statusbar.component';
import { EaseFunctionLibraryService } from './services/ease-function-library.service';
import { MotorSettingsComponent } from './components/windows/settings/motor-settings.component';
import { MotorControlComponent } from './components/interface-elements/motor-control/motor-control.component';
import { MotorControlToolbarInsetComponent } from './components/interface-elements/toolbars/motor-control-toolbar-inset.component';
import { MotorControlToolbarComponent } from './components/interface-elements/toolbars/motor-control-toolbar.component';
import { UploadService } from './services/upload.service';
import { HistoryService } from './services/history.service';
import { EffectLibraryService } from './services/effect-library.service';
import { EffectVisualizationService } from './services/effect-visualization.service';
import { ComponentService } from './services/component.service';
import { ExportDialogComponent } from './components/windows/export-dialog.component';
import { CloneService } from './services/clone.service';
import { GridService } from './services/grid.service';
import { ML5jsComponent } from './components/ml5js/ml5js.component';
import { ML5jsService } from './services/ml5js.service';
import { DataComponent } from './components/ml5js/elements/data.component';
import { ClassificationComponent } from './components/ml5js/elements/classification.component';
import { ModelComponent } from './components/ml5js/elements/model.component';

@NgModule({
  declarations: [
    AppComponent,
    InfoPageComponent,
    MainPageComponent,
    DrawingPlaneComponent,
    FixedToolbarComponent,
    ToolbarComponent,
    ToolbarInsetComponent,
    EffectsComponent,
    FileComponent,
    FileListComponent,
    FileSettingsComponent,
    EffectListComponent,
    EffectSettingsComponent,
    GridSettingsComponent,
    DialogComponent,
    ExportDialogComponent,
    ZigZagComponent,
    TransformComponent,
    StatusbarComponent,
    MotorSettingsComponent,
    MotorControlComponent,
    MotorControlToolbarInsetComponent,
    MotorControlToolbarComponent,
    ML5jsComponent,
    DataComponent,
    ClassificationComponent,
    ModelComponent
  ],
  imports: [
    BrowserModule,
    NgxWebstorageModule.forRoot(),
    NgxElectronModule,
    AppRoutingModule,
    FormsModule,
    NgxFsModule,
    MatDialogModule,
    BrowserAnimationsModule,
    FileSaverModule
  ],
  providers: [
    FileService,
    DataService,
    ToolService,
    NodeService,
    BezierService,
    DrawingService,
    GridService,
    BBoxService,
    DrawElementsService,
    HardwareService,
    EaseFunctionLibraryService,
    UploadService,
    HistoryService,
    EffectLibraryService,
    EffectVisualizationService,
    ComponentService,
    MotorControlService,
    CloneService,
    ML5jsService
  ],
  bootstrap: [
    AppComponent
  ],
  entryComponents: [
    DialogComponent,
    ExportDialogComponent,
  ]
})
export class AppModule { }
