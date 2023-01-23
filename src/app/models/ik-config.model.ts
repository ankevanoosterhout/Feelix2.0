

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
}
