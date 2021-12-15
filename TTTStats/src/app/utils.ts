import { baseColors as chartjsColors } from 'ng2-charts';

export class Colormap {
  private gradient: Map<number, number[]>;

  constructor() {
    this.gradient = new Map<number, number[]>();
  }

  public static fromObject(obj: any): Colormap {
    const cmap = new Colormap();
    for (const key of Object.keys(obj)) {
      cmap.gradient.set(Number(key), obj[key]);
      if (0 > Number(key) || Number(key) > 100) {
        throw new Error(`Invalid cmap stop at ${key}`);
      }
      if (obj[key].length !== 3) {
        throw new Error(`Invalid cmap color ${obj[key]} has to be 3 channel`);
      }
    }
    if (!cmap.gradient.has(0) || !cmap.gradient.has(100)) {
      throw new Error('Colormap must contain stops 0 and 100');
    }
    return cmap;
  }

  public getStops(): number[] {
    return Array.from(this.gradient.keys()).sort((a, b) => a - b);
  }

  public get(step: number): number[] {
    if (this.gradient.has(step)) {
      return this.gradient.get(step)!;
    }
    else {
      throw new Error(`Colormap does not contain step ${step}`);
    }
  }
}

/*Gradients
  See https://stackoverflow.com/questions/28828915/how-set-color-family-to-pie-chart-in-chart-js
  The keys are percentage and the values are the color in a rgba format.
  You can have as many "color stops" (%) as you like.
  0% and 100% is not optional.*/
  var colormaps : {[key: string]: Colormap} = {
    cool: Colormap.fromObject({
      0: [255, 255, 255],
      20: [220, 237, 200],
      45: [66, 179, 213],
      65: [26, 39, 62],
      100: [0, 0, 0]
    }),
    warm:  Colormap.fromObject({
      0: [255, 255, 255],
      20: [254, 235, 101],
      45: [228, 82, 27],
      65: [77, 52, 47],
      100: [0, 0, 0]
    }),
    neon:  Colormap.fromObject({
      0: [255, 255, 255],
      20: [255, 236, 179],
      45: [232, 82, 133],
      65: [106, 27, 154],
      100: [0, 0, 0]
    }),
    score: Colormap.fromObject({
      0: [255, 0, 0],
      100: [0, 255, 0]
    }),
  };

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomColor(): number[] {
  return [randInt(0, 255), randInt(0, 255), randInt(0, 255)];
}

export function toHex(c: number[]) : string {
  return "#" + c.map(x => x.toString(16).padStart(2, "0")).join("");
}

function chartjsColormap(num: number) : string[] {
  var chartColors: string[] = [];
  for (let i = 0; i < num; i++) {
    chartColors[i] = toHex(chartjsColors[i] || randomColor());
  }
  return chartColors
}

function steppedColormap(palette: string, num: number) : string[] {
  if (!colormaps.hasOwnProperty(palette)) {
    throw new Error('Unknown palette: ' + palette);
  }
  var cmap = colormaps[palette];
  var stops = cmap.getStops();

  //Calculate colors
  var chartColors : string[] = [];
  for (let i = 0; i < num; i++) {
     //Find where to get a color from a gradient [0-100]
      var colorIdx = (i + 1) * (100 / (num + 1));
      for (let stopNum = 0; stopNum < stops.length; stopNum++) {
        let stopIdx = stops[stopNum];
        if (colorIdx === stopIdx) {
          //Exact match with a gradient key - just get that color
          chartColors[i] = toHex(cmap.get(stopIdx));
          break;
        }
        else if (colorIdx < stopIdx) {
          //It's somewhere between this gradient key and the previous
          var prevIdx = stops[stopNum - 1];
          // proportion of current stop, (1-proportion) of previous stop
          var proportion = (stopIdx - colorIdx) / (stopIdx - prevIdx);
          var color: number[] = [];
          for (let k = 0; k < 3; k++) {
            color[k] = Math.round( cmap.get(stopIdx)[k] * proportion + cmap.get(prevIdx)[k] * (1 - proportion) );
          }
          chartColors[i] = toHex(color);
          break;
        }
        // else continue
      }
  }

  return chartColors;
}

export function getColormap(palette: string, num: number) : string[] {
  if (palette == "chartjs")
    return chartjsColormap(num);
  else 
    return steppedColormap(palette, num);
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
