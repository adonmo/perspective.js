var canvas = document.getElementById("canvas");
var image = new Image();

function setElementPosition(element, x, y) {
  Object.assign(element.style, { left: `${x}px`, top: `${y}px` });
}

function setHandlePosition(name, x, y) {
  setElementPosition(document.getElementById(name), x, y);
}

function getHandlePosition(name) {
  var el = document.getElementById(name);
  // This only works when the values are indeed pixels
  return [parseInt(el.style.left), parseInt(el.style.top)];
}

function beginMoving(element, relativeTo, onMove) {
  const moveHandler = (event) => {
    var relativeRect = relativeTo.getBoundingClientRect();
    var relX = event.clientX - relativeRect.left;
    var relY = event.clientY - relativeRect.top;
    setElementPosition(element, relX, relY);
    onMove && onMove(element, relX, relY);
  };
  window.addEventListener("mousemove", moveHandler);
  window.addEventListener("mouseup", () => {
    window.removeEventListener("mousemove", moveHandler);
  });
}

function init() {
  var width = image.width;
  var height = image.height;
  canvas.width = width + 30;
  canvas.height = height + 50;
  setHandlePosition("tl", 30, 30);
  setHandlePosition("tr", width - 50, 50);
  setHandlePosition("br", width - 70, height - 30);
  setHandlePosition("bl", 10, height);
  draw();
  let wrapper = document.getElementById("wrapper");
  wrapper.addEventListener("mousedown", (event) => {
    if (
      event.target instanceof HTMLDivElement &&
      event.target.classList.contains("handle")
    ) {
      beginMoving(event.target, wrapper, () => draw());
    }
  });
}

function draw() {
  var ctx = canvas.getContext("2d");
  var p = new Perspective(ctx, image);
  var [topLeftX, topLeftY] = getHandlePosition("tl");
  var [topRightX, topRightY] = getHandlePosition("tr");
  var [bottomLeftX, bottomLeftY] = getHandlePosition("bl");
  var [bottomRightX, bottomRightY] = getHandlePosition("br");
  p.draw({
    topLeftX,
    topLeftY,
    topRightX,
    topRightY,
    bottomRightX,
    bottomRightY,
    bottomLeftX,
    bottomLeftY,
  });
  // setTimeout(draw, 1000);
}

image.src = "firefox.jpg";
image.onload = init;
