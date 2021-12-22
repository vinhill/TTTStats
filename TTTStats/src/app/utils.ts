import { baseColors as chartjsColors } from 'ng2-charts';

type DiscreteCMDef = number[][];
type ContinuousCMDef = {[key: number]: number[]};

/*Gradients
  See https://stackoverflow.com/questions/28828915/how-set-color-family-to-pie-chart-in-chart-js
  The keys are percentage and the values are the color in a rgba format.
  You can have as many "color stops" (%) as you like.
  0% and 100% is not optional.*/
  const continuousCMaps : {[key: string]: ContinuousCMDef} = {
    cool: {
      0: [255, 255, 255],
      20: [220, 237, 200],
      45: [66, 179, 213],
      65: [26, 39, 62],
      100: [0, 0, 0]
    },
    warm: {
      0: [255, 255, 255],
      20: [254, 235, 101],
      45: [228, 82, 27],
      65: [77, 52, 47],
      100: [0, 0, 0]
    },
    neon: {
      0: [255, 255, 255],
      20: [255, 236, 179],
      45: [232, 82, 133],
      65: [106, 27, 154],
      100: [0, 0, 0]
    },
    score: {
      0: [255, 0, 0],
      100: [0, 255, 0]
    },
  };
  const discreteCMaps : {[key: string]: DiscreteCMDef} = {
    'plotly': [
      [99,110,250],
      [239,85,59],
      [0,204,150],
      [171,99,250],
      [255,161,90],
      [25,211,243],
      [255,102,146],
      [182,232,128],
      [255,151,255],
      [254,203,82],
    ],
    'Set3': [
      [141,211,199],
      [255,255,179],
      [190,186,218],
      [251,128,114],
      [128,177,211],
      [253,180,98],
      [179,222,105],
      [252,205,229],
      [217,217,217],
      [188,128,189],
      [204,235,197],
      [255,237,111],
    ],
    'Safe': [
      [136,204,238],
      [204,102,119],
      [221,204,119],
      [17,119,51],
      [51,34,136],
      [170,68,153],
      [68,170,153],
      [153,153,51],
      [136,34,85],
      [102,17,0],
      [136,136,136]
    ],
    'chartjs': chartjsColors,
  }

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomColor(): number[] {
  return [randInt(0, 255), randInt(0, 255), randInt(0, 255)];
}

export function toHex(c: number[]) : string {
  return "#" + c.map(x => x.toString(16).padStart(2, "0")).join("");
}

function getContinuousColormap(palette: string, num: number) : string[] {
  if (!continuousCMaps.hasOwnProperty(palette)) {
    throw new Error('Unknown palette: ' + palette);
  }
  var cmap = continuousCMaps[palette];
  var stops = Object.keys(cmap).map(x => parseInt(x));

  //Calculate colors
  var chartColors : string[] = [];
  for (let i = 0; i < num; i++) {
     //Find where to get a color from a gradient [0-100]
      var colorIdx = (i + 1) * (100 / (num + 1));
      for (let stopNum = 0; stopNum < stops.length; stopNum++) {
        let stopIdx = stops[stopNum];
        if (colorIdx === stopIdx) {
          //Exact match with a gradient key - just get that color
          chartColors[i] = toHex(cmap[stopIdx]);
          break;
        }
        else if (colorIdx < stopIdx) {
          //It's somewhere between this gradient key and the previous
          var prevIdx = stops[stopNum - 1];
          // proportion of current stop, (1-proportion) of previous stop
          var proportion = (stopIdx - colorIdx) / (stopIdx - prevIdx);
          var color: number[] = [];
          for (let k = 0; k < 3; k++) {
            color[k] = Math.round( cmap[stopIdx][k] * proportion + cmap[prevIdx][k] * (1 - proportion) );
          }
          chartColors[i] = toHex(color);
          break;
        }
        // else continue
      }
  }

  return chartColors;
}

function getDiscreteColormap(palette: string, num: number, overflow: string = "random"): string[] {
  if (!discreteCMaps.hasOwnProperty(palette))
    throw new Error('Unknown palette: ' + palette);
  var cmap = discreteCMaps[palette];

  let res = cmap.slice(0, num);

  for (let i = res.length; i < num; i++) {
    switch (overflow) {
      case "random":
        res.push(randomColor());
        break;
      case "repeat":
        res.push(res[i % res.length]);
        break;
      default:
        throw new Error(`Not enough colors in discrete palette and unknown overflow handling "${overflow}"`);
    }
  }

  return res.map(x => toHex(x));
}

export function getColormap(palette: string, num: number) : string[] {
  if (discreteCMaps.hasOwnProperty(palette))
    return getDiscreteColormap(palette, num);
  else
    return getContinuousColormap(palette, num);
}

/*
 * Limits the call frequency of an function.
 * 
 * The given function will only be called
 * every exec_cooldown milliseconds.
 * 
 * If a call is requested during the cooldown,
 * it will be executed afterwards
 * and all additional calls are ignored.
 */
export class ExecLimiter {
  private func: () => void;
  
  private lastExec: number;
  private pending: boolean;

  private exec_cooldown: number;

  constructor(func: () => void, exec_cooldown: number = 200) {
    this.exec_cooldown = exec_cooldown;
    this.func = func;
    this.lastExec = 0;
    this.pending = false;
  }

  public requestExec() {
    if (Date.now() - this.lastExec >= this.exec_cooldown) {
      this.doExec();
    }else if (!this.pending) {
      this.pending = true;
      setTimeout(() => {
				if (this.pending && Date.now() - this.lastExec >= this.exec_cooldown)
					this.doExec();
      }, this.exec_cooldown - (Date.now() - this.lastExec) );
    }
    // else: already pending
  }

  public doExec() {
    this.lastExec = Date.now();
    this.pending = false;
    this.func();
  }
}

export function strcmp(str1: string, str2: string) {
  return str1 < str2 ? -1 : +(str1 > str2);
}

export function round(num: number, digits: number) {
  return Math.round(num * 10 ** digits) / 10 ** digits;
}

export function range(from: number, to: number, step: number = 1) : number[] {
  var arr = [];
  for (var i = from; i <= to; i += step) {
    arr.push(i);
  }
  return arr;
}

export function deepcopy(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}