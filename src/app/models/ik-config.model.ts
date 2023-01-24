
export class DisplaySettings {
  displayModels = true;
  displayIK = false;
}


export class IKConfig {
  solver: any;
  ikHelper: any;
  goal: any;

  ikRoot = null;

  frames: Array<any> = [];
  newFrames: Array<string> = [];
  targetObject: any;
  finalLink: any;

  createRoot = false;

  animate = false;
  iterations = 5;

  screen = new DisplaySettings();


}
