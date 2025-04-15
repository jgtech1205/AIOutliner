declare module 'potrace' {
    interface PotraceOptions {
      threshold?: number;
      turdSize?: number;
      turnPolicy?: string;
      alphaMax?: number;
      optCurve?: boolean;
      optTolerance?: number;
      blackOnWhite?: boolean;
      color?: string;
      background?: string;
    }
  
    type Callback = (err: Error | null, svg: string) => void;
  
    export class Potrace {
      constructor(options?: PotraceOptions);
      loadImage(image: Buffer | string, callback: Callback): void;
    }
  }
  