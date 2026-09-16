const pixelsPerHeightUnit = 2.7;
const minimumTargetHeight = 0.01;
const maximumTargetHeight = 2000;
const desiredGridSpacing = 72;
const minimumGridInterval = 1;
const maximumGridInterval = 1000;
const pixelsPerHeightChange = 6;
const zoomFactor = 1.15;
const groundLineScreenBottom = 34;
const desktopTopGap = 32;
const mobileTopGap = 16;
const additionalInitialTopClearance = 48;
const initialTargetGapScreen = 48;

const referencePosition = { x: 180, y: 72 };
let currentReferenceChampion;
let currentTargetChampion;
let targetPosition = { x: 470, y: 72 };
let targetHeight = 1;
let targetHeightHasBeenAdjusted = false;
let cameraZoom = 1;
let roundState = "guessing";
let resultAnchor = { x: 0, y: 72 };
let roundLocked = false;
let activePointerId = null;
let interactionMode = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPosition = { x: 0, y: 0 };
let dragStartHeight = targetHeight;

function renderChampion(champion, characterElement, nameElement) {
  const outlineImage = document.createElement("img");
  const image = document.createElement("img");

  outlineImage.className = "normal-outline-image";
  outlineImage.alt = "";
  outlineImage.setAttribute("aria-hidden", "true");
  outlineImage.src = champion.image;

  image.className = "champion-image normal-champion-image";
  image.alt = champion.name;
  image.addEventListener("error", () => {
    image.style.visibility = "hidden";
    if (typeof renderWorld === "function") {
      finalizeInitialPlacementWhenImagesReady();
      renderWorld();
    }
  });
  image.addEventListener("load", () => {
    image.style.visibility = "visible";
    if (typeof renderWorld === "function") {
      finalizeInitialPlacementWhenImagesReady();
      renderWorld();
    }
  });
  image.src = champion.image;
  image.outlineImage = outlineImage;
  characterElement.append(outlineImage);
  characterElement.append(image);
  if (nameElement) {
    nameElement.textContent = champion.name;
  }

  return image;
}

const gameBoard = document.querySelector(".game-board");
const referenceCharacter = document.querySelector("#reference-character");
const targetCharacter = document.querySelector("#target-character");
const correctRevealOutlineImage = document.querySelector("#correct-reveal-outline");
const correctRevealImage = document.querySelector("#correct-reveal-image");
const heightTooltip = document.querySelector("#height-tooltip");
const referenceHeightTooltip = document.querySelector("#reference-height-tooltip");
const zoomInButton = document.querySelector("#zoom-in-button");
const zoomOutButton = document.querySelector("#zoom-out-button");
const meterLabels = document.querySelector("#meter-labels");
const lockInButton = document.querySelector(".lock-in-button");
const resultPanelTitle = document.querySelector("#result-panel-title");
const resultEmptyState = document.querySelector("#result-empty-state");
const resultSummary = document.querySelector("#result-summary");
const correctHeight = document.querySelector("#correct-height");
const guessedHeight = document.querySelector("#guessed-height");
const accuracyResult = document.querySelector("#accuracy-result");
let referenceImage;
let targetImage;
let initialTargetPlacementPending = false;

function getAvailableChampions() {
  return Object.values(champions).filter(
    (champion) => champion.id !== "training-dummy" && typeof champion.height === "number"
  );
}

function getRandomChampion(excludedChampion) {
  const availableChampions = getAvailableChampions().filter(
    (champion) => champion !== excludedChampion
  );

  return availableChampions[
    Math.floor(Math.random() * availableChampions.length)
  ];
}

function formatHeight(height) {
  return `${height.toFixed(2)} m`;
}

function getDisplayedHeight(gameHeight) {
  return gameHeight * pixelsPerHeightUnit * cameraZoom;
}

function getGroundLineScreenBottom() {
  return groundLineScreenBottom;
}

function getCameraZoomLimits() {
  const availableScalePixels =
    gameBoard.clientHeight - getGroundLineScreenBottom();

  return {
    minimum: availableScalePixels /
      (pixelsPerHeightUnit * maximumGridInterval),
    maximum: availableScalePixels /
      (pixelsPerHeightUnit * minimumGridInterval),
  };
}

function setCharacterPosition(characterElement, position) {
  characterElement.style.left = `${getScaleGutter() + position.x * cameraZoom}px`;
  characterElement.style.bottom = `${getGroundLineScreenBottom()}px`;
}

function getScreenSideMargin() {
  return window.matchMedia("(max-width: 650px)").matches ? 16 : 32;
}

