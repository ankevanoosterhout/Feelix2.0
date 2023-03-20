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
    console.log(this.effectLibrary);
    this.localSt.store('effectLibrary', this.effectLibrary);
  }

  createStandardEffects() {
    const JSON_data = '[{"effect":{"id":"40b87cf0-d6bb-432b-ade9-7e6aa092fd0b","name":"zigzag-spring-lib","date":{"created":1633470393712,"modified":1633475172862,"changed":false},"type":0,"rotation":"independent","paths":[{"id":"b0438e52-5863-4c1e-b97e-2372349b648e","nodes":[{"id":"abb00e3e-a6e8-4595-9eb1-bece93f3f062","cp":null,"type":"node","pos":{"x":80,"y":100},"angle":{"x":80,"y":100},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"},{"id":"81b974c9-6d76-410b-b89e-8ea2d5e59533","cp":null,"type":"node","pos":{"x":100,"y":40},"angle":{"x":100,"y":40},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"},{"id":"d69bd223-6c36-4581-9bb7-37c7018595c1","cp":null,"type":"node","pos":{"x":120,"y":80},"angle":{"x":120,"y":80},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"},{"id":"a7276a29-1acf-4c46-bbcc-fa6af574d6c6","cp":null,"type":"node","pos":{"x":140,"y":20},"angle":{"x":140,"y":20},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"},{"id":"258ddbbe-ea03-4139-9ade-9246f9e10233","cp":null,"type":"node","pos":{"x":160,"y":60},"angle":{"x":160,"y":60},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"},{"id":"96781abf-097a-46e9-9ec9-7c0a53f27746","cp":null,"type":"node","pos":{"x":180,"y":0},"angle":{"x":180,"y":0},"path":"b0438e52-5863-4c1e-b97e-2372349b648e"}],"box":{"left":80,"width":100,"top":100,"height":100,"right":180,"bottom":0},"lock":false}],"grid":{"snap":false,"visible":false,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":80,"y":100,"width":100,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"47725761-ecd1-4d62-96bc-08a5981c221f"},{"effect":{"id":"c3f3a7fb-9731-45da-98cc-3f022fbecdbe","name":"spring-lib","date":{"created":1633470247595,"modified":1633475161741,"changed":false},"type":0,"rotation":"independent","paths":[{"id":"2962f93c-3461-4143-ad38-bafdbbdf4e92","nodes":[{"id":"1ef89fb2-ae57-472e-91d1-e91de91c8999","cp":null,"type":"node","pos":{"x":100,"y":100},"angle":{"x":100,"y":100},"path":"2962f93c-3461-4143-ad38-bafdbbdf4e92"},{"id":"2a5ea6cc-e873-4e88-bc84-8fc0b09c3e6e","cp":null,"type":"node","pos":{"x":180,"y":0},"angle":{"x":180,"y":0},"path":"2962f93c-3461-4143-ad38-bafdbbdf4e92"}],"box":{"left":100,"width":80,"top":100,"height":100,"right":180,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":100,"y":100,"width":80,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"72d5a1f2-70a4-4cc8-a986-ba4ae273e453"},{"effect":{"id":"0d9482e3-e8e4-4eb8-94aa-9fbf01d60ee1","name":"barrier-lib","date":{"created":1633470352871,"modified":1633475155892,"changed":false},"type":0,"rotation":"independent","paths":[{"box":{"bottom":0,"height":100,"left":100,"right":120,"top":100,"width":20},"id":"729d130a-019c-457c-88f2-24c51baab649","lock":false,"nodes":[{"angle":{"x":100,"y":100},"cp":null,"id":"b213deac-2a1b-4593-8241-725802fe310c","path":"729d130a-019c-457c-88f2-24c51baab649","pos":{"x":100,"y":100},"type":"node"},{"angle":{"x":120,"y":0},"cp":null,"id":"62654066-0fe8-4f64-b79f-7b1c5d194143","path":"729d130a-019c-457c-88f2-24c51baab649","pos":{"x":120,"y":0},"type":"node"}]}],"grid":{"snap":false,"visible":false,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":100,"y":100,"width":20,"height":100,"top":100,"bottom":0},"storedIn":"library"},"id":"1c40a8c3-883e-4dfa-ab58-8988c192afa1"},{"effect":{"id":"96bb4029-6b54-47dc-bf9d-023e6c500996","name":"bump-lib","date":{"created":1633474602704,"modified":1633474697582,"changed":false},"type":1,"rotation":"dependent","paths":[{"id":"87325e3a-36c0-4ca2-9dde-c6897cbc1938","nodes":[{"id":"c996fb66-e4de-4cc8-9b38-f43a69c8aea1","cp":"c9479c90-367e-41d6-84a8-28e32b9c5c05","type":"cp","pos":{"x":100,"y":-10},"angle":{"x":99.75376196990423,"y":-10},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"c996fb66-e4de-4cc8-9b38-f43a69c8aea1","cp":null,"type":"node","pos":{"x":120,"y":0},"angle":{"x":99.23392612859097,"y":0},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"c996fb66-e4de-4cc8-9b38-f43a69c8aea1","cp":"8a408fa9-f60c-40cc-92af-86d65cc68183","type":"cp","pos":{"x":140,"y":10},"angle":{"x":118.68673050615594,"y":19.279470410246592},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"d540758c-1c64-4c8a-95a6-2c4b7ae6bd4c","cp":"c3fcdb25-9608-4793-a75f-551d0870250d","type":"cp","pos":{"x":150,"y":80},"angle":{"x":126.3201094391245,"y":80.0274213804145},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"d540758c-1c64-4c8a-95a6-2c4b7ae6bd4c","cp":null,"type":"node","pos":{"x":180,"y":80},"angle":{"x":180,"y":80},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"d540758c-1c64-4c8a-95a6-2c4b7ae6bd4c","cp":"249bdac0-9a16-40e0-bb83-0eec7a3c683e","type":"cp","pos":{"x":210,"y":80},"angle":{"x":236.14227086183308,"y":79.67627715515341},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"81e6ef83-3b3c-4a45-9906-6d60d7d74d76","cp":"98bbf36f-01a4-4a62-9532-7fbbe9ec6bd5","type":"cp","pos":{"x":220,"y":10},"angle":{"x":238.85088919288646,"y":24.546633789162886},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"81e6ef83-3b3c-4a45-9906-6d60d7d74d76","cp":null,"type":"node","pos":{"x":240,"y":0},"angle":{"x":260.76607387140905,"y":0},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"},{"id":"81e6ef83-3b3c-4a45-9906-6d60d7d74d76","cp":"9dc5a2d0-77a6-400b-8200-461f6f966b16","type":"cp","pos":{"x":257.8885438199983,"y":-8.944271909999149},"angle":{"x":258.6272579102856,"y":-8.944271909999149},"path":"87325e3a-36c0-4ca2-9dde-c6897cbc1938"}],"box":{"left":120,"width":120,"top":80,"height":80,"right":240,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":0,"end":100},"size":{"x":120,"y":80,"width":120,"height":80,"top":80,"bottom":0},"storedIn":"library"},"id":"1453d30b-4076-49b5-b72b-2cd249e1fee7"},{"effect":{"id":"a2d329ba-b9e0-430f-84cc-93766d6f7dc8","name":"velocity-effect-lib","date":{"created":1633470782704,"modified":1633470943177,"changed":false},"type":2,"rotation":"dependent","paths":[{"id":"82642913-c887-422d-9282-3fc2a63af782","nodes":[{"id":"c3d733a2-6770-4a7a-80c0-0888783f4245","cp":"f155c957-6a3c-4e9b-a0a6-0fec2ba68741","type":"cp","pos":{"x":650,"y":-20},"angle":{"x":650,"y":-20},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"c3d733a2-6770-4a7a-80c0-0888783f4245","cp":null,"type":"node","pos":{"x":700,"y":0},"angle":{"x":700,"y":0},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"c3d733a2-6770-4a7a-80c0-0888783f4245","cp":"6b4929e9-dedc-4b4f-add4-c9992ead303b","type":"cp","pos":{"x":750,"y":20},"angle":{"x":750,"y":20},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"4e3c2c22-20ec-45f6-af8f-da189b2c237c","cp":"c555d54f-ad0e-4dd3-bdfc-d67c7e3a0588","type":"cp","pos":{"x":850,"y":80},"angle":{"x":850,"y":80},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"4e3c2c22-20ec-45f6-af8f-da189b2c237c","cp":null,"type":"node","pos":{"x":997.0501474926252,"y":80},"angle":{"x":997.0501474926252,"y":80},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"4e3c2c22-20ec-45f6-af8f-da189b2c237c","cp":"c16e08e2-a25f-45d3-b5c6-4561bd7df981","type":"cp","pos":{"x":1197.0501474926252,"y":80.00000000000001},"angle":{"x":1197.0501474926252,"y":80.00000000000001},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"6838060a-a25d-44dd-897d-fafbd509751c","cp":"1e0542d7-24ed-4e0d-9dcf-3f0f7b6807fd","type":"cp","pos":{"x":1250,"y":-79.99999999999999},"angle":{"x":1250,"y":-79.99999999999999},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"6838060a-a25d-44dd-897d-fafbd509751c","cp":null,"type":"node","pos":{"x":1500,"y":-80},"angle":{"x":1500,"y":-80},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"6838060a-a25d-44dd-897d-fafbd509751c","cp":"72a07438-7952-4bda-bf9d-a21d356c0a1d","type":"cp","pos":{"x":1700,"y":-80},"angle":{"x":1700,"y":-80},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"5610e562-06a1-4baf-b4e0-7a0c94162331","cp":"f0f90cc7-c294-445e-b6ac-451bfacfcd6e","type":"cp","pos":{"x":1750,"y":60},"angle":{"x":1750,"y":60},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"5610e562-06a1-4baf-b4e0-7a0c94162331","cp":null,"type":"node","pos":{"x":1950,"y":60},"angle":{"x":1950,"y":60},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"5610e562-06a1-4baf-b4e0-7a0c94162331","cp":"ce7cbbfa-1372-46f8-938e-05d1d94f7236","type":"cp","pos":{"x":2150,"y":60},"angle":{"x":2150,"y":60},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"97dbeb41-40e1-4c24-86a6-f98517673a26","cp":"fff38fa4-ba81-43b1-b2d9-d2ced37c86b2","type":"cp","pos":{"x":2200,"y":-39.999999999999986},"angle":{"x":2200,"y":-39.999999999999986},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"97dbeb41-40e1-4c24-86a6-f98517673a26","cp":null,"type":"node","pos":{"x":2400,"y":-40},"angle":{"x":2400,"y":-40},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"97dbeb41-40e1-4c24-86a6-f98517673a26","cp":"fe83ba87-48a7-4f8a-beb1-ae50667565b7","type":"cp","pos":{"x":2500,"y":-40},"angle":{"x":2500,"y":-40},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"9bf7a7c9-c142-4089-bb6a-91e101b98bd3","cp":"0fb8f0ad-924a-4c3a-8b84-02783c8a9b6c","type":"cp","pos":{"x":2600,"y":0},"angle":{"x":2600,"y":0},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"9bf7a7c9-c142-4089-bb6a-91e101b98bd3","cp":null,"type":"node","pos":{"x":2600,"y":0},"angle":{"x":2600,"y":0},"path":"82642913-c887-422d-9282-3fc2a63af782"},{"id":"9bf7a7c9-c142-4089-bb6a-91e101b98bd3","cp":"a12edeef-4b8e-4ff1-8383-cbb26009773c","type":"cp","pos":{"x":2600,"y":0},"angle":{"x":2600,"y":0},"path":"82642913-c887-422d-9282-3fc2a63af782"}],"box":{"left":700,"width":1900,"top":80,"height":160,"right":2600,"bottom":-80},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":100,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"ms","PR":1000},"yUnit":{"name":"%","PR":1000},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":3000},"range_y":{"start":-100,"end":100},"size":{"x":700,"y":80,"width":1900,"height":160,"top":80,"bottom":-80},"storedIn":"library"},"id":"452a41d4-8382-46ac-940c-01f355b244f2"},{"effect":{"id":"7d248287-3ae9-4499-84d7-2777a7f58123","name":"sawtooth-lib","date":{"created":1632088840648,"modified":1633470686964,"changed":false},"type":0,"rotation":"dependent","paths":[{"id":"d8b01876-c305-42e9-a633-9b1534093d09","nodes":[{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":"e4eb392a-12c0-46b7-a985-639ed2cf8e36","type":"cp","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":null,"type":"node","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"493f7348-8ec4-499e-ac46-25f05486cf3a","cp":"ff219987-4b14-464a-914b-e4c00d65fbe5","type":"cp","pos":{"x":140,"y":0},"angle":{"x":140,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":"f76884c0-72c4-4529-aacd-a3d5d34f65e2","type":"cp","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":null,"type":"node","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"777dafa7-b3b3-4822-88b7-a9fb495285cf","cp":"8ed644e3-43fd-4f19-932b-c33572599c08","type":"cp","pos":{"x":180,"y":100},"angle":{"x":180,"y":100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"9758941c-3780-4840-a4d2-a474a2655e3f","cp":null,"type":"node","pos":{"x":220,"y":-100},"angle":{"x":220,"y":-100},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":"0a10b8d4-8bf3-4575-8031-4e7ca237b170","type":"cp","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":null,"type":"node","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"},{"id":"fcadd705-7cc2-4cc0-b0ec-ee844bb89212","cp":"16fda228-7b61-4a49-a1f5-64d81d9a7e6b","type":"cp","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"d8b01876-c305-42e9-a633-9b1534093d09"}],"box":{"left":140,"width":120,"top":100,"height":200,"right":260,"bottom":-100},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":140,"y":100,"width":120,"height":200,"top":100,"bottom":-100},"storedIn":"library"},"id":"53e7b6f7-4ca6-4cc2-9195-01c0c77cf2ac"},{"effect":{"id":"acdbe169-0274-4c2a-ac62-646fda574dc8","name":"two-way-dentent-lib","date":{"created":1632060005219,"modified":1633470680041,"changed":false},"type":0,"rotation":"dependent","paths":[{"id":"cf9687e4-8cb7-4381-8427-3a0149f3f55e","nodes":[{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":"17e2d46a-94c1-4422-9a65-b444198f29c7","type":"cp","pos":{"x":80,"y":0},"angle":{"x":80,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":null,"type":"node","pos":{"x":100,"y":0},"angle":{"x":100,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"12c6cded-7921-4068-92b0-febc0116f194","cp":"b7bca219-ad12-4ea5-a7a1-886ba8d6f132","type":"cp","pos":{"x":120,"y":0},"angle":{"x":120,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":"b0467dd4-4073-49b1-927c-05eca22ab251","type":"cp","pos":{"x":120,"y":80},"angle":{"x":120,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":null,"type":"node","pos":{"x":140,"y":80},"angle":{"x":140,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"0045d2d8-795d-497d-9d28-d2b72940afe4","cp":"7ab3e4ef-9cd9-4730-a3fe-a728d5e974c4","type":"cp","pos":{"x":160,"y":80},"angle":{"x":160,"y":80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":"d495cc9e-03a9-4439-9ab4-42a3ed759e97","type":"cp","pos":{"x":160,"y":0},"angle":{"x":160,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":null,"type":"node","pos":{"x":180,"y":0},"angle":{"x":180,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"9a98dc29-e453-4352-b6dc-8bee44a03c10","cp":"307ebf16-e513-4d60-b98c-ba9b10785a2b","type":"cp","pos":{"x":200,"y":0},"angle":{"x":200,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":"8d7853c8-6c91-4d7e-a610-19cff40c7cb9","type":"cp","pos":{"x":190,"y":-80},"angle":{"x":190,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":null,"type":"node","pos":{"x":220,"y":-80},"angle":{"x":220,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"5a263115-b0c6-4781-bf5e-bce22acaf7dd","cp":"d03b6020-f331-48d5-b711-0717f6dbfb13","type":"cp","pos":{"x":250,"y":-80},"angle":{"x":250,"y":-80},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":"9f2a35e1-4f4b-41ca-b76c-a5486cd4c27c","type":"cp","pos":{"x":240,"y":0},"angle":{"x":240,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":null,"type":"node","pos":{"x":260,"y":0},"angle":{"x":260,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"},{"id":"8f4b98e6-43aa-4902-b21a-c0e7b6af5c19","cp":"923908b8-8ec3-4fca-b599-5ecf7db23a3e","type":"cp","pos":{"x":280,"y":0},"angle":{"x":280,"y":0},"path":"cf9687e4-8cb7-4381-8427-3a0149f3f55e"}],"box":{"left":100,"width":160,"top":80,"height":160.00000000000003,"right":260,"bottom":-80.00000000000003},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":-100,"end":100},"size":{"x":100,"y":80,"width":160,"height":160.00000000000003,"top":80,"bottom":-80.00000000000003},"storedIn":"library"},"id":"1b2a0175-08d4-4676-a175-143e826de5c9"},{"effect":{"id":"9956ffe4-be15-4139-b685-8ee512df3091","name":"sharp-lib","date":{"created":1632088578127,"modified":1633470674491,"changed":false},"type":1,"rotation":"dependent","paths":[{"id":"867fd156-eddb-4179-bc19-88469670a2c1","nodes":[{"id":"588cb57a-1477-4f14-91c8-3bb92fb70ea7","cp":null,"type":"node","pos":{"x":140,"y":0},"angle":{"x":170.15047879616964,"y":0},"path":"867fd156-eddb-4179-bc19-88469670a2c1"},{"id":"675354fc-b536-4ef7-aa60-8319e2df9f65","cp":null,"type":"node","pos":{"x":180,"y":80},"angle":{"x":180,"y":80},"path":"867fd156-eddb-4179-bc19-88469670a2c1"},{"id":"547a6841-5c05-45ca-9587-49b4c41a4984","cp":null,"type":"node","pos":{"x":220,"y":0},"angle":{"x":189.6032831737346,"y":0},"path":"867fd156-eddb-4179-bc19-88469670a2c1"}],"box":{"left":140,"width":80.00000000000003,"top":80,"height":80,"right":220.00000000000003,"bottom":0},"lock":false}],"grid":{"snap":true,"visible":true,"settings":{"spacingX":20,"spacingY":20,"subDivisionsX":2,"subDivisionsY":2,"color":{"name":"Light gray","hash":"#666666"}},"translation":1,"xUnit":{"name":"deg","PR":360},"yUnit":{"name":"%","PR":100},"guides":[],"guidesVisible":true,"lockGuides":false},"scale":null,"colors":[{"name":"Blue","hash":"#003fc1"},{"name":"LightBlue","hash":"#9bbef5"}],"range":{"start":0,"end":360},"range_y":{"start":0,"end":100},"size":{"x":140,"y":80,"width":80.00000000000003,"height":80,"top":80,"bottom":0},"storedIn":"library"},"id":"5e508142-5203-4534-b687-d9d17f2ea69f"}]';

    const libEffectArray = JSON.parse(JSON_data);

    setTimeout(() => {
      for (const effect of libEffectArray) {
        this.effectLibrary.push(effect);
      }
      this.store();
    }, 500);
  }



}
