/*!
Copyright 2021 Adonmo  https://www.adonmo.com/
Copyright 2010 futomi  http://www.html5.jp/

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This file was modified by Fabien LOISON <http://www.flozz.fr/>

This file was further modified by Adonmo https://www.adonmo.com/
*/

export interface Quadrilateral {
  topLeftX: number;
  topLeftY: number;
  topRightX: number;
  topRightY: number;
  bottomRightX: number;
  bottomRightY: number;
  bottomLeftX: number;
  bottomLeftY: number;
}


function createCanvasContext(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return canvas.getContext("2d")!;
}

function applyMask(ctx: CanvasRenderingContext2D, {
  bottomLeftX,
  bottomLeftY,
  bottomRightX,
  bottomRightY,
  topLeftX,
  topLeftY,
  topRightX,
  topRightY
}: Quadrilateral): void {
  ctx.beginPath();
  ctx.moveTo(topLeftX, topLeftY);
  ctx.lineTo(topRightX, topRightY);
  ctx.lineTo(bottomRightX, bottomRightY);
  ctx.lineTo(bottomLeftX, bottomLeftY);
  ctx.closePath();
  ctx.globalCompositeOperation = "destination-in";
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function drawSlice(
  originalCanvas: HTMLCanvasElement,
  tempContext: CanvasRenderingContext2D,
  targetContext: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  ag: number,
  sc: number,
) {
  tempContext.setTransform(1, 0, 0, 1, tx, ty);
  tempContext.drawImage(originalCanvas, 0, 0);
  targetContext.translate(sx, sy);
  targetContext.rotate(ag);
  targetContext.scale(sc, sc);
  targetContext.drawImage(tempContext.canvas, 0, 0);
  targetContext.setTransform(1, 0, 0, 1, 0, 0);
}

function drawSlices(
  originalCanvas: HTMLCanvasElement,
  tempContext: CanvasRenderingContext2D,
  transformedContext: CanvasRenderingContext2D,
  isYDirection: boolean,
  width: number,
  height: number,
  step: number,
  sx0: number,
  sx1: number,
  sy0: number,
  sy1: number,
  ex0: number,
  ex1: number,
  ey0: number,
  ey1: number,
): void {
  const extent = (isYDirection ? height : width);
  for (let i = 0; i < extent; i += step) {
    const r = i / extent;
    const sx = sx0 + (sx1 - sx0) * r;
    const sy = sy0 + (sy1 - sy0) * r;
    const ex = ex0 + (ex1 - ex0) * r;
    const ey = ey0 + (ey1 - ey0) * r;
    const ag = isYDirection ? Math.atan((ey - sy) / (ex - sx)) : Math.atan((sx - ex) / (ey - sy));
    const sc = Math.hypot(ex - sx, ey - sy) / width;
    const tx = isYDirection ? 0 : -i;
    const ty = isYDirection ? -i : 0;
    drawSlice(originalCanvas, tempContext, transformedContext, tx, ty, sx, sy, ag, sc);
  }
}

export default class Perspective {
  // Context for destination (output will go here)
  private readonly destinationContext: CanvasRenderingContext2D;

  // Canvas for original image
  private readonly originalCanvas: HTMLCanvasElement;

  // Context for transformed image
  private readonly transformedContext: CanvasRenderingContext2D;

  constructor(destinationContext: CanvasRenderingContext2D, image: HTMLImageElement) {
    // check the arguments
    if (!destinationContext || !destinationContext.strokeStyle || !image || !image.width || !image.height) {
      throw new Error("Invalid arguments");
    }
    this.destinationContext = destinationContext;
    // prepare a <canvas> for the image
    const cvso = document.createElement("canvas");
    cvso.width = Math.round(image.width);
    cvso.height = Math.round(image.height);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctxo = cvso.getContext("2d")!;
    ctxo.drawImage(image, 0, 0, cvso.width, cvso.height);
    this.originalCanvas = cvso;
    // prepare a <canvas> for the transformed image
    this.transformedContext = createCanvasContext(destinationContext.canvas.width, destinationContext.canvas.height);
  }

  public draw(q: Quadrilateral, step = 2): void {
    const {
      topLeftX,
      topLeftY,
      topRightX,
      topRightY,
      bottomRightX,
      bottomRightY,
      bottomLeftX,
      bottomLeftY,
    } = q;

    // compute the dimension of each side
    const dims = [
      Math.hypot(topLeftX - topRightX, topLeftY - topRightY), // top side
      Math.hypot(topRightX - bottomRightX, topRightY - bottomRightY), // right side
      Math.hypot(bottomRightX - bottomLeftX, bottomRightY - bottomLeftY), // bottom side
      Math.hypot(bottomLeftX - topLeftX, bottomLeftY - topLeftY), // left side
    ];
    const { width, height } = this.originalCanvas;
    // specify the index of which dimension is longest
    let base_index = 0;
    let max_scale_rate = 0;
    let zero_num = 0;
    for (let i = 0; i < 4; i++) {
      const dim = dims[i];
      const rate = i % 2 ? dim / width : dim / height;
      if (rate > max_scale_rate) {
        base_index = i;
        max_scale_rate = rate;
      }
      if (dim == 0) {
        zero_num++;
      }
    }
    if (zero_num > 1) {
      return;
    }
    const coverStep = step * 5;
    const { originalCanvas, transformedContext, destinationContext } = this;
    transformedContext.clearRect(0, 0, transformedContext.canvas.width, transformedContext.canvas.height);
    if (base_index % 2 == 0) {
      // top or bottom side
      const ctxl = createCanvasContext(width, coverStep);
      ctxl.globalCompositeOperation = "copy";
      drawSlices(originalCanvas, ctxl, transformedContext, true, width, height, step, topLeftX, bottomLeftX, topLeftY, bottomLeftY, topRightX, bottomRightX, topRightY, bottomRightY);
    } else {
      // right or left side
      const ctxl = createCanvasContext(coverStep, height);
      ctxl.globalCompositeOperation = "copy";
      drawSlices(originalCanvas, ctxl, transformedContext, false, width, height, step, topLeftX, topRightX, topLeftY, topRightY, bottomLeftX, bottomRightX, bottomLeftY, bottomRightY);
    }
    // set a clipping path and draw the transformed image on the destination canvas.
    destinationContext.save();
    destinationContext.drawImage(transformedContext.canvas, 0, 0);
    applyMask(destinationContext, q);
    destinationContext.restore();
  }
}
