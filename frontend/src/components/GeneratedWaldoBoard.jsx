import { useMemo, useState } from "react";
import "./GeneratedWaldoBoard.css";

const BOARD_WIDTH = 1200;
const BOARD_HEIGHT = 720;
const MIN_OBJECTS = 200;
const MAX_OBJECTS = 500;
const MIN_SIZE = 10;
const MAX_SIZE = 40;

const SHAPES = ["circle", "square", "triangle", "block"];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomColor = () => {
  const r = randomInt(40, 240);
  const g = randomInt(40, 240);
  const b = randomInt(40, 240);
  return `rgb(${r}, ${g}, ${b})`;
};

const getOverlapArea = (a, b) => {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
};

const canPlaceRect = (candidate, existing) => {
  for (const item of existing) {
    const overlap = getOverlapArea(candidate, item);
    if (!overlap) {
      continue;
    }

    const smallerArea = Math.min(candidate.width * candidate.height, item.width * item.height);

    // Allow slight overlap, but reject heavy stacking.
    if (overlap > smallerArea * 0.35) {
      return false;
    }
  }

  return true;
};

const createRandomObject = () => {
  const size = randomInt(MIN_SIZE, MAX_SIZE);
  const shape = SHAPES[randomInt(0, SHAPES.length - 1)];

  return {
    id: `${Date.now()}-${Math.random()}`,
    shape,
    width: size,
    height: size,
    x: randomInt(0, BOARD_WIDTH - size),
    y: randomInt(0, BOARD_HEIGHT - size),
    color: randomColor(),
  };
};

const createWaldoRect = () => {
  const width = 24;
  const height = 34;

  return {
    x: randomInt(0, BOARD_WIDTH - width),
    y: randomInt(0, BOARD_HEIGHT - height),
    width,
    height,
  };
};

const buildScene = () => {
  const count = randomInt(MIN_OBJECTS, MAX_OBJECTS);
  const placed = [];

  for (let i = 0; i < count; i += 1) {
    let candidate = null;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const tryObject = createRandomObject();
      if (canPlaceRect(tryObject, placed)) {
        candidate = tryObject;
        break;
      }
    }

    if (!candidate) {
      candidate = createRandomObject();
    }

    placed.push(candidate);
  }

  let waldoCandidate = createWaldoRect();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    waldoCandidate = createWaldoRect();
    if (canPlaceRect(waldoCandidate, placed)) {
      break;
    }
  }

  return {
    objects: placed,
    waldo: waldoCandidate,
  };
};

function GeneratedWaldoBoard() {
  const [scene] = useState(buildScene);
  const [found, setFound] = useState(false);

  const { objects, waldo } = scene;

  const statusText = useMemo(() => {
    if (found) {
      return "You found Waldo.";
    }

    return "Find Waldo in the generated scene.";
  }, [found]);

  const handleBoardClick = (event) => {
    if (!waldo || found) {
      return;
    }

    const boardRect = event.currentTarget.getBoundingClientRect();
    const scaleX = BOARD_WIDTH / boardRect.width;
    const scaleY = BOARD_HEIGHT / boardRect.height;

    const clickX = (event.clientX - boardRect.left) * scaleX;
    const clickY = (event.clientY - boardRect.top) * scaleY;

    const withinX = clickX >= waldo.x && clickX <= waldo.x + waldo.width;
    const withinY = clickY >= waldo.y && clickY <= waldo.y + waldo.height;

    if (withinX && withinY) {
      setFound(true);
    }
  };

  return (
    <section className="generated-waldo-wrap">
      <header className="generated-waldo-header">
        <h2>Generated Waldo Scene</h2>
        <p>{statusText}</p>
      </header>

      <div
        className="generated-waldo-board"
        onClick={handleBoardClick}
      >
        {objects.map((item) => {
          const style = {
            left: `${(item.x / BOARD_WIDTH) * 100}%`,
            top: `${(item.y / BOARD_HEIGHT) * 100}%`,
            width: `${(item.width / BOARD_WIDTH) * 100}%`,
            height: `${(item.height / BOARD_HEIGHT) * 100}%`,
            backgroundColor: item.color,
          };

          if (item.shape === "circle") {
            style.borderRadius = "50%";
          }

          if (item.shape === "triangle") {
            style.clipPath = "polygon(50% 0, 0 100%, 100% 100%)";
          }

          if (item.shape === "block") {
            style.borderRadius = "2px";
          }

          return <div key={item.id} className="scene-object" style={style} />;
        })}

        {waldo ? (
          <div
            className={`waldo ${found ? "waldo-found" : ""}`}
            style={{
              left: `${(waldo.x / BOARD_WIDTH) * 100}%`,
              top: `${(waldo.y / BOARD_HEIGHT) * 100}%`,
              width: `${(waldo.width / BOARD_WIDTH) * 100}%`,
              height: `${(waldo.height / BOARD_HEIGHT) * 100}%`,
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

export default GeneratedWaldoBoard;