function getScaleGutter() {
  return window.matchMedia("(max-width: 650px)").matches ? 48 : 68;
}

function getImageAspect(image, fallback = 0.5) {
  return image.naturalWidth / image.naturalHeight || fallback;
}

function getWorldImageWidth(gameHeight, image) {
  return gameHeight * pixelsPerHeightUnit * getImageAspect(image);
}

function getTargetCollisionHeight() {
  return targetHeight;
}

function anchorReferenceToLeftEdge() {
  const referenceScreenWidth =
    getDisplayedHeight(currentReferenceChampion.height) *
    getImageAspect(referenceImage);

  referencePosition.x =
    (getScreenSideMargin() + referenceScreenWidth / 2) / cameraZoom;
}

function renderWorld() {
  const pixelsPerMeter = pixelsPerHeightUnit * cameraZoom;
  const gridInterval = getGridInterval(pixelsPerMeter);

  gameBoard.style.setProperty(
    "--grid-size",
    `${gridInterval * pixelsPerMeter}px`
  );
  gameBoard.style.setProperty(
    "--ground-position",
    `${getGroundLineScreenBottom()}px`
  );

  referenceImage.style.height = `${getDisplayedHeight(currentReferenceChampion.height)}px`;
  referenceImage.outlineImage.style.height =
    `${getDisplayedHeight(currentReferenceChampion.height)}px`;
  const displayedTargetHeight =
    targetHeight;

  targetImage.style.height = `${getDisplayedHeight(displayedTargetHeight)}px`;
  targetImage.outlineImage.style.height =
    `${getDisplayedHeight(displayedTargetHeight)}px`;
  correctRevealOutlineImage.style.height = `${getDisplayedHeight(currentTargetChampion.height)}px`;
  correctRevealImage.style.height = `${getDisplayedHeight(currentTargetChampion.height)}px`;
  correctRevealOutlineImage.src = currentTargetChampion.image;
  correctRevealImage.src = currentTargetChampion.image;
  targetCharacter.classList.toggle("is-reveal", roundState === "reveal");
  referenceHeightTooltip.querySelector(".tooltip-name").textContent =
    currentReferenceChampion.name;
  referenceHeightTooltip.querySelector(".tooltip-height").textContent =
    `Height: ${formatHeight(currentReferenceChampion.height)}`;
  heightTooltip.querySelector(".tooltip-name").textContent =
    currentTargetChampion.name;
  heightTooltip.querySelector(".tooltip-height").textContent =
    targetHeightHasBeenAdjusted ? `Height: ${formatHeight(targetHeight)}` : "Height: ???";
  renderMeterLabels(gridInterval, pixelsPerMeter);
  setCharacterPosition(referenceCharacter, referencePosition);
  setCharacterPosition(targetCharacter, targetPosition);
}

function finalizeInitialPlacementWhenImagesReady() {
  if (
    !initialTargetPlacementPending ||
    !referenceImage ||
    !targetImage ||
    !referenceImage.complete ||
    !targetImage.complete
  ) {
    return;
  }

  setInitialRoundFraming();
  initialTargetPlacementPending = false;
}

function renderMeterLabels(gridInterval, pixelsPerMeter) {
  const visibleScaleMeters =
    (gameBoard.clientHeight - getGroundLineScreenBottom()) / pixelsPerMeter;
  const labelCount = Math.ceil(visibleScaleMeters / gridInterval);

  meterLabels.replaceChildren();

  for (let index = 0; index <= labelCount; index += 1) {
    const label = document.createElement("span");
    label.className = "meter-label";
    label.textContent = `${formatMeterValue(index * gridInterval)}m`;
    label.style.bottom = `${
      getGroundLineScreenBottom() + index * gridInterval * pixelsPerMeter
    }px`;
    meterLabels.append(label);
  }
}

function formatMeterValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getGridInterval(pixelsPerMeter) {
  const rawInterval = desiredGridSpacing / pixelsPerMeter;
  const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
  const normalizedInterval = rawInterval / magnitude;
  const niceMultiplier = normalizedInterval <= 1 ? 1 : normalizedInterval <= 2 ? 2 : 5;

  return Math.min(
    Math.max(niceMultiplier * magnitude, minimumGridInterval),
    maximumGridInterval
  );
}

function keepTargetHeightInRange(height) {
  return Math.min(Math.max(height, minimumTargetHeight), maximumTargetHeight);
}

