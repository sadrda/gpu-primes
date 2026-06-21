const numberFmt = new Intl.NumberFormat("en-US");

const N_MIN = 1_000;
const N_MAX = 50_000_000;
const LOG_MIN = Math.log10(N_MIN);
const LOG_MAX = Math.log10(N_MAX);
const SLIDER_STEPS = 1000;

/** Maps a slider position (0..SLIDER_STEPS) to N on a log scale. */
function sliderToN(pos: number): number {
  const log = LOG_MIN + (pos / SLIDER_STEPS) * (LOG_MAX - LOG_MIN);
  return Math.round(10 ** log);
}

/** Inverse of sliderToN, for setting the initial slider position from N. */
function nToSlider(n: number): number {
  const log = Math.log10(n);
  return Math.round(((log - LOG_MIN) / (LOG_MAX - LOG_MIN)) * SLIDER_STEPS);
}

export interface Controls {
  el: HTMLElement;
  /** Current value of N. */
  getN: () => number;
  /** Enable/disable the run button (e.g. while a run is in flight). */
  setRunning: (running: boolean) => void;
  /** Registers the run handler. */
  onRun: (handler: () => void) => void;
}

export function createControls(initialN = 1_000_000): Controls {
  const el = document.createElement("div");
  el.className = "controls";
  el.innerHTML = `
    <label class="control-row">
      <span class="control-label">N =</span>
      <output class="control-value" data-value></output>
    </label>
    <input
      type="range"
      class="slider"
      min="0"
      max="${SLIDER_STEPS}"
      value="${nToSlider(initialN)}"
      data-slider
    />
    <button type="button" class="run-btn" data-run>Run race ▶</button>
    <p class="control-hint">Sum of all primes below N — CPU vs WebGPU, same algorithm.</p>
  `;
  const slider = el.querySelector<HTMLInputElement>("[data-slider]")!;
  const valueEl = el.querySelector<HTMLOutputElement>("[data-value]")!;
  const runBtn = el.querySelector<HTMLButtonElement>("[data-run]")!;

  // Start at the exact initial value so the displayed N is a round number;
  // dragging then recomputes from the slider position.
  let n = initialN;
  const renderValue = () => {
    valueEl.textContent = numberFmt.format(n);
  };
  slider.addEventListener("input", () => {
    n = sliderToN(Number(slider.value));
    renderValue();
  });
  renderValue();

  return {
    el,
    getN: () => n,
    setRunning: (running) => {
      runBtn.disabled = running;
      runBtn.textContent = running ? "Racing…" : "Run race ▶";
    },
    onRun: (handler) => runBtn.addEventListener("click", handler),
  };
}
