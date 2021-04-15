import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
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
import { LayersComponent } from './components/windows/layers.component';
import { EffectsComponent } from './components/windows/effects/effects.component';
import { LayerOptionComponent } from './components/windows/layer-option.component';
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
import { CollectionService } from './services/collection.service';
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
import { SelectComComponent } from './components/windows/select-com.component';
import { HardwareService } from './services/hardware.service';
import { StatusbarComponent } from './components/interface-elements/statusbar.component';
import { EaseFunctionLibraryService } from './services/ease-function-library.service';
import { VariableService } from './services/variable.service';
import { MotorSettingsComponent } from './components/windows/play/motor-settings.component';
import { MotorControlComponent } from './components/interface-elements/motor-control/motor-control.component';
import { MotorControlToolbarInset } from './components/interface-elements/toolbars/motor-control-toolbar-inset.component';
import { MotorControlToolbar } from './components/interface-elements/toolbars/motor-control-toolbar.component';
import { UploadService } from './services/upload.service';
import { HistoryService } from './services/history.service';
import { FeelixioComponent } from './components/feelixio/feelixio.component';
import { EffectLibraryService } from './services/effect-library.service';
import { FeelixioPartsComponent } from './components/feelixio/feelixio-parts.component';
import { FeelixioPageComponent } from './pages/feelixio-page.component';
import { FeelixioFileService } from './services/feelixio-file.service';
import { EffectVisualizationService } from './services/effect-visualization.service';
import { FeelixioDrawService } from './services/feelixio-draw.service';
import { FeelixioDrawElementsService } from './services/feelixio-draw-elements.service';
import { ComponentService } from './services/component.service';
import { RenderInfoComponent } from './components/interface-elements/toolbar-header/render-info.component';
import { FeelixioRenderService } from './services/feelixio-render.service';
import { FeelixioValidationService } from './services/feelixio-validation.service';
import { ExportDialogComponent } from './components/windows/export-dialog.component';




@NgModule({
  declarations: [
    AppComponent,
    InfoPageComponent,
    MainPageComponent,
    DrawingPlaneComponent,
    FixedToolbarComponent,
    ToolbarComponent,
    ToolbarInsetComponent,
    LayersComponent,
    LayerOptionComponent,
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
    SelectComComponent,
    StatusbarComponent,
    MotorSettingsComponent,
    MotorControlComponent,
    MotorControlToolbarInset,
    MotorControlToolbar,
    FeelixioComponent,
    FeelixioPartsComponent,
    FeelixioPageComponent,
    RenderInfoComponent
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
    BBoxService,
    DrawElementsService,
    HardwareService,
    EaseFunctionLibraryService,
    VariableService,
    UploadService,
    HistoryService,
    EffectLibraryService,
    FeelixioFileService,
    FeelixioDrawService,
    FeelixioDrawElementsService,
    EffectVisualizationService,
    ComponentService,
    FeelixioRenderService,
    FeelixioValidationService,
    MotorControlService,
    CollectionService
  ],
  bootstrap: [
    AppComponent
  ],
  entryComponents: [
    DialogComponent,
    ExportDialogComponent
  ]
})
export class AppModule { }