function keepTargetInsideBoard(position) {
  const boardWidthInWorld =
    (gameBoard.clientWidth - getScaleGutter()) / cameraZoom;
  const sideMarginInWorld = getScreenSideMargin() / cameraZoom;
  const targetHalfWidth =
    getWorldImageWidth(currentTargetChampion.height, targetImage) / 2;
  const referenceHalfWidth =
    getWorldImageWidth(currentReferenceChampion.height, referenceImage) / 2;
  const referenceRight = referencePosition.x + referenceHalfWidth;
  const minimumGapInWorld = 8 / cameraZoom;
  const minimumX = Math.max(
    sideMarginInWorld + targetHalfWidth,
    referenceRight + minimumGapInWorld + targetHalfWidth
  );
  const maximumX = boardWidthInWorld - sideMarginInWorld - targetHalfWidth;

  return {
    x: Math.min(Math.max(position.x, minimumX), maximumX),
    y: referencePosition.y,
  };
}

function setInitialRoundFraming() {
  const referenceHeight = currentReferenceChampion.height;
  targetHeight = referenceHeight;
  cameraZoom = 1;

  const referenceWidth = getWorldImageWidth(referenceHeight, referenceImage);
  const targetWidth = getWorldImageWidth(targetHeight, targetImage);
  const referenceHalfWidth = referenceWidth / 2;
  const targetHalfWidth = targetWidth / 2;

  const boardHeight = gameBoard.clientHeight || 500;
  const topGap = window.matchMedia("(max-width: 650px)").matches
    ? mobileTopGap + additionalInitialTopClearance
    : desktopTopGap + additionalInitialTopClearance;
  const desiredChampionScreenHeight =
    boardHeight - getGroundLineScreenBottom() - topGap;
  const zoomLimits = getCameraZoomLimits();

  const verticalZoom = desiredChampionScreenHeight /
    (referenceHeight * pixelsPerHeightUnit);
  const availableWidth = gameBoard.clientWidth - getScaleGutter();
  const horizontalZoom =
    (availableWidth - getScreenSideMargin() * 2 - initialTargetGapScreen) /
    Math.max(referenceWidth + targetWidth, 1);

  cameraZoom = Math.min(
    Math.max(Math.min(verticalZoom, horizontalZoom), zoomLimits.minimum),
    zoomLimits.maximum
  );

  const gapInWorld = initialTargetGapScreen / cameraZoom;
  referencePosition.x =
    getScreenSideMargin() / cameraZoom + referenceHalfWidth;
  referencePosition.y = 72;
  targetPosition = {
    x: referencePosition.x + referenceHalfWidth + gapInWorld + targetHalfWidth,
    y: referencePosition.y,
  };
}

function startResizingTarget(event) {
  if (event.button !== 0 || roundLocked || roundState === "reveal") {
    return;
  }

  activePointerId = event.pointerId;
  interactionMode = "resize";
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartPosition = { ...targetPosition };
  dragStartHeight = targetHeight;

  targetCharacter.setPointerCapture(activePointerId);
  targetCharacter.classList.add("is-resizing");
  document.body.classList.add("is-interacting");
  event.preventDefault();
}

function resizeTargetFromPointer(event) {
  if (interactionMode !== "resize" || event.pointerId !== activePointerId) {
    return;
  }

  resizeTarget(event);
}

function resizeTarget(event) {
  if (interactionMode !== "resize" || event.pointerId !== activePointerId) {
    return;
  }

  const horizontalMovement = event.clientX - dragStartX;
  const upwardMovement = dragStartY - event.clientY;
  const diagonalMovement = horizontalMovement + upwardMovement;

  targetHeight = keepTargetHeightInRange(
    dragStartHeight + diagonalMovement / (pixelsPerHeightChange * cameraZoom)
  );
  if (targetHeight !== dragStartHeight) {
    targetHeightHasBeenAdjusted = true;
  }
  renderWorld();
  event.stopPropagation();
}

function stopInteraction(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  const pointerId = activePointerId;
  const stoppedInteractionMode = interactionMode;
  const pointerElement = targetCharacter;

  activePointerId = null;
  interactionMode = null;

  if (pointerElement.hasPointerCapture(pointerId)) {
    pointerElement.releasePointerCapture(pointerId);
  }

  targetCharacter.classList.remove("is-resizing");
  document.body.classList.remove("is-interacting");
  event.stopPropagation();
}

