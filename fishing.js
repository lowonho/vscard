"use strict";

(() => {
  const game = document.getElementById("idea-fishing");
  if (!game) return;

  const portfolio = game.closest("[data-portfolio-view]");
  const picker = portfolio.querySelector(".view-switch");
  const sea = game.querySelector(".fishing-sea");
  const menus = sea.querySelector(".sea-menus");
  const tooltips = sea.querySelector(".fish-tooltips");
  const idleHint = sea.querySelector("#hint-idle");
  const touchHint = sea.querySelector("#hint-touch");
  const catchStatus = game.querySelector("#hint-catch");
  const actionText = catchStatus.querySelector("span");
  const boat = sea.querySelector(".fishing-boat");
  const rig = sea.querySelector(".fishing-rig");
  const rod = rig.querySelector(".rig-rod");
  const line = rig.querySelector(".rig-line");
  const lure = rig.querySelector(".rig-lure");
  const ring = rig.querySelector(".bite-ring");
  const motionControl = sea.querySelector(".motion-control");
  const layer = sea.querySelector(".catch-layer");
  const dialog = game.querySelector(".fishing-catch");
  const reader = dialog.querySelector(".catch-content");
  const scroller = dialog.querySelector(".catch-scroll");
  const closeButton = dialog.querySelector(".catch-close");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const restingAngle = -44;
  const hookAt = 660;
  const reelAt = 1130;
  const landAt = 1660;
  const revealAt = 1780;
  const quietHookAt = 240;
  const quietRevealAt = 880;
  const hintGap = 6;
  const swimmers = Array.from(menus.querySelectorAll(".fishing-idea"), (button, index) => ({
    button,
    lane: button.parentElement,
    fish: button.querySelector(".idea-fish"),
    cargo: button.querySelector(".idea-cargo"),
    hint: document.getElementById(button.getAttribute("aria-describedby")),
    content: document.getElementById(button.dataset.content),
    // Start mid-swim in alternating directions, away from the slower turns.
    phase: (index % 2) * Math.PI + (index - 2.5) * 0.18,
    lap: 8400 + index * 720,
    wave: index * 0.7,
    rangeX: 0, rangeY: 0, facingRight: false
  }));
  let motionEnabled = true;
  let gentleMotion = reducedMotion.matches;
  let cast = null;
  let frame = 0;
  let swimFrame = 0;
  let lastSwimTime = 0;
  let hoveredFish = null;
  let focusedFish = null;
  let pressedFish = null;
  let touchDownFish = null;
  let tappedFish = null;
  let dismissedFish = null;

  function resetFishSelection() {
    hoveredFish = focusedFish = pressedFish = null;
    touchDownFish = tappedFish = dismissedFish = null;
  }

  function positionHint({ button, hint }) {
    const area = tooltips.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const center = target.left + target.width / 2 - area.left;
    const left = Math.max(0, Math.min(center - hint.offsetWidth / 2, area.width - hint.offsetWidth));
    const top = target.bottom + hintGap - area.top - hint.offsetTop;
    hint.style.transform = `translate(${left}px, ${top}px)`;
    hint.style.setProperty("--tip-anchor", center - left + "px");
  }

  function updatePreview() {
    const owner = tappedFish || hoveredFish || focusedFish;
    const visible = cast || owner === dismissedFish ? null : owner;
    for (const swimmer of swimmers) {
      const active = swimmer.button === visible;
      swimmer.button.classList.toggle("is-previewed", active);
      swimmer.hint.classList.toggle("is-current", active);
      if (active) positionHint(swimmer);
    }
    idleHint.hidden = Boolean(visible || cast);
    touchHint.hidden = !visible || visible !== tappedFish;
    catchStatus.hidden = !cast || dialog.open;
  }

  // Keep the preview readable when the pointer crosses the gap into the bubble.
  // The bubble itself lets pointer events through to any fish swimming beneath it.
  function overTooltip(event) {
    const hint = tooltips.querySelector(".is-current");
    if (!hint) return false;
    const box = hint.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top - hintGap - 1 && event.clientY <= box.bottom;
  }

  function mix(from, to, fraction) {
    return from + (to - from) * fraction;
  }

  function progress(time, start, end) {
    const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }

  // The rod pivots at the short grip in the penguin illustration.
  function getGrip(bounds) {
    const sprite = boat.getBoundingClientRect();
    return {
      x: sprite.left - bounds.left + sprite.width * 0.871,
      y: sprite.top - bounds.top + sprite.height * 0.525,
      length: sprite.width * 0.45
    };
  }

  function getRodTip(grip, angle) {
    const radians = angle * Math.PI / 180;
    return {
      x: grip.x + Math.cos(radians) * grip.length,
      y: grip.y + Math.sin(radians) * grip.length
    };
  }

  function placeSegment(element, start, end, fraction = 1) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    element.style.width = Math.hypot(dx, dy) * fraction + "px";
    element.style.transform = `translate(${start.x}px, ${start.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
  }

  function drawRig(grip, tip, hook, ripple, fraction = 1) {
    placeSegment(rod, grip, tip);
    placeSegment(line, tip, hook, fraction);
    lure.style.visibility = fraction < 1 ? "hidden" : "";
    lure.style.transform = `translate(${hook.x}px, ${hook.y}px)`;
    ring.style.opacity = ripple === null ? "0" : String(1 - ripple);
    if (ripple !== null) ring.style.transform = `scale(${0.45 + ripple * 1.35})`;
  }

  function drawIdle() {
    const grip = getGrip(sea.getBoundingClientRect());
    const tip = getRodTip(grip, restingAngle);
    drawRig(grip, tip, { x: tip.x + 2, y: tip.y + grip.length * 0.38 }, null);
  }

  function placeSwimmer(swimmer) {
    const x = Math.sin(swimmer.phase) * swimmer.rangeX;
    const y = gentleMotion ? 0 : Math.sin(2 * swimmer.phase + swimmer.wave) * swimmer.rangeY;
    swimmer.button.style.transform = `translate(${x}px, ${y}px)`;
    const facingRight = Math.cos(swimmer.phase) >= 0;
    if (facingRight !== swimmer.facingRight) {
      swimmer.facingRight = facingRight;
      swimmer.fish.style.transform = facingRight ? "scaleX(-1)" : "";
    }
  }

  function swim(now) {
    const delta = Math.max(0, Math.min(now - lastSwimTime, 80)) * (gentleMotion ? 0.55 : 1);
    lastSwimTime = now;
    for (const swimmer of swimmers) {
      const { button } = swimmer;
      if (button === hoveredFish || button === focusedFish || button === pressedFish || button === tappedFish || swimmer === cast?.swimmer) continue;
      swimmer.phase = (swimmer.phase + delta * 2 * Math.PI / swimmer.lap) % (2 * Math.PI);
      placeSwimmer(swimmer);
    }
    swimFrame = requestAnimationFrame(swim);
  }

  function syncSwimming() {
    if (motionEnabled && !document.hidden && !dialog.open && portfolio.dataset.portfolioView === "sea") {
      if (!swimFrame) {
        lastSwimTime = performance.now();
        swimFrame = requestAnimationFrame(swim);
      }
    } else {
      cancelAnimationFrame(swimFrame);
      swimFrame = 0;
    }
  }

  function measureScene() {
    if (!sea.clientWidth || !sea.clientHeight) return;
    // Leave room for the entire moving button, including its label, inside its own lane.
    for (const swimmer of swimmers) {
      const { lane, button } = swimmer;
      swimmer.rangeX = Math.max(0, Math.min(110, (lane.clientWidth - button.offsetWidth) / 2 - 5));
      swimmer.rangeY = Math.max(0, Math.min(22, (lane.clientHeight - button.offsetHeight) / 2 - 3));
      placeSwimmer(swimmer);
    }
    if (cast) drawCast(cast.elapsed);
    else drawIdle();
    updatePreview();
  }

  // Give the sea reader its own IDs, ARIA references and disclosure groups.
  function copyForSea(source) {
    const copy = source.cloneNode(true);
    const ids = new Map();
    for (const element of [copy, ...copy.querySelectorAll("[id]")]) {
      const id = element.id;
      ids.set(id, "catch-" + id);
      element.id = ids.get(id);
    }
    for (const attribute of ["aria-labelledby", "aria-describedby"]) {
      for (const element of copy.querySelectorAll("[" + attribute + "]")) {
        const names = element.getAttribute(attribute).split(/\s+/);
        element.setAttribute(attribute, names.map(id => ids.get(id) || id).join(" "));
      }
    }
    for (const group of copy.querySelectorAll("details[name]")) group.setAttribute("name", "catch-" + group.getAttribute("name"));
    copy.querySelector(".copy-status")?.replaceChildren();
    return copy;
  }

  function openCatch() {
    const { button, content } = cast.swimmer;
    const home = content.parentElement;
    dialog.querySelector("#catch-title").textContent = button.querySelector("strong").textContent;
    dialog.querySelector(".catch-kind").textContent = (home.querySelector(".work-kind, .summary-note") || button.querySelector("small")).textContent;
    const description = dialog.querySelector("#catch-description");
    description.textContent = home.querySelector(".work-description")?.textContent || "";
    description.hidden = !description.textContent;
    const cover = home.querySelector(".work-art img");
    if (cover) reader.append(cover.cloneNode(false));
    reader.append(copyForSea(content));
    actionText.textContent = "열람 중";
    motionControl.hidden = true;
    menus.removeAttribute("aria-busy");
    button.setAttribute("aria-expanded", "true");
    layer.hidden = false;
    dialog.open = true;
    catchStatus.hidden = true;
    closeButton.focus({ preventScroll: true });
    menus.inert = true;
    scroller.scrollTop = 0;
    syncSwimming();
  }

  // Locate the mouth inside the contained image, including any letterboxing.
  function getMouth(state, bounds) {
    const { fish, facingRight } = state.swimmer;
    const img = fish.getBoundingClientRect();
    const ratio = fish.naturalWidth / fish.naturalHeight || 1.5;
    const width = Math.min(img.width, img.height * ratio);
    const height = width / ratio;
    return {
      x: img.left - bounds.left - (state.quiet ? 0 : state.dx) + (img.width - width) / 2 + width * (facingRight ? 0.94 : 0.06),
      y: img.top - bounds.top - (state.quiet ? 0 : state.dy) + (img.height - height) / 2 + height * Number(fish.dataset.mouthY || 0.62)
    };
  }

  function drawCast(elapsed) {
    const throwing = progress(elapsed, 145, hookAt);
    const reeling = progress(elapsed, reelAt, landAt);
    const lift = cast.quiet ? 0 : Math.sin(Math.PI * throwing) * 4 + Math.sin(Math.PI * reeling) * 3;
    boat.style.translate = "0 " + (-lift) + "px";
    const bounds = sea.getBoundingClientRect();
    const grip = getGrip(bounds);
    const mouth = getMouth(cast, bounds);
    if (cast.quiet) {
      // Reveal just the thread; the boat and the selected fish stay still.
      const reach = progress(elapsed, 0, quietHookAt);
      drawRig(grip, getRodTip(grip, restingAngle), mouth, reach === 1 ? 0.4 : null, reach);
      if (reach === 1 && !dialog.open && actionText.textContent !== "낚싯줄이 걸렸어요") actionText.textContent = "낚싯줄이 걸렸어요";
      return;
    }
    const castRight = mouth.x >= grip.x;
    const windup = castRight ? -83 : -18;
    const release = castRight ? -14 : -142;
    let angle = mix(restingAngle, windup, progress(elapsed, 0, 145));
    angle = mix(angle, release, progress(elapsed, 145, 400));
    angle = mix(angle, restingAngle, reeling);
    const tip = getRodTip(grip, angle);
    const hook = {
      x: mix(tip.x + 2, mouth.x, throwing),
      y: mix(tip.y + grip.length * 0.38, mouth.y, throwing) - Math.sin(Math.PI * throwing) * grip.length * 0.85
    };
    if (elapsed >= reelAt) {
      // Move the fish and the hook to the same point on every frame of the retrieve.
      cast.swimmer.button.classList.add("is-reeling");
      hook.x = mix(mouth.x, grip.x + 6, reeling);
      hook.y = mix(mouth.y, grip.y + grip.length * 0.33, reeling) - Math.sin(Math.PI * reeling) * 22;
      cast.dx = hook.x - mouth.x;
      cast.dy = hook.y - mouth.y;
      cast.swimmer.cargo.style.transform = "translate(" + cast.dx + "px," + cast.dy + "px)";
    }
    const ripple = elapsed >= hookAt && elapsed < reelAt ? progress(elapsed, hookAt, reelAt) : null;
    drawRig(grip, tip, hook, ripple);
    if (!dialog.open) {
      const action = elapsed < hookAt ? "줄 던지는 중" : elapsed < reelAt ? "물고기가 물었어요!" : "끌어올리는 중";
      if (actionText.textContent !== action) actionText.textContent = action;
    }
  }

  function animateCast(now) {
    const delta = cast.lastTick === null ? 0 : Math.max(0, now - cast.lastTick);
    cast.lastTick = now;
    let elapsed = cast.elapsed + delta;
    // On a throttled display, paint touchdown and landing before timing the next phase.
    const contactAt = cast.quiet ? quietHookAt : hookAt;
    if (cast.elapsed < contactAt) elapsed = Math.min(elapsed, contactAt);
    else if (!cast.quiet && cast.elapsed < landAt) elapsed = Math.min(elapsed, landAt);
    cast.elapsed = elapsed;
    drawCast(elapsed);
    if (elapsed < (cast.quiet ? quietRevealAt : revealAt)) frame = requestAnimationFrame(animateCast);
    else {
      frame = 0;
      openCatch();
    }
  }

  function releaseCatch(returnFocus) {
    if (!cast) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const { button, cargo } = cast.swimmer;
    cast = null;
    dialog.open = false;
    layer.hidden = true;
    reader.replaceChildren();
    menus.inert = false;
    menus.removeAttribute("aria-busy");
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("is-fishing", "is-reeling");
    cargo.style.removeProperty("transform");
    boat.style.removeProperty("translate");
    rig.classList.remove("is-casting");
    motionControl.hidden = false;
    if (sea.clientWidth) drawIdle();
    if (returnFocus) button.focus({ preventScroll: true });
    updatePreview();
    syncSwimming();
  }

  function catchFish(swimmer) {
    if (cast?.swimmer === swimmer) return;
    releaseCatch(false);
    const { button } = swimmer;
    cast = { swimmer, quiet: !motionEnabled || gentleMotion, lastTick: null, elapsed: 0, dx: 0, dy: 0 };
    button.classList.add("is-fishing");
    rig.classList.add("is-casting");
    catchStatus.querySelector("strong").textContent = button.querySelector("strong").textContent;
    actionText.textContent = "줄 던지는 중";
    updatePreview();
    menus.setAttribute("aria-busy", "true");
    drawCast(0);
    frame = requestAnimationFrame(animateCast);
  }

  for (const swimmer of swimmers) {
    const { button } = swimmer;
    if (!swimmer.content) continue;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", dialog.id);
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("pointerenter", event => {
      if (event.pointerType === "touch") return;
      tappedFish = dismissedFish = null;
      hoveredFish = button;
      updatePreview();
    });
    button.addEventListener("pointerleave", event => {
      if (event.pointerType === "touch" || hoveredFish !== button || overTooltip(event)) return;
      hoveredFish = null;
      updatePreview();
    });
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible")) {
        tappedFish = hoveredFish = dismissedFish = null;
        focusedFish = button;
        updatePreview();
      }
    });
    button.addEventListener("blur", () => {
      if (focusedFish === button) focusedFish = null;
      updatePreview();
    });
    button.addEventListener("pointerdown", event => {
      pressedFish = button;
      touchDownFish = event.pointerType === "touch" ? button : null;
    });
    button.addEventListener("click", event => {
      // Safari can deliver a MouseEvent for a finger tap. Keyboard activation has detail 0.
      const touch = event.pointerType === "touch" || (event.detail > 0 && touchDownFish === button);
      touchDownFish = null;
      if (cast?.swimmer === swimmer) return;
      if (touch && tappedFish !== button) {
        releaseCatch(false);
        hoveredFish = focusedFish = dismissedFish = null;
        tappedFish = button;
        updatePreview();
        return;
      }
      tappedFish = null;
      catchFish(swimmer);
    });
  }
  sea.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch" && hoveredFish && !hoveredFish.contains(event.target) && !overTooltip(event)) {
      hoveredFish = null;
      updatePreview();
    }
  });
  sea.addEventListener("pointerleave", event => {
    if (event.pointerType !== "touch" && hoveredFish) {
      hoveredFish = null;
      updatePreview();
    }
  });
  document.addEventListener("pointerdown", event => {
    if (tappedFish && !tappedFish.contains(event.target)) {
      tappedFish = null;
      updatePreview();
    }
  });
  window.addEventListener("pointerup", () => { pressedFish = null; });
  window.addEventListener("pointercancel", () => { pressedFish = touchDownFish = null; });
  game.classList.add("has-previews");

  function applyMotion(enabled) {
    motionEnabled = enabled;
    motionControl.textContent = enabled ? "움직임 멈추기" : "움직임 켜기";
    sea.toggleAttribute("data-paused", !enabled);
    if (cast && !dialog.open && (!enabled || gentleMotion) && !cast.quiet) {
      cast.quiet = true;
      cast.elapsed = quietHookAt;
      cast.lastTick = null;
      actionText.textContent = "낚싯줄이 걸렸어요";
      drawCast(cast.elapsed);
    }
    syncSwimming();
  }
  motionControl.addEventListener("click", () => applyMotion(!motionEnabled));
  reducedMotion.addEventListener?.("change", event => {
    gentleMotion = event.matches;
    applyMotion(motionEnabled);
  });

  closeButton.addEventListener("click", () => releaseCatch(true));
  layer.addEventListener("click", event => {
    if (event.target === layer) releaseCatch(true);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || (!cast && !tooltips.querySelector(".is-current"))) return;
    event.preventDefault();
    if (cast) releaseCatch(true);
    else {
      dismissedFish = hoveredFish || focusedFish;
      tappedFish = null;
      updatePreview();
    }
  });
  document.addEventListener("visibilitychange", () => {
    pressedFish = touchDownFish = null;
    if (cast && !dialog.open) {
      cancelAnimationFrame(frame);
      cast.lastTick = null;
      if (!document.hidden) frame = requestAnimationFrame(animateCast);
    }
    syncSwimming();
  });

  boat.addEventListener("load", measureScene);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(measureScene);
    observer.observe(sea);
    observer.observe(tooltips);
    for (const swimmer of swimmers) observer.observe(swimmer.button);
  } else window.addEventListener("resize", measureScene);

  function showView(view) {
    portfolio.dataset.portfolioView = view;
    if (view === "list") {
      resetFishSelection();
      releaseCatch(false);
      updatePreview();
    } else measureScene();
    syncSwimming();
  }
  function enterPortfolio() {
    resetFishSelection();
    releaseCatch(false);
    const linkedItem = document.getElementById(location.hash.slice(1));
    const listEntry = linkedItem?.closest("[data-list-only]");
    if (listEntry) {
      for (let parent = linkedItem.closest("details"); parent; parent = parent.parentElement?.closest("details")) parent.open = true;
    }
    const view = listEntry ? "list" : "sea";
    picker.querySelector(`input[value="${view}"]`).checked = true;
    gentleMotion = reducedMotion.matches;
    applyMotion(true);
    showView(view);
  }
  picker.hidden = false;
  motionControl.hidden = false;
  enterPortfolio();
  window.addEventListener("pageshow", event => {
    if (event.persisted) enterPortfolio();
  });
  picker.addEventListener("change", event => {
    const view = event.target.value;
    showView(view);
    if (view === "sea" && document.getElementById(location.hash.slice(1))?.closest("[data-list-only]")) {
      try { history.replaceState(history.state, "", location.href.split("#")[0]); } catch { /* Sandboxed previews may keep their URL. */ }
    }
  });
})();
