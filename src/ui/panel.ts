import type { PrimeResult } from '../primes/types.ts'

const numberFmt = new Intl.NumberFormat('en-US')

/**
 * A result panel for one compute path (CPU or GPU). Shows the prime sum, the
 * elapsed time, and a bar whose fill is proportional to time (longer = slower),
 * giving the side-by-side "race" a visual readout.
 */
export class Panel {
  readonly el: HTMLElement
  private readonly sumEl: HTMLElement
  private readonly timeEl: HTMLElement
  private readonly barEl: HTMLElement

  constructor(label: string, variant: 'cpu' | 'gpu') {
    this.el = document.createElement('div')
    this.el.className = `panel panel-${variant}`
    this.el.innerHTML = `
      <div class="panel-label">${label}</div>
      <div class="panel-sum" data-sum>—</div>
      <div class="panel-time" data-time>ready</div>
      <div class="panel-bar"><div class="panel-bar-fill" data-bar></div></div>
    `
    this.sumEl = this.el.querySelector('[data-sum]')!
    this.timeEl = this.el.querySelector('[data-time]')!
    this.barEl = this.el.querySelector('[data-bar]')!
  }

  setRunning() {
    this.el.classList.remove('is-error', 'is-done')
    this.el.classList.add('is-running')
    this.sumEl.textContent = '…'
    this.timeEl.textContent = 'computing…'
    this.barEl.style.width = '0%'
  }

  /** Renders a finished result. `barFraction` is 0..1 relative to the slowest. */
  setResult(result: PrimeResult, barFraction: number) {
    this.el.classList.remove('is-running', 'is-error')
    this.el.classList.add('is-done')
    this.sumEl.textContent = numberFmt.format(result.sum)
    this.timeEl.textContent = `${result.ms.toFixed(1)} ms`
    this.barEl.style.width = `${Math.max(2, barFraction * 100)}%`
  }

  setError(message: string) {
    this.el.classList.remove('is-running', 'is-done')
    this.el.classList.add('is-error')
    this.sumEl.textContent = '✕'
    this.timeEl.textContent = message
    this.barEl.style.width = '0%'
  }
}
