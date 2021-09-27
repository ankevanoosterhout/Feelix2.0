import { Injectable } from '@angular/core';
import { LibraryEffect } from '../models/effect.model';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { CloneService } from './clone.service';

@Injectable()
export class EffectLibraryService {

  public static readonly LIBRARY_LOCATION = 'ngx-webstorage|effectLibrary';

  effectLibrary: Array<LibraryEffect> = [];
  showLibraryTab: Subject<any> = new Subject();

  constructor(private localSt: LocalStorageService, private cloneService: CloneService) {
    // retrieve files stored in local storage
    this.getEffectsFromLocalStorage();

    window.addEventListener('storage', event => {
        if (event.storageArea === localStorage) {
          if (event.key === EffectLibraryService.LIBRARY_LOCATION) {
            const effectLib: LibraryEffect[] = JSON.parse(localStorage.getItem(EffectLibraryService.LIBRARY_LOCATION));
            this.effectLibrary = effectLib;
          }
        }
      },
      true
    );
  }

  getEffectsFromLocalStorage() {
    const storedEffects = this.localSt.retrieve('effectLibrary');
    if (storedEffects && storedEffects.length > 0) {
      this.effectLibrary = storedEffects;
    } else {
      this.createStandardEffects();
    }
  }

  addEffect(effect: any) {
    this.getEffectsFromLocalStorage();
    if (effect) {
      const libraryEffect = this.effectLibrary.filter(l => l.effect.id === effect.id)[0];
      if (libraryEffect) {
        const index = this.effectLibrary.indexOf(libraryEffect);
        effect.date.modified = new Date().getTime();
        effect.storedIn = 'library';
        this.effectLibrary[index].effect = this.cloneService.deepClone(effect);
      } else {
        effect.date.created = effect.date.created ? effect.date.created : new Date().getTime();
        effect.date.modified = new Date().getTime();
        effect.id = uuid();
        effect.name += '-lib';
        effect.storedIn = 'library';
        const newLibraryEffect = new LibraryEffect(uuid(), effect);
        this.effectLibrary.unshift(newLibraryEffect);
      }
      this.showLibraryEffects();
      this.store();
    }
  }

  deleteEffect(id: string) {
    const libEffect = this.effectLibrary.filter(l => l.effect.id === id || l.id === id)[0];
    if (libEffect) {
      const index = this.effectLibrary.indexOf(libEffect);
      this.effectLibrary.splice(index, 1);
      this.store();
    }
  }

  getEffects() {
    this.getEffectsFromLocalStorage();
    return this.effectLibrary;
  }


  getEffect(id: string) {
    this.getEffectsFromLocalStorage();
    return this.effectLibrary.filter(l => l.effect.id === id || l.id === id)[0];
  }

  inLibrary(id: string) {
    const effect = this.effectLibrary.filter(l => l.effect.id === id)[0];
    return effect ? true : false;
  }

  clear() {
    this.effectLibrary = [];
    this.store();
  }

  showLibraryEffects() {
    this.showLibraryTab.next();
  }

  sortLibraryEffectsBy(sortType: string, sortDirection: string) {
    if (sortType === 'name') {
      this.effectLibrary.sort((a,b) => (a.effect.name > b.effect.name) ? 1 : ((b.effect.name > a.effect.name) ? -1 : 0));
    } else if (sortType === 'type') {
      this.effectLibrary.sort((a,b) => (a.effect.type > b.effect.type) ? 1 : ((b.effect.type > a.effect.type) ? -1 : 0));
    } else if (sortType === 'date-created') {
      this.effectLibrary.sort((a,b) => (a.effect.date.created > b.effect.date.created) ? 1 : ((b.effect.date.created > a.effect.date.created) ? -1 : 0));
    } else if (sortType === 'date-modified') {
      this.effectLibrary.sort((a,b) => (a.effect.date.modified > b.effect.date.modified) ? 1 : ((b.effect.date.modified > a.effect.date.modified) ? -1 : 0));
    }
    if (sortDirection === 'last-first') {
      this.effectLibrary.reverse();
    }
    this.store();
  }

  store() {
    this.localSt.store('effectLibrary', this.effectLibrary);
    // console.log(this.effectLibrary);
  }