function startNewRound() {
  currentReferenceChampion = getRandomChampion();
  currentTargetChampion = getRandomChampion(currentReferenceChampion);
  targetHeight = currentReferenceChampion.height;
  targetHeightHasBeenAdjusted = false;
  roundState = "guessing";
  resultAnchor = { x: 0, y: referencePosition.y };
  targetCharacter.classList.remove("is-reveal");
  initialTargetPlacementPending = true;
  setInitialRoundFraming();
  roundLocked = false;

  referenceImage.src = currentReferenceChampion.image;
  referenceImage.outlineImage.src = currentReferenceChampion.image;
  referenceImage.alt = currentReferenceChampion.name;
  targetImage.src = currentTargetChampion.image;
  targetImage.outlineImage.src = currentTargetChampion.image;
  targetImage.alt = currentTargetChampion.name;
  referenceImage.style.visibility = "visible";
  targetImage.style.visibility = "visible";
  lockInButton.disabled = false;
  lockInButton.textContent = "Lock In";
  resultPanelTitle.textContent = "Make your guess";
  resultEmptyState.hidden = false;
  resultSummary.hidden = true;
  renderWorld();
}

function calculateAccuracy() {
  const difference = Math.abs(targetHeight - currentTargetChampion.height);
  return Math.min(
    100,
    Math.max(0, (1 - difference / currentTargetChampion.height) * 100)
  );
}

function submitRound() {
  if (roundState === "reveal") {
    startNewRound();
    return;
  }

  if (roundLocked) {
    return;
  }

  roundLocked = true;
  roundState = "reveal";
  lockInButton.disabled = true;
  correctHeight.textContent = formatHeight(currentTargetChampion.height);
  guessedHeight.textContent = formatHeight(targetHeight);
  const accuracy = calculateAccuracy();
  accuracyResult.textContent = accuracy >= 99.95 ? "100%" : `${accuracy.toFixed(1)}%`;
  resultPanelTitle.textContent = "Result";
  resultEmptyState.hidden = true;
  resultSummary.hidden = false;
  lockInButton.disabled = false;
  lockInButton.textContent = "Next Round";
  setRevealFraming();
}

function setRevealFraming() {
  const boardWidth = gameBoard.clientWidth || 700;
  const boardHeight = gameBoard.clientHeight || 500;
  const horizontalMargin = getScreenSideMargin() * 2;
  const verticalMargin = window.matchMedia("(max-width: 650px)").matches
    ? mobileTopGap
    : desktopTopGap;
  const playerTargetWidth = getWorldImageWidth(targetHeight, targetImage);
  resultAnchor = {
    x: targetPosition.x - playerTargetWidth / 2,
    y: targetPosition.y,
  };
  const referenceHalfWidth =
    getWorldImageWidth(currentReferenceChampion.height, referenceImage) / 2;
  const trueTargetWidth = getWorldImageWidth(currentTargetChampion.height, targetImage);
  const leftWorld = referencePosition.x - referenceHalfWidth;
  const rightWorld = resultAnchor.x + Math.max(playerTargetWidth, trueTargetWidth);
  const worldWidth = Math.max(rightWorld - leftWorld, 1);
  const worldHeight =
    Math.max(currentReferenceChampion.height, currentTargetChampion.height) *
    pixelsPerHeightUnit;
  const availableWidth = boardWidth - getScaleGutter() - horizontalMargin;
  const availableHeight =
    boardHeight - getGroundLineScreenBottom() - verticalMargin;
  const zoomLimits = getCameraZoomLimits();

  cameraZoom = Math.min(
    Math.max(
      Math.min(availableWidth / worldWidth, availableHeight / worldHeight),
      zoomLimits.minimum
    ),
    zoomLimits.maximum
  );

  renderWorld();
}

function setCameraZoom(nextZoom) {
  const zoomLimits = getCameraZoomLimits();
  cameraZoom = Math.min(
    Math.max(nextZoom, zoomLimits.minimum),
    zoomLimits.maximum
  );
  renderWorld();
}

function zoomBy(factor) {
  setCameraZoom(cameraZoom * factor);
}

targetCharacter.addEventListener("pointerdown", startResizingTarget);
targetCharacter.addEventListener("pointermove", resizeTargetFromPointer);
targetCharacter.addEventListener("pointerup", stopInteraction);
targetCharacter.addEventListener("pointercancel", stopInteraction);
targetCharacter.addEventListener("lostpointercapture", stopInteraction);

zoomInButton.addEventListener("click", () => zoomBy(zoomFactor));
zoomOutButton.addEventListener("click", () => zoomBy(1 / zoomFactor));
lockInButton.addEventListener("click", submitRound);

referenceImage = renderChampion(
  { name: "", image: "" },
  referenceCharacter,
  null
);
targetImage = renderChampion(
  { name: "", image: "" },
  targetCharacter,
  null
);
startNewRound();
renderWorld();
