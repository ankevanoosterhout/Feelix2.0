import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainPageComponent } from './pages/main-page.component';

import { ToolbarComponent } from './components/interface-elements/toolbars/toolbar.component';
import { ToolbarInsetComponent } from './components/interface-elements/toolbars/toolbar-inset.component'
import { EffectsComponent } from './components/windows/effects/effects.component';
import { FileSettingsComponent } from './components/windows/settings/file-settings.component';
import { EffectSettingsComponent } from './components/windows/settings/effect-settings.component';
import { GridSettingsComponent } from './components/windows/settings/grid-settings.component';
import { ZigZagComponent } from './components/windows/zigzag-effect.component';
import { TransformComponent } from './components/windows/transform.component';
import { InfoPageComponent } from './pages/info-page.component';
import { MotorControlComponent } from './components/interface-elements/motor-control/motor-control.component';
import { MotorControlToolbarInsetComponent } from './components/interface-elements/toolbars/motor-control-toolbar-inset.component';
import { MotorControlToolbarComponent } from './components/interface-elements/toolbars/motor-control-toolbar.component';
import { MotorSettingsComponent } from './components/windows/settings/motor-settings.component';
import { EffectListComponent } from './components/file/effect-list.component';
import { ML5jsComponent } from './components/ml5js/ml5js.component';


const routes: Routes = [
    { path: '', component: MainPageComponent },
    { path: 'toolbar', component: ToolbarComponent },
    { path: 'toolbar-inset', component: ToolbarInsetComponent },
    { path: 'effects', component: EffectsComponent },
    { path: 'file-settings', component: FileSettingsComponent },
    { path: 'file-update-settings', component: FileSettingsComponent },
    { path: 'effect-list', component: EffectListComponent },
    { path: 'effect-settings', component: EffectSettingsComponent },
    { path: 'effect-update-settings', component: EffectSettingsComponent },
    { path: 'grid-settings', component: GridSettingsComponent },
    { path: 'zigzag', component: ZigZagComponent },
    { path: 'transform', component: TransformComponent },
    { path: 'info', component: InfoPageComponent },
    { path: 'ml5js', component: ML5jsComponent },
    { path: 'motor-control-component', component: MotorControlComponent },
    { path: 'motor-control-toolbar-inset', component: MotorControlToolbarInsetComponent },
    { path: 'motor-control-toolbar', component: MotorControlToolbarComponent },
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
