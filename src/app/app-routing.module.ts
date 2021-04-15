import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './pages/main-page.component';

import { ToolbarComponent } from './components/interface-elements/toolbars/toolbar.component';
import { ToolbarInsetComponent } from './components/interface-elements/toolbars/toolbar-inset.component'
import { LayersComponent } from './components/windows/layers.component';
import { EffectsComponent } from './components/windows/effects/effects.component';
import { LayerOptionComponent } from './components/windows/layer-option.component';
import { FileSettingsComponent } from './components/windows/settings/file-settings.component';
import { EffectSettingsComponent } from './components/windows/settings/effect-settings.component';
import { GridSettingsComponent } from './components/windows/settings/grid-settings.component';
import { ZigZagComponent } from './components/windows/zigzag-effect.component';
import { TransformComponent } from './components/windows/transform.component';
import { SelectComComponent } from './components/windows/select-com.component';
import { InfoPageComponent } from './pages/info-page.component';
import { FeelixioPageComponent } from './pages/feelixio-page.component';
import { MotorControlComponent } from './components/interface-elements/motor-control/motor-control.component';
import { MotorControlToolbarInset } from './components/interface-elements/toolbars/motor-control-toolbar-inset.component';
import { MotorControlToolbar } from './components/interface-elements/toolbars/motor-control-toolbar.component';
import { MotorSettingsComponent } from './components/windows/play/motor-settings.component';
import { EffectListComponent } from './components/file/effect-list.component';


const routes: Routes = [
    { path: '', component: MainPageComponent },
    { path: 'toolbar', component: ToolbarComponent },
    { path: 'toolbar-inset', component: ToolbarInsetComponent },
    { path: 'layers', component: LayersComponent },
    { path: 'layer-option', component: LayerOptionComponent },
    { path: 'effects', component: EffectsComponent },
    { path: 'file-settings', component: FileSettingsComponent },
    { path: 'file-update-settings', component: FileSettingsComponent },
    { path: 'effect-list', component: EffectListComponent },
    { path: 'effect-settings', component: EffectSettingsComponent },
    { path: 'effect-update-settings', component: EffectSettingsComponent },
    { path: 'grid-settings', component: GridSettingsComponent },
    { path: 'zigzag', component: ZigZagComponent },
    { path: 'transform', component: TransformComponent },
    { path: 'connect-to-com', component: SelectComComponent },
    { path: 'connect-to-com-custom', component: SelectComComponent },
    { path: 'info', component: InfoPageComponent },
    { path: 'feelixio-page', component: FeelixioPageComponent },
    { path: 'motor-control-component', component: MotorControlComponent },
    { path: 'motor-control-toolbar-inset', component: MotorControlToolbarInset },
    { path: 'motor-control-toolbar', component: MotorControlToolbar },
    { path: 'motor-settings', component: MotorSettingsComponent }
  ];

@NgModule({
    imports: [
      RouterModule.forRoot(routes, { useHash: true }),
    ],
    exports: [
      RouterModule
    ]
  })
  export class AppRoutingModule { }
