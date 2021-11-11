import { Mediator } from "./mediator";
import { px, setNodeStyle, translate3d } from "./utils";

const DROP_AREA_IDS = ['drop-area-a', 'drop-area-b'];
const DROP_AREAS = DROP_AREA_IDS.map(id => document.getElementById(id));

/**
 * Findout if there's a drop area below mouse position
 *
 * @param {object} evt
 * @param {number} evt.clientX
 * @param {number} evt.clientY
 * @returns {undefined|HTMLElement} - return the element if found
 */
function getDropAreaBelow(evt) {
  const dropArea = DROP_AREAS.find(dropArea => {
    const rect = dropArea.getBoundingClientRect();
    return (evt.clientX > rect.x
      && evt.clientX < rect.x + rect.width
      && evt.clientY > rect.y
      && evt.clientY < rect.y + rect.height
    );
  });
  return dropArea;
}

function reset(mediator) {
  document.removeEventListener("mousemove", mediator.receive);
  document.removeEventListener("mouseup", mediator.receive);
  mediator.setState("idle");
}

function defaultDragImage(node) {
  const clone = node.cloneNode(true);
  setNodeStyle(clone, {
    willChange: "transform",
    position: "fixed",
    pointerEvents: "none",
    top: 0,
    left: 0,
    opacity: 0.5,
  });
  return clone;
}

function defaultDropShadow(node) {
  const clone = node.cloneNode(true);
  setNodeStyle(clone, {
    opacity: 0.5,
  });
  return clone;
}

let cachedCurrentTarget;
let cachedOffsetCoords;
let cachedDragImage;
let dropShadow;
let initialDropArea;
let dropAreaCandidate;

const dndMediator = new Mediator("idle", {
  idle: {
    async mousedown(evt) {
      evt.preventDefault();
      evt.stopPropagation();

      cachedCurrentTarget = evt.currentTarget;
      const rect = cachedCurrentTarget.getBoundingClientRect();
      const offsetX = evt.clientX - rect.left;
      const offsetY = evt.clientY - rect.top;
      cachedOffsetCoords = [offsetX, offsetY];
      cachedDragImage = defaultDragImage(cachedCurrentTarget);
      dropShadow = defaultDropShadow(cachedCurrentTarget);
      initialDropArea = cachedCurrentTarget.parentElement;
      dropAreaCandidate = initialDropArea;
      dropAreaCandidate.appendChild(dropShadow);

      setNodeStyle(cachedDragImage, {
        transform: translate3d(rect.left, rect.top),
        width: px(rect.width),
        height: px(rect.height),
      });

      document.addEventListener("mousemove", dndMediator.receive);
      document.addEventListener("mouseup", dndMediator.receive);

      dndMediator.setState("dragging");

      await Promise.resolve();
      cachedCurrentTarget.parentElement.removeChild(cachedCurrentTarget);
      document.body.appendChild(cachedDragImage);
    },
  },
  dragging: {
    mousemove(evt) {
      setNodeStyle(cachedDragImage, {
        transform: translate3d(
          evt.clientX - cachedOffsetCoords[0],
          evt.clientY - cachedOffsetCoords[1]
        ),
      });
      const dropArea = getDropAreaBelow(evt) || initialDropArea;
      if (dropArea === dropAreaCandidate) return;
      dropAreaCandidate = dropArea;
      dropAreaCandidate.appendChild(dropShadow);
    },
    mouseup(evt) {
      reset(dndMediator);
      dndMediator.setState("idle");
      dropAreaCandidate.appendChild(cachedCurrentTarget);
      dropAreaCandidate.removeChild(dropShadow);
      const targetRect = cachedCurrentTarget.getBoundingClientRect();
      setNodeStyle(cachedDragImage, {
        transform: translate3d(
          targetRect.x,
          targetRect.y,
        ),
        transition: 'transform 0.3s',
      });
      cachedDragImage.ontransitionend = () => {
        document.body.removeChild(cachedDragImage);
      };
    },
  },
});

export function onDrag(evt) {
  dndMediator.receive(evt);
}
