import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 720;
const WALDO_BODY_WIDTH = 80;
const WALDO_BODY_HEIGHT = 120;
const HEAD_RADIUS = 18;
const HAT_HEIGHT = 18;

const pickRandomPosition = (positions, canvasWidth, canvasHeight) => {
  const validPositions = positions.filter((position) => (
    Number.isFinite(position.x)
    && Number.isFinite(position.y)
    && position.x >= 0
    && position.y >= 0
    && position.x + WALDO_BODY_WIDTH <= canvasWidth
    && position.y + WALDO_BODY_HEIGHT <= canvasHeight
    && position.y - (HEAD_RADIUS * 2 + HAT_HEIGHT) >= 0
  ));

  if (validPositions.length === 0) {
    return null;
  }

  return validPositions[Math.floor(Math.random() * validPositions.length)];
};

const drawWaldo = (context, waldoTopLeft) => {
  const { x, y } = waldoTopLeft;
  const width = WALDO_BODY_WIDTH;
  const height = WALDO_BODY_HEIGHT;

  // Body with alternating red/white horizontal stripes.
  const stripeCount = 8;
  const stripeHeight = height / stripeCount;
  for (let index = 0; index < stripeCount; index += 1) {
    context.fillStyle = index % 2 === 0 ? "#d71920" : "#ffffff";
    context.fillRect(x, y + index * stripeHeight, width, stripeHeight);
  }

  context.strokeStyle = "#111111";
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);

  // Head.
  const headRadius = HEAD_RADIUS;
  const headCenterX = x + width / 2;
  const headCenterY = y - headRadius;
  context.fillStyle = "#f3c6a4";
  context.beginPath();
  context.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Glasses.
  const eyeOffset = headRadius * 0.5;
  const lensRadius = Math.max(3, headRadius * 0.28);
  context.beginPath();
  context.arc(headCenterX - eyeOffset, headCenterY, lensRadius, 0, Math.PI * 2);
  context.arc(headCenterX + eyeOffset, headCenterY, lensRadius, 0, Math.PI * 2);
  context.moveTo(headCenterX - eyeOffset + lensRadius, headCenterY);
  context.lineTo(headCenterX + eyeOffset - lensRadius, headCenterY);
  context.stroke();

  // Hat (small red triangle).
  const hatHeight = HAT_HEIGHT;
  context.fillStyle = "#d71920";
  context.beginPath();
  context.moveTo(headCenterX, headCenterY - headRadius - hatHeight);
  context.lineTo(headCenterX - headRadius * 0.8, headCenterY - headRadius * 0.2);
  context.lineTo(headCenterX + headRadius * 0.8, headCenterY - headRadius * 0.2);
  context.closePath();
  context.fill();
  context.stroke();
};

function GeneratedWaldoBoard({
  positions,
  canvasWidth = DEFAULT_WIDTH,
  canvasHeight = DEFAULT_HEIGHT,
}) {
  const canvasRef = useRef(null);
  const [found, setFound] = useState(false);

  const waldoPosition = useMemo(
    () => pickRandomPosition(positions || [], canvasWidth, canvasHeight),
    [canvasHeight, canvasWidth, positions],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#0f0f0f";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (waldoPosition) {
      drawWaldo(context, waldoPosition);
    }
  }, [canvasHeight, canvasWidth, waldoPosition]);

  const handleCanvasClick = (event) => {
    if (!waldoPosition || found) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    const insideX = clickX >= waldoPosition.x && clickX <= waldoPosition.x + WALDO_BODY_WIDTH;
    const insideY = clickY >= waldoPosition.y && clickY <= waldoPosition.y + WALDO_BODY_HEIGHT;

    if (insideX && insideY) {
      setFound(true);
    }
  };

  return (
    <section>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        style={{ width: "100%", maxWidth: `${canvasWidth}px`, border: "1px solid #222", display: "block" }}
      />
      <p>
        {found
          ? "You found Waldo."
          : waldoPosition
            ? "Find Waldo."
            : "No valid Waldo position fits inside the canvas."}
      </p>
    </section>
  );
}

export default GeneratedWaldoBoard;
