// Paper.ts --- A virtually infinite canvas surface
// Author: katahiromz, Improved by Gemini
// License: MIT

"use strict";

class Paper {
  static g_sizingOnly: boolean = false;
  static g_minimal: boolean = false;

  canvas: HTMLCanvasElement;
  originX: number;
  originY: number;
  cx: number;
  cy: number;
  bgColor: string;
  lineWidth: number;
  strokeStyle: string;
  fillStyle: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;

  constructor(width_: number = 1, height_: number = 1, bgColor_: string = 'white') {
    this.canvas = document.createElement('canvas');
    this.originX = 0;
    this.originY = 0;
    this.cx = 0;
    this.cy = 0;
    this.bgColor = bgColor_;
    this.lineWidth = 1.0;
    this.strokeStyle = "#000";
    this.fillStyle = "#000";
    this.font = "16px sans-serif";
    this.textAlign = "left"; // "left", "right", "center", "start", "end"
    this.textBaseline = "alphabetic"; // "top", "hanging", "middle", "alphabetic", "ideographic", "bottom"
    this.setSize(width_, height_);
  }

  setSize(width_: number, height_: number): this {
    if (width_ <= 0 || height_ <= 0) return this;
    this.cx = width_;
    this.cy = height_;
    this.canvas.width = width_;
    this.canvas.height = height_;
    this.clear();
    return this;
  }