  createStandardEffects() {
    const JSON_data = '[{"effect":{"id":"9cd29f96-b58c-4fa8-b72d-e8645481f6f6","name":"sharp","date":{"created":1632088578127,"modified":1632089813254,"changed":false},"type":"position","rotation":"dependent","paths":[{"id":"867fd156-eddb-4179-bc19-88469670a2c1","nodes":[{"id":"588cb57a-1477-4f14-91c8-3bb92fb70ea7","cp":null,"type":"node","pos":{"x":140,"y":0},"angle":{"x":170.15047879616964,"y":0},"path":"867fd156-eddb-4179-bc19-88469670a2c1"},{"id":"675354fc-b536-4ef7-aa60-8319e2df9f65","cp":null,"type":"node","pos":{"x":180,"y":80},"angle":{"x":180,"y":80},"path":"867fd156-eddb-4179-bc19-88469670a2c1"},{"id":"547a6841-5c05-45ca-9587-49b4c41a4984","cp":null,"type":"node","pos":{"x":220,"y":0},"angle":{"x":189.6032831737346,"y":0},"path":"867fd156-eddb-4179-bc19-88469670a2c1"}],"box":{"left":140,"width":80.00000000000003,"top":80,"height":80,"right":220.00000000000003,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":0,"end":100},"size":{"x":140,"y":80,"width":80.00000000000003,"height":80,"top":80,"bottom":0},"storedIn":"library"},"id":"c4487f6b-4549-46e2-ac0d-db4d1c65a1df"},{"effect":{"id":"51e3e0ef-7a87-41e9-bb46-877532e02f23","name":"barrier","date":{"created":1632088544243,"modified":1632089811428,"changed":false},"type":"torque","rotation":"independent","paths":[{"id":"309de9f7-4b1d-4e15-ae4b-57b6f99165e7","nodes":[{"id":"43e6701d-1509-4e3f-9d6b-e8381c0efbba","cp":null,"type":"node","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"309de9f7-4b1d-4e15-ae4b-57b6f99165e7"},{"id":"e80eb4da-b38e-4cd7-96f2-72056e78119f","cp":null,"type":"node","pos":{"x":140,"y":100},"angle":{"x":140,"y":100},"path":"309de9f7-4b1d-4e15-ae4b-57b6f99165e7"}],"box":{"left":120,"width":20,"top":100,"height":100,"right":140,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":120,"y":100,"width":20,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"a5816898-ae7b-4fac-8c2a-1e797907b3f0"},{"effect":{"id":"32a4fb03-45d2-49e6-bd62-70bba07aee88","name":"bump","date":{"created":1632088669825,"modified":1632089804636,"changed":false},"type":"position","rotation":"dependent","paths":[{"id":"92b1441c-60fb-408e-bbab-a10dcbe48d45","nodes":[{"id":"9c258ec9-8757-42d0-add4-e332af9a3185","cp":"155970bc-0d79-4460-ab0d-313fa680db61","type":"cp","pos":{"x":100,"y":-0.0009575486579080916},"angle":{"x":100,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"9c258ec9-8757-42d0-add4-e332af9a3185","cp":null,"type":"node","pos":{"x":120,"y":-0.0009575486579080916},"angle":{"x":96.52530779753762,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"9c258ec9-8757-42d0-add4-e332af9a3185","cp":"65e6cb29-6955-4638-9002-77d2db99b03d","type":"cp","pos":{"x":140,"y":-0.0009575486579080916},"angle":{"x":115.88618915299675,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"78f75491-13ae-49f7-adea-8ce29222a76c","cp":"c6129fbe-a17e-4f29-af03-db8ff2921a45","type":"cp","pos":{"x":150,"y":89.99947537342436},"angle":{"x":128.0437756497948,"y":89.90543200680999},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"78f75491-13ae-49f7-adea-8ce29222a76c","cp":null,"type":"node","pos":{"x":180,"y":89.99947537342436},"angle":{"x":180,"y":89.99947537342436},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"78f75491-13ae-49f7-adea-8ce29222a76c","cp":"76942210-535e-49b5-a06d-d59608a0dc7b","type":"cp","pos":{"x":210,"y":89.99947537342436},"angle":{"x":229.74008207934335,"y":92.95794317939989},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"6cd0d23c-f985-46f1-8383-2cad5308ed7c","cp":"8b3b3728-bee0-4bd7-9ab4-737ff08b1249","type":"cp","pos":{"x":220,"y":-0.0009575486579080916},"angle":{"x":246.7151905209858,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"6cd0d23c-f985-46f1-8383-2cad5308ed7c","cp":null,"type":"node","pos":{"x":240,"y":-0.0009575486579080916},"angle":{"x":267.90697674418607,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"},{"id":"6cd0d23c-f985-46f1-8383-2cad5308ed7c","cp":"4932c7d1-1f62-4997-9519-2c5d0f6469fd","type":"cp","pos":{"x":260,"y":-0.0009575486579080916},"angle":{"x":260,"y":-0.0009575486579080916},"path":"92b1441c-60fb-408e-bbab-a10dcbe48d45"}],"box":{"left":120,"width":120,"top":89.99947537342436,"height":90.00043292208225,"right":240,"bottom":-0.0009575486578983217},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":0,"end":100},"size":{"x":120,"y":89.99947537342436,"width":120,"height":90.00043292208225,"top":89.99947537342436,"bottom":-0.0009575486578983217},"storedIn":"library"},"id":"42e4f401-6253-4d56-a0a0-48ae4596c949"},{"effect":{"id":"d76895c4-93fc-49bc-a2c4-ccde0f801086","name":"sawtooth","date":{"created":1632088840648,"modified":1632089801069,"changed":false},"type":"torque","rotation":"dependent","paths":[{"id":"d8b01876-c305-42e9-a633-9b1534093d09","nodes":[{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":"e4eb392a-12c0-46b7-a985-639ed2cf8e36","type":"cp","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":null,"type":"node","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":"ff219987-4b14-464a-914b-e4c00d65fbe5","type":"cp","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":"f76884c0-72c4-4529-aacd-a3d5d34f65e2","type":"cp","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":null,"type":"node","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":"8ed644e3-43fd-4f19-932b-c33572599c08","type":"cp","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"9758941c-3780-4840-a4d2-a474a2655e3f","cp":null,"type":"node","pos":{"x":220,"y":-100},"angle":{"x":220,"y":-100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":"0a10b8d4-8bf3-4575-8031-4e7ca237b170","type":"cp","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":null,"type":"node","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":"16fda228-7b61-4a49-a1f5-64d81d9a7e6b","type":"cp","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"}],"box":{"left":140,"width":120,"top":100,"height":200,"right":260,"bottom":-100},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":140,"y":100,"width":120,"height":200,"top":100,"bottom":-100},"storedIn":"library"},"id":"7fba1066-4db1-4e57-9832-f44393ea6f58"},{"effect":{"id":"feafc2b3-e346-4a4e-8eba-0ed828ebd11e","name":"spring","date":{"created":1632088469978,"modified":1632089796087,"changed":false},"type":"torque","rotation":"independent","paths":[{"id":"165b8d6a-b4df-4aa0-abb9-75f4866c0dd7","nodes":[{"id":"75aa45e5-ad27-443f-ab46-7bf34b19667d","cp":null,"type":"node","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"165b8d6a-b4df-4aa0-abb9-75f4866c0dd7"},{"id":"be5d2a99-902b-4268-ad61-d7e4a9aa69a9","cp":null,"type":"node","pos":{"x":260,"y":100},"angle":{"x":260,"y":100},"path":"165b8d6a-b4df-4aa0-abb9-75f4866c0dd7"}],"box":{"left":140,"width":120,"top":100,"height":100,"right":260,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":140,"y":100,"width":120,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"92428653-796d-42ae-b532-c8d79480f864"},{"effect":{"id":"79dec533-eb6a-4052-a9be-cd89180c4aac","name":"two-way-dentent","date":{"created":1632060005219,"modified":1632089792597,"changed":false},"type":"torque","rotation":"dependent","paths":[{"id":"cf9687e4-8cb7-4381-8427-3a0149f3f55e","nodes":[{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":"17e2d46a-94c1-4422-9a65-b444198f29c7","type":"cp","pos":{"x":80,"y":0},"angle":{"x":80,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":null,"type":"node","pos":{"x":100,"y":0},"angle":{"x":100,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":"b7bca219-ad12-4ea5-a7a1-886ba8d6f132","type":"cp","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":"b0467dd4-4073-49b1-927c-05eca22ab251","type":"cp","pos":{"x":120,"y":80},"angle":{"x":120,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":null,"type":"node","pos":{"x":140,"y":80},"angle":{"x":140,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":"7ab3e4ef-9cd9-4730-a3fe-a728d5e974c4","type":"cp","pos":{"x":160,"y":80},"angle":{"x":160,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":"d495cc9e-03a9-4439-9ab4-42a3ed759e97","type":"cp","pos":{"x":160,"y":0},"angle":{"x":160,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":null,"type":"node","pos":{"x":180,"y":0},"angle":{"x":180,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":"307ebf16-e513-4d60-b98c-ba9b10785a2b","type":"cp","pos":{"x":200,"y":0},"angle":{"x":200,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":"8d7853c8-6c91-4d7e-a610-19cff40c7cb9","type":"cp","pos":{"x":190,"y":-80},"angle":{"x":190,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":null,"type":"node","pos":{"x":220,"y":-80},"angle":{"x":220,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":"d03b6020-f331-48d5-b711-0717f6dbfb13","type":"cp","pos":{"x":250,"y":-80},"angle":{"x":250,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":"9f2a35e1-4f4b-41ca-b76c-a5486cd4c27c","type":"cp","pos":{"x":240,"y":0},"angle":{"x":240,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":null,"type":"node","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":"923908b8-8ec3-4fca-b599-5ecf7db23a3e","type":"cp","pos":{"x":280,"y":0},"angle":{"x":280,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"}],"box":{"left":100,"width":160,"top":80,"height":160.00000000000003,"right":260,"bottom":-80.00000000000003},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":100,"y":80,"width":160,"height":160.00000000000003,"top":80,"bottom":-80.00000000000003},"storedIn":"library"},"id":"cb2c0e03-af71-4adf-a222-ba628d664f4f"},{"effect":{"id":"6c399305-2a9e-4f30-9469-e7964f7fa567","name":"zigzag-spring","date":{"created":1632088764271,"modified":1632089789549,"changed":false},"type":"torque","rotation":"independent","paths":[{"id":"a8382b6c-dafb-4033-9299-921c07e77549","nodes":[{"id":"528a9b10-9e36-420a-9e73-0d96ca91e5e5","cp":"ef2be08c-9850-4c22-98e1-643279b6c7c4","type":"cp","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"528a9b10-9e36-420a-9e73-0d96ca91e5e5","cp":null,"type":"node","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"528a9b10-9e36-420a-9e73-0d96ca91e5e5","cp":"be694e23-058c-49a4-8f16-ef1ecfb4e194","type":"cp","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"3f96706f-a166-4e38-bacf-ba3fca86baa8","cp":"4d71ec34-a0e7-47b1-a87a-bac837fa67e9","type":"cp","pos":{"x":140,"y":60},"angle":{"x":140,"y":60},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"3f96706f-a166-4e38-bacf-ba3fca86baa8","cp":null,"type":"node","pos":{"x":140,"y":60},"angle":{"x":140,"y":60},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"3f96706f-a166-4e38-bacf-ba3fca86baa8","cp":"8c51b317-83fc-4dd4-8de7-57c9407dd98a","type":"cp","pos":{"x":140,"y":60},"angle":{"x":140,"y":60},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"fd2481e9-7631-4f63-9a50-1bbd7c703706","cp":null,"type":"node","pos":{"x":160,"y":20},"angle":{"x":160,"y":20},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"8c9f92f2-e61f-4c48-8de5-362eb2a52131","cp":null,"type":"node","pos":{"x":180,"y":80},"angle":{"x":180,"y":80},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"f8cc130b-2a1c-4619-9c71-b94e6f2b6c59","cp":"4827ab65-6755-4951-9d8c-0b7d0a2cc21a","type":"cp","pos":{"x":200,"y":40},"angle":{"x":200,"y":40},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"f8cc130b-2a1c-4619-9c71-b94e6f2b6c59","cp":null,"type":"node","pos":{"x":200,"y":40},"angle":{"x":200,"y":40},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"f8cc130b-2a1c-4619-9c71-b94e6f2b6c59","cp":"829effaf-d93c-4f51-a89d-45d529e1995b","type":"cp","pos":{"x":200,"y":40},"angle":{"x":200,"y":40},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"4199a63b-e3f5-40bb-9909-6a19a4a17ad6","cp":"2c26ce84-dd01-4432-b2ee-c427f3aa6995","type":"cp","pos":{"x":220,"y":100},"angle":{"x":220,"y":100},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"4199a63b-e3f5-40bb-9909-6a19a4a17ad6","cp":null,"type":"node","pos":{"x":220,"y":100},"angle":{"x":220,"y":100},"path":"a8382b6c-dafb-4033-9299-921c07e77549"},{"id":"4199a63b-e3f5-40bb-9909-6a19a4a17ad6","cp":"a2df610b-3512-414a-9574-5b091b21eb2f","type":"cp","pos":{"x":220,"y":100},"angle":{"x":220,"y":100},"path":"a8382b6c-dafb-4033-9299-921c07e77549"}],"box":{"left":120,"width":100.00000000000003,"top":100,"height":100,"right":220.00000000000003,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"degrees","PR":360},"yUnit":{"name":"voltage (%)","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":120,"y":100,"width":100.00000000000003,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"88c862dd-cd02-4cb9-b2fa-3d74b0cab00e"}]'

    const libEffectArray = JSON.parse(JSON_data);

    setTimeout(() => {
      for (const effect of libEffectArray) {
        this.effectLibrary.push(effect);
      }
      this.store();
    }, 500);
  }



}
