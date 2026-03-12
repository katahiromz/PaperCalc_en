// main.js --- Written arithmetic calculator
// Author: katahiromz
// License: MIT
"use strict";
const VERSION = '1.1.5'; // Version
const DEBUGGING = false; // Debug mode flag
document.addEventListener('DOMContentLoaded', function () {
    Paper.g_minimal = true; // Minimize paper expansion
    let canvas = document.getElementById('my-canvas');
    let canvas_space = document.getElementById('my-canvas-space');
    let start_button = document.getElementById('my-start-button');
    let stop_button = document.getElementById('my-stop-button');
    let reset_button = document.getElementById('my-reset-button');
    let next_step_button = document.getElementById('my-next-step-button');
    let textarea = document.getElementById('my-textarea');
    let text_a = document.getElementById('my-text-a');
    let text_b = document.getElementById('my-text-b');
    let text_c = document.getElementById('my-text-c');
    let accuracy = document.getElementById('my-accuracy');
    let select = document.getElementById('my-select');
    let speedRange = document.getElementById('my-speed-range');
    let speedLabel = document.getElementById('speed-label');
    let errorDisplay = document.getElementById('input-error-message');
    let label_a = document.getElementById('label-a');
    let label_b = document.getElementById('label-b');
    let version_span = document.getElementById('my-version-span');
    let algorithm = null;
    let op = null;
    let speedInfo = {
        1: { text: 'Very slow',   delay: 900 },
        2: { text: 'Quite slow',  delay: 800 },
        3: { text: 'Slow',        delay: 700 },
        4: { text: 'Normal',      delay: 500 },
        5: { text: 'Fast',        delay: 300 },
        6: { text: 'Quite fast',  delay: 200 },
        7: { text: 'Very fast',   delay: 100 },
    };
    // Zoom the canvas with Ctrl + mouse wheel.
    // - Ctrl+Wheel is often captured by the browser's page zoom, so we use passive:false and call preventDefault.
    // - Zoom is applied via CSS transform, using the mouse pointer position as the transform-origin for intuitive zooming.
    const zoomState = {
        scale: 1.0,
        minScale: 0.25,
        maxScale: 6.0,
        step: 1.2,
    };
    // Pan (move) the canvas by dragging with the middle mouse button.
    // Transform is unified as (translate + scale) so zoom and pan work together.
    const panState = {
        x: 0,
        y: 0,
        dragging: false,
        startClientX: 0,
        startClientY: 0,
        startX: 0,
        startY: 0,
        pointerId: null,
    };
    // Clamp a value v to the closed interval [min, max]
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    // Clamp (or center) panState.x/y so the canvas display fits within the viewport VW×VH.
    // Rounding rule: all floating-point midpoint values are floored to integers to suppress drift.
    // panState.x/y will always be integers after this call.
    const clampPan = () => {
        // Viewport size in integer px
        const VW = canvas_space.clientWidth;
        const VH = canvas_space.clientHeight;
        if (VW <= 0 || VH <= 0)
            return;
        // Canvas CSS layout size before transform, in integer px
        const CW_L = canvas.offsetWidth;
        const CH_L = canvas.offsetHeight;
        if (CW_L <= 0 || CH_L <= 0)
            return;
        const s = zoomState.scale;
        // Displayed size after scaling (floored: conservatively underestimated)
        const CW2 = Math.floor(CW_L * s);
        const CH2 = Math.floor(CH_L * s);
        // Offset of the canvas's top-left corner due to flex centering (floored)
        // When panState = (0, 0), the canvas left edge is at flex_x within the viewport
        const flex_x = Math.floor((VW - CW_L) / 2);
        const flex_y = Math.floor((VH - CH_L) / 2);
        // X axis
        if (CW2 >= VW) {
            // Canvas is wider than the viewport — clamp to prevent blank edges
            // Upper bound: canvas left edge aligns with viewport left (visual_left = 0)
            const maxX = -flex_x;
            // Lower bound: canvas right edge aligns with viewport right (visual_right = VW)
            const minX = VW - flex_x - CW2;
            panState.x = Math.min(maxX, Math.max(minX, panState.x));
        }
        else {
            // Canvas is narrower than the viewport — fix to center (floored)
            panState.x = Math.floor((VW - CW2) / 2) - flex_x;
        }
        // Y axis
        if (CH2 >= VH) {
            const maxY = -flex_y;
            const minY = VH - flex_y - CH2;
            panState.y = Math.min(maxY, Math.max(minY, panState.y));
        }
        else {
            panState.y = Math.floor((VH - CH2) / 2) - flex_y;
        }
    };
    // transform-origin is always fixed at 0 0; all transforms use translate + scale
    const applyCanvasTransform = () => {
        clampPan();
        canvas.style.transformOrigin = '0 0';
        canvas.style.transform = `translate(${panState.x}px, ${panState.y}px) scale(${zoomState.scale})`;
    };
    // Reset zoom and pan to defaults
    const resetZoomAndPan = () => {
        panState.x = panState.y = 0;
        zoomState.scale = 1.0;
        applyCanvasTransform();
    };
    // Returns the zoom pivot point in translate-space coordinates (integers).
    // Using canvas.getBoundingClientRect() automatically accounts for flex centering, scrolling, and transforms.
    const getZoomPivot = (clientX, clientY) => {
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: Math.round(clientX) - Math.round(canvasRect.left) + panState.x,
            y: Math.round(clientY) - Math.round(canvasRect.top) + panState.y,
        };
    };
    // Adjust panState to keep the zoom pivot (pivotX, pivotY) visually fixed during a zoom
    const adjustPanForZoomAtSpacePoint = (pivotX, pivotY, prevScale, nextScale) => {
        panState.x = Math.round(pivotX + (panState.x - pivotX) * nextScale / prevScale);
        panState.y = Math.round(pivotY + (panState.y - pivotY) * nextScale / prevScale);
    };
    const getWheelScaleFactor = (deltaY) => {
        // deltaY: positive = scroll down (conventional). Down = zoom out, up = zoom in.
        if (deltaY < 0)
            return zoomState.step;
        if (deltaY > 0)
            return 1 / zoomState.step;
        return 1;
    };
    // Handle mouse wheel events
    const onCanvasWheel = (e) => {
        // Normal scroll without Ctrl — do nothing
        if (!e.ctrlKey)
            return;
        // Prevent the browser's own page zoom
        e.preventDefault();
        if (canvas.width <= 1 && canvas.height <= 1)
            return;
        // Zoom pivot in translate-space (flex centering and scrolling handled automatically)
        // If the pointer is outside the canvas, use the canvas center as the pivot (natural behavior)
        const canvasRect = canvas.getBoundingClientRect();
        const pivotClientX = (e.clientX >= canvasRect.left && e.clientX <= canvasRect.right)
            ? e.clientX : Math.round((canvasRect.left + canvasRect.right) / 2);
        const pivotClientY = (e.clientY >= canvasRect.top && e.clientY <= canvasRect.bottom)
            ? e.clientY : Math.round((canvasRect.top + canvasRect.bottom) / 2);
        const sp = getZoomPivot(pivotClientX, pivotClientY);
        // Calculate the next scale
        const factor = getWheelScaleFactor(e.deltaY);
        const prevScale = zoomState.scale;
        const nextScale = clamp(prevScale * factor, zoomState.minScale, zoomState.maxScale);
        // If the scale hasn't changed, just re-apply the transform
        if (nextScale === prevScale) {
            applyCanvasTransform();
            return;
        }
        // Adjust pan to keep the zoom pivot fixed, then update the scale
        adjustPanForZoomAtSpacePoint(sp.x, sp.y, prevScale, nextScale);
        zoomState.scale = nextScale;
        applyCanvasTransform();
    };
    // Pointer tracking for touch (pinch) zoom
    const touchPointers = new Map();
    // Pan by dragging with the middle mouse button (wheel press)
    const onCanvasPointerDown = (e) => {
        // Track touch pointers for pinch zoom
        if (e.pointerType === 'touch') {
            // Only process touches within canvas_space.
            // Calling preventDefault on touches targeting other elements (like inputs/buttons)
            // would prevent the on-screen keyboard from appearing on mobile.
            if (!canvas_space.contains(e.target))
                return;
            // Immediately stop browser scroll/gesture handling
            e.preventDefault();
            touchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
            // Use setPointerCapture so we keep receiving events even if the finger leaves the element.
            // Since we're listening on window, we capture on the target element.
            if (e.pointerId != null) {
                try {
                    e.target.setPointerCapture(e.pointerId);
                }
                catch (_) { }
            }
            return;
        }
        if (e.button !== 1)
            return;
        e.preventDefault();
        panState.dragging = true;
        panState.startClientX = e.clientX;
        panState.startClientY = e.clientY;
        panState.startX = panState.x;
        panState.startY = panState.y;
        if (e.pointerId != null && canvas.setPointerCapture) {
            panState.pointerId = e.pointerId;
            canvas.setPointerCapture(e.pointerId);
        }
        canvas.style.cursor = 'grabbing';
    };
    const onCanvasPointerMove = (e) => {
        if (e.pointerType === 'touch') {
            // Only process pointers we're already tracking (touches outside canvas_space are not tracked).
            // Android Chrome may intercept gestures mid-pointermove, but by only calling preventDefault
            // for tracked pointers inside canvas_space, we avoid blocking keyboard input.
            if (!touchPointers.has(e.pointerId)) {
                return;
            }
            e.preventDefault();
            if (touchPointers.size === 1) {
                // Single-finger pan: add the delta from the previous position to panState
                const prev = touchPointers.get(e.pointerId);
                panState.x += Math.round(e.clientX - prev.clientX);
                panState.y += Math.round(e.clientY - prev.clientY);
                // Update the stored position before applying the transform
                touchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                applyCanvasTransform();
            }
            else if (touchPointers.size === 2) {
                const ids = Array.from(touchPointers.keys());
                const otherId = ids.find(id => id !== e.pointerId);
                // prev: previous frame position of the moving finger; other: current position of the other finger
                const prev = touchPointers.get(e.pointerId);
                const other = touchPointers.get(otherId);
                const prevDist = Math.hypot(prev.clientX - other.clientX, prev.clientY - other.clientY);
                const newDist = Math.hypot(e.clientX - other.clientX, e.clientY - other.clientY);
                // Update the stored position first (so stale values don't persist after zoom calculation)
                touchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
                if (prevDist > 1) { // Skip if fingers are extremely close together (prevents misfires)
                    const factor = newDist / prevDist;
                    const prevScale = zoomState.scale;
                    const nextScale = clamp(prevScale * factor, zoomState.minScale, zoomState.maxScale);
                    // Get the pinch center in canvas_space coordinates (midpoint of the two fingers)
                    // 'other' already holds the latest position (updated on pointerdown or previous pointermove)
                    const centerClientX = (e.clientX + other.clientX) / 2;
                    const centerClientY = (e.clientY + other.clientY) / 2;
                    const sp = getZoomPivot(centerClientX, centerClientY);
                    adjustPanForZoomAtSpacePoint(sp.x, sp.y, prevScale, nextScale);
                    zoomState.scale = nextScale;
                    applyCanvasTransform();
                }
            }
            else {
                // 3+ fingers: just update tracked positions and skip zooming
                touchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
            }
            return;
        }
        if (!panState.dragging)
            return;
        e.preventDefault();
        const dx = e.clientX - panState.startClientX;
        const dy = e.clientY - panState.startClientY;
        panState.x = panState.startX + dx;
        panState.y = panState.startY + dy;
        applyCanvasTransform();
    };
    const endPanDrag = (e) => {
        // Stop tracking the touch pointer
        if (e && e.pointerType === 'touch') {
            touchPointers.delete(e.pointerId);
            // On pointercancel (e.g. browser took over the gesture), clear all pointers
            if (e.type === 'pointercancel') {
                touchPointers.clear();
            }
            return;
        }
        if (!panState.dragging)
            return;
        panState.dragging = false;
        if (panState.pointerId != null && canvas.releasePointerCapture) {
            try {
                canvas.releasePointerCapture(panState.pointerId);
            }
            catch (err) {
                // ignore
            }
            panState.pointerId = null;
        }
        canvas.style.cursor = '';
        if (e)
            e.preventDefault();
    };
    // Initial styles for zoom/pan
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = 'translate(0px, 0px) scale(1)';
    // Suppress the context menu during a drag (can appear in some environments)
    canvas.addEventListener('contextmenu', (e) => {
        if (panState.dragging)
            e.preventDefault();
    });
    window.addEventListener('pointerdown', onCanvasPointerDown, { passive: false });
    window.addEventListener('pointermove', onCanvasPointerMove, { passive: false });
    window.addEventListener('pointerup', endPanDrag, { passive: false });
    window.addEventListener('pointercancel', endPanDrag, { passive: false });
    window.addEventListener('wheel', onCanvasWheel, { passive: false });
    // Android Chrome may preemptively claim touchstart as passive:true, intercepting pinch gestures.
    // Register on canvas_space with passive:false so we can call preventDefault when needed.
    canvas_space.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
    canvas_space.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    // Recalculate centering/clamping whenever the viewport is resized
    new ResizeObserver(() => applyCanvasTransform()).observe(canvas_space);
    // Load saved settings
    const loadSettings = () => {
        let PenCalc_textA = localStorage.getItem('PenCalc_textA');
        if (PenCalc_textA)
            text_a.value = PenCalc_textA;
        let PenCalc_textB = localStorage.getItem('PenCalc_textB');
        if (PenCalc_textB)
            text_b.value = PenCalc_textB;
        let PenCalc_textC = localStorage.getItem('PenCalc_textC');
        if (PenCalc_textC)
            text_c.value = PenCalc_textC;
        let PenCalc_select = localStorage.getItem('PenCalc_select');
        if (PenCalc_select)
            select.value = PenCalc_select;
        let PenCalc_speedRange = localStorage.getItem('PenCalc_speedRange');
        if (PenCalc_speedRange)
            speedRange.value = PenCalc_speedRange;
    };
    loadSettings();
    // Load all images
    Promise.all(Object.keys(digitInfo).map(key => loadImage(key)))
        .then(() => {
            console.log('All images loaded successfully.');
        })
        .catch(error => {
            console.error('Failed to load images:', error);
        });
    if (DEBUGGING) {
        (new AlgoBase(canvas, textarea)).unitTest();
        (new AlgoAdd(canvas, textarea)).unitTest();
        (new AlgoSub(canvas, textarea)).unitTest();
        (new AlgoMul(canvas, textarea)).unitTest();
        (new AlgoDiv(canvas, textarea)).unitTest();
        (new AlgoTest(canvas, textarea)).unitTest();
        textarea.innerText = '';
    }
    // Handle speed changes
    const speedChanged = () => {
        let val = speedRange.value;
        let info = speedInfo[parseInt(val)];
        speedLabel.innerText = info.text;
        if (algorithm) {
            algorithm.setDelay(speedInfo[parseInt(speedRange.value)].delay);
        }
        localStorage.setItem('PenCalc_speedRange', val.toString());
    };
    speedChanged();
    // Speed slider change event
    speedRange.addEventListener('input', (e) => {
        speedChanged();
    });
    // Validate user input
    const validateInput = (emptyIsOK = true) => {
        let message = "";
        const a = text_a.value, b = text_b.value, c = text_c.value;
        let isAValid = true, isBValid = true, isCValid = true;
        // Validate Number A (using getNumberInfo)
        if ((a !== "" && !getNumberInfo(a)) || (!emptyIsOK && a === "")) {
            message = "Please enter a valid number.";
            isAValid = false;
        }
        // Validate Number B
        if ((b !== "" && !getNumberInfo(b)) || (!emptyIsOK && b === "")) {
            message = "Please enter a valid number.";
            isBValid = false;
        }
        // Validate Number C
        if (c !== "" && !getNumberInfo(c)) {
            message = "Please enter a valid number.";
            isCValid = false;
        } else {
          if (parseInt(text_c.value) > 9) {
            text_c.value = '9';
          }
        }
        if (isAValid && isBValid) {
            // Subtraction constraint: minuend must be greater than or equal to subtrahend
            if (select.value === 'sub' && a !== "" && b !== "") {
                if (comparePositiveNumbers(a, b) < 0) {
                    message = "For subtraction, the first number must be greater than the second.";
                    isAValid = isBValid = false;
                }
            }
            // Division constraint: cannot divide by zero
            if (select.value === 'div' && a !== "" && b !== "") {
                if (comparePositiveNumbers(b, '0') == 0) {
                    message = "Cannot divide by zero.";
                    isBValid = false;
                }
            }
        }
        // Update UI
        text_a.classList.toggle('input-error', !isAValid);
        text_b.classList.toggle('input-error', !isBValid);
        text_c.classList.toggle('input-error', !isCValid);
        errorDisplay.innerText = message;
        // Disable the start button if there are any errors
        let isValid = (message === "" && isAValid && isBValid && isCValid);
        start_button.disabled = !isValid;
        next_step_button.disabled = !isValid;
        return isValid;
    };
    // Play button
    start_button.addEventListener('click', (e) => {
        resetZoomAndPan();
        let a = text_a.value;
        let b = text_b.value;
        let c = text_c.value;
        console.log(a, b, c);
        if (!validateInput(false))
            return;
        if (algorithm) {
            algorithm.stop();
            algorithm = null;
        }
        switch (select.value) {
            case 'add':
                algorithm = new AlgoAdd(canvas, textarea, () => {
                    next_step_button.disabled = true;
                    stop_button.click();
                });
                break;
            case 'sub':
                algorithm = new AlgoSub(canvas, textarea, () => {
                    next_step_button.disabled = true;
                    stop_button.click();
                });
                break;
            case 'mul':
                algorithm = new AlgoMul(canvas, textarea, () => {
                    next_step_button.disabled = true;
                    stop_button.click();
                });
                break;
            case 'div':
                algorithm = new AlgoDiv(canvas, textarea, () => {
                    next_step_button.disabled = true;
                    stop_button.click();
                });
                break;
            case 'test':
                algorithm = new AlgoTest(canvas, textarea, () => {
                    next_step_button.disabled = true;
                    stop_button.click();
                });
                break;
            default:
                alert(select.value);
                return;
        }
        start_button.disabled = true;
        stop_button.disabled = false;
        text_a.disabled = true;
        text_b.disabled = true;
        text_c.disabled = true;
        next_step_button.disabled = true;
        reset_button.disabled = false;
        select.disabled = true;
        op = select.value;
        algorithm.autoPlay = true;
        textarea.innerText = '';
        algorithm.set(a, b, c);
        algorithm.setDelay(speedInfo[parseInt(speedRange.value)].delay);
        algorithm.start();
    });
    // Stop button
    stop_button.addEventListener('click', (e) => {
        if (algorithm) {
            algorithm.stop();
        }
        start_button.disabled = false;
        stop_button.disabled = true;
        reset_button.disabled = false;
        select.disabled = false;
        text_a.disabled = false;
        text_b.disabled = false;
        text_c.disabled = false;
    });
    // Step button
    next_step_button.addEventListener('click', (e) => {
        resetZoomAndPan();
        // If the algorithm hasn't been created yet or has stopped, initialize it
        if (!algorithm || !algorithm.running) {
            let a = text_a.value;
            let b = text_b.value;
            let c = text_c.value;
            if (!validateInput(false))
                return;
            // Stop any existing instance
            if (algorithm)
                algorithm.stop();
            // Instantiate based on the selected operation
            switch (select.value) {
                case 'add':
                    algorithm = new AlgoAdd(canvas, textarea);
                    break;
                case 'sub':
                    algorithm = new AlgoSub(canvas, textarea);
                    break;
                case 'mul':
                    algorithm = new AlgoMul(canvas, textarea);
                    break;
                case 'div':
                    algorithm = new AlgoDiv(canvas, textarea);
                    break;
                case 'test':
                    algorithm = new AlgoTest(canvas, textarea);
                    break;
                default: return;
            }
            // Set the completion callback
            algorithm.end_fn = () => {
                next_step_button.disabled = true;
                stop_button.click();
            };
            algorithm.set(a, b, c);
            algorithm.autoPlay = false; // Disable auto-play
            algorithm.start();          // Start the render loop
        }
        // Update UI state
        start_button.disabled = true;
        stop_button.disabled = true;
        text_a.disabled = true;
        text_b.disabled = true;
        text_c.disabled = true;
        select.disabled = true;
        reset_button.disabled = false;
        // Advance to the next 'step' command
        algorithm.nextStep();
    });
    // Reset button
    reset_button.addEventListener('click', (e) => {
        if (algorithm) {
            algorithm.stop();
            algorithm.clearPaper();
            algorithm = null;
        }
        if (!validateInput(true))
            return;
        start_button.disabled = false;
        stop_button.disabled = true;
        next_step_button.disabled = false;
        text_a.disabled = false;
        text_b.disabled = false;
        text_c.disabled = false;
        reset_button.disabled = false;
        select.disabled = false;
        textarea.innerHTML = '';
        zoomState.scale = 1.0;
        panState.x = 0;
        panState.y = 0;
        applyCanvasTransform();
    });
    text_a.addEventListener('input', () => {
        if (!validateInput(true) || text_a.value === '')
            return;
        localStorage.setItem('PenCalc_textA', text_a.value);
    });
    text_b.addEventListener('input', () => {
        if (!validateInput(true) || text_b.value === '')
            return;
        localStorage.setItem('PenCalc_textB', text_b.value);
    });
    text_c.addEventListener('input', () => {
        if (!validateInput(true) || text_c.value === '')
            return;
        localStorage.setItem('PenCalc_textC', text_c.value);
    });
    const updateLabels = () => {
        switch (select.value) {
            case 'add':
                label_a.innerText = "Augend";    // Number being added to
                label_b.innerText = "Addend";     // Number being added
                accuracy.classList.add('hidden');
                text_c.value = '0';
                break;
            case 'sub':
                label_a.innerText = "Minuend";    // Number being subtracted from
                label_b.innerText = "Subtrahend"; // Number being subtracted
                accuracy.classList.add('hidden');
                text_c.value = '0';
                break;
            case 'mul':
                label_a.innerText = "Multiplicand"; // Number being multiplied
                label_b.innerText = "Multiplier";   // Number to multiply by
                accuracy.classList.add('hidden');
                text_c.value = '0';
                break;
            case 'div':
                label_a.innerText = "Dividend";  // Number being divided
                label_b.innerText = "Divisor";   // Number to divide by
                accuracy.classList.remove('hidden');
                break;
            case 'test':
                label_a.innerText = "Number A";
                label_b.innerText = "Number B";
                accuracy.classList.remove('hidden');
                break;
            default:
                return false;
        }
        return true;
    };
    select.addEventListener('change', () => {
        if (!updateLabels())
            return;
        localStorage.setItem('PenCalc_select', select.value);
        validateInput(false);
    });
    const ready = () => {
        select.disabled = false;
        speedRange.disabled = false;
        text_a.disabled = false;
        text_b.disabled = false;
        text_c.disabled = false;
        start_button.disabled = false;
        stop_button.disabled = true;
        next_step_button.disabled = false;
        reset_button.disabled = false;
        version_span.innerText = VERSION;
    };
    updateLabels();
    ready();
});