  clear(): this {
    const ctx = this.canvas.getContext('2d')!;
    if (this.bgColor) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, this.cx, this.cy);
    } else {
      ctx.clearRect(0, 0, this.cx, this.cy);
    }
    return this;
  }

  // Get a canvas context adjusted for the current origin offset
  getContext(contentType: '2d' = '2d', options: CanvasRenderingContext2DSettings = {}): CanvasRenderingContext2D {
    const ctx = this.canvas.getContext(contentType, options)!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(-this.originX, -this.originY);
    return ctx;
  }

  // Coordinate transforms
  translateX(x: number): number { return x - this.originX; }
  untranslateX(x: number): number { return x + this.originX; }
  translateY(y: number): number { return y - this.originY; }
  untranslateY(y: number): number { return y + this.originY; }
  translate(x: number, y: number): [number, number] { return [this.translateX(x), this.translateY(y)]; }
  untranslate(x: number, y: number): [number, number] { return [this.untranslateX(x), this.untranslateY(y)]; }

  // Center point
  centerPoint(trans: boolean = false): [number, number] {
    if (trans) return this.translate(this.cx / 2, this.cy / 2);
    return [this.cx / 2, this.cy / 2];
  }

  // Expand the canvas to ensure the given rectangle fits within it
  ensureRect(x: number, y: number, w: number, h: number): this {
    // 1. Compute the bounding box of the area to be drawn
    let x0 = Math.min(x, x + w), y0 = Math.min(y, y + h);
    let x1 = Math.max(x, x + w), y1 = Math.max(y, y + h);

    const left = Math.floor(x0), top = Math.floor(y0);
    const right = Math.ceil(x1), bottom = Math.ceil(y1);

    const curLeft = this.originX, curRight = this.originX + this.cx;
    const curTop = this.originY, curBottom = this.originY + this.cy;

    // If the area already fits within the current bounds, do nothing
    if (left >= curLeft && right <= curRight && top >= curTop && bottom <= curBottom)
      return this;

    // 2. Calculate the new bounds
    const buffer = (Paper.g_minimal ? 0 : 128);

    // Only add a buffer in directions where the bounds are being exceeded
    const newLeft   = (left < curLeft)     ? (left - buffer)   : curLeft;
    const newRight  = (right > curRight)   ? (right + buffer)  : curRight;
    const newTop    = (top < curTop)       ? (top - buffer)    : curTop;
    const newBottom = (bottom > curBottom) ? (bottom + buffer) : curBottom;

    const newWidth = newRight - newLeft;
    const newHeight = newBottom - newTop;

    // 3. Reallocate memory and copy existing content
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cx;
    tempCanvas.height = this.cy;
    tempCanvas.getContext('2d')!.drawImage(this.canvas, 0, 0);

    this.cx = newWidth;
    this.cy = newHeight;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    this.clear(); // Fill with background color

    // 4. Redraw the original content at the new offset position
    const offsetX = curLeft - newLeft;
    const offsetY = curTop - newTop;
    this.canvas.getContext('2d')!.drawImage(tempCanvas, offsetX, offsetY);

    this.originX = newLeft;
    this.originY = newTop;

    return this;
  }

  drawImage(image: Paper | HTMLImageElement | HTMLCanvasElement, ...args: number[]): this {
    let sx: number, sy: number, sW: number, sH: number, dx: number, dy: number, dW: number, dH: number;
    const img = (image instanceof Paper) ? image.canvas : image;

    if (args.length === 2) { // dx, dy
      [dx, dy] = args;
      [sx, sy, sW, sH, dW, dH] = [0, 0, img.width, img.height, img.width, img.height];
    } else if (args.length === 4) { // dx, dy, dw, dh
      [dx, dy, dW, dH] = args;
      [sx, sy, sW, sH] = [0, 0, img.width, img.height];
    } else {
      [sx, sy, sW, sH, dx, dy, dW, dH] = args;
    }

    this.ensureRect(dx, dy, dW, dH);
    if (!Paper.g_sizingOnly) {
      this.getContext().drawImage(img, sx, sy, sW, sH, dx, dy, dW, dH);
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number): this {
    const lw = this.lineWidth;
    this.ensureRect(Math.min(x0, x1) - lw, Math.min(y0, y1) - lw, Math.abs(x1 - x0) + lw * 2, Math.abs(y1 - y0) + lw * 2);

    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    return this;
  }

  strokeRect(x: number, y: number, w: number, h: number): this {
    const lw = this.lineWidth;
    this.ensureRect(x - lw, y - lw, w + lw * 2, h + lw * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.strokeRect(x, y, w, h);
    }
    return this;
  }

  fillRect(x: number, y: number, w: number, h: number): this {
    this.ensureRect(x, y, w, h);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.fillStyle = this.fillStyle;
      ctx.fillRect(x, y, w, h);
    }
    return this;
  }

  strokeCircle(x: number, y: number, radius: number): this {
    const lw = this.lineWidth;
    const r = radius + lw;
    this.ensureRect(x - r, y - r, r * 2, r * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    return this;
  }

  fillCircle(x: number, y: number, radius: number): this {
    this.ensureRect(x - radius, y - radius, radius * 2, radius * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.fillStyle = this.fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return this;
  }

  // Draw text
  fillText(text: string, x: number, y: number, maxWidth: number | undefined = undefined): this {
    const ctx = this.getContext();
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 1. Measure the rendered text size
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;

    // --- Robust font size extraction ---
    // Use a regex to extract the numeric value from sizes like "30px" or "1.5rem".
    // Fall back to 16px if no match is found.
    const fontSizeMatch = this.font.match(/(\d+(?:\.\d+)?)(px|pt|em|rem|vh|vw|dvh|dvw)/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 16;

    // Adjust the x offset based on text alignment
    let offsetX = 0;
    if (this.textAlign === 'center') offsetX = -textWidth / 2;
    else if (this.textAlign === 'right' || this.textAlign === 'end') offsetX = -textWidth;

    // Adjust the y offset based on text baseline
    let offsetY = -fontSize;
    if (this.textBaseline === 'top') offsetY = 0;
    else if (this.textBaseline === 'middle') offsetY = -fontSize / 2;
    else if (this.textBaseline === 'bottom') offsetY = -fontSize;

    // 2. Reserve space with a small margin
    this.ensureRect(x + offsetX, y + offsetY, textWidth, fontSize * 1.2);

    // 3. Draw the text
    if (!Paper.g_sizingOnly) {
      const drawCtx = this.getContext(); // Re-fetch context in case the canvas was resized
      drawCtx.font = this.font;
      drawCtx.textAlign = this.textAlign;
      drawCtx.textBaseline = this.textBaseline;
      drawCtx.fillStyle = this.fillStyle;
      drawCtx.fillText(text, x, y, maxWidth);
    }
    return this;
  }
}