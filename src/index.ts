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

interface Quadrilateral {
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
    const ctxo = cvso.getContext("2d");
    ctxo.drawImage(image, 0, 0, cvso.width, cvso.height);
    this.originalCanvas = cvso;
    // prepare a <canvas> for the transformed image
    this.transformedContext = createCanvasContext(destinationContext.canvas.width, destinationContext.canvas.height);
  }

  draw(q: Quadrilateral) {
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
      Math.sqrt(
        Math.pow(topLeftX - topRightX, 2) + Math.pow(topLeftY - topRightY, 2)
      ), // top side
      Math.sqrt(
        Math.pow(topRightX - bottomRightX, 2) +
        Math.pow(topRightY - bottomRightY, 2)
      ), // right side
      Math.sqrt(
        Math.pow(bottomRightX - bottomLeftX, 2) +
        Math.pow(bottomRightY - bottomLeftY, 2)
      ), // bottom side
      Math.sqrt(
        Math.pow(bottomLeftX - topLeftX, 2) +
        Math.pow(bottomLeftY - topLeftY, 2)
      ), // left side
    ];
    //
    const ow = this.originalCanvas.width;
    const oh = this.originalCanvas.height;
    // specify the index of which dimension is longest
    let base_index = 0;
    let max_scale_rate = 0;
    let zero_num = 0;
    for (let i = 0; i < 4; i++) {
      let rate = 0;
      if (i % 2) {
        rate = dims[i] / ow;
      } else {
        rate = dims[i] / oh;
      }
      if (rate > max_scale_rate) {
        base_index = i;
        max_scale_rate = rate;
      }
      if (dims[i] == 0) {
        zero_num++;
      }
    }
    if (zero_num > 1) {
      return;
    }
    //
    const step = 2;
    const cover_step = step * 5;
    //
    const originalCanvas = this.originalCanvas;
    const ctxt = this.transformedContext;
    ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
    if (base_index % 2 == 0) {
      // top or bottom side
      const ctxl = createCanvasContext(ow, cover_step);
      ctxl.globalCompositeOperation = "copy";
      const cvsl = ctxl.canvas;
      for (let y = 0; y < oh; y += step) {
        const r = y / oh;
        const sx = topLeftX + (bottomLeftX - topLeftX) * r;
        const sy = topLeftY + (bottomLeftY - topLeftY) * r;
        const ex = topRightX + (bottomRightX - topRightX) * r;
        const ey = topRightY + (bottomRightY - topRightY) * r;
        const ag = Math.atan((ey - sy) / (ex - sx));
        const sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / ow;
        ctxl.setTransform(1, 0, 0, 1, 0, -y);
        ctxl.drawImage(originalCanvas, 0, 0);
        //
        ctxt.translate(sx, sy);
        ctxt.rotate(ag);
        ctxt.scale(sc, sc);
        ctxt.drawImage(cvsl, 0, 0);
        //
        ctxt.setTransform(1, 0, 0, 1, 0, 0);
      }
    } else if (base_index % 2 == 1) {
      // right or left side
      const ctxl = createCanvasContext(cover_step, oh);
      ctxl.globalCompositeOperation = "copy";
      const cvsl = ctxl.canvas;
      for (let x = 0; x < ow; x += step) {
        const r = x / ow;
        const sx = topLeftX + (topRightX - topLeftX) * r;
        const sy = topLeftY + (topRightY - topLeftY) * r;
        const ex = bottomLeftX + (bottomRightX - bottomLeftX) * r;
        const ey = bottomLeftY + (bottomRightY - bottomLeftY) * r;
        const ag = Math.atan((sx - ex) / (ey - sy));
        const sc = Math.sqrt(Math.pow(ex - sx, 2) + Math.pow(ey - sy, 2)) / oh;
        ctxl.setTransform(1, 0, 0, 1, -x, 0);
        ctxl.drawImage(originalCanvas, 0, 0);
        //
        ctxt.translate(sx, sy);
        ctxt.rotate(ag);
        ctxt.scale(sc, sc);
        ctxt.drawImage(cvsl, 0, 0);
        //
        ctxt.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // set a clipping path and draw the transformed image on the destination canvas.
    this.destinationContext.save();
    this.destinationContext.drawImage(ctxt.canvas, 0, 0);
    this._applyMask(this.destinationContext, q);
    this.destinationContext.restore();
  }

  private _applyMask(ctx: CanvasRenderingContext2D, q: Quadrilateral) {
    ctx.beginPath();
    ctx.moveTo(q.topLeftX, q.topLeftY);
    ctx.lineTo(q.topRightX, q.topRightY);
    ctx.lineTo(q.bottomRightX, q.bottomRightY);
    ctx.lineTo(q.bottomLeftX, q.bottomLeftY);
    ctx.closePath();
    ctx.globalCompositeOperation = "destination-in";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
}
