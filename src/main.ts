import './style.css'
import { createControls } from './ui/controls.ts'
import { Panel } from './ui/panel.ts'
import { sumPrimesCpu } from './primes/cpu.ts'
import { sumPrimesGpu, isGpuAvailable } from './primes/gpu.ts'
import type { PrimeResult } from './primes/types.ts'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <header class="hero">
    <h1>Prime Sum: CPU vs WebGPU</h1>
    <p class="subtitle">
      Both compute the sum of all primes below N with the same trial-division
      algorithm. The GPU runs one thread per number.
    </p>
  </header>
  <main class="layout"></main>
`

const layout = app.querySelector<HTMLElement>('.layout')!

const controls = createControls()
const cpuPanel = new Panel('CPU (1 thread)', 'cpu')
const gpuPanel = new Panel('WebGPU (parallel)', 'gpu')

const panels = document.createElement('div')
panels.className = 'panels'
panels.append(cpuPanel.el, gpuPanel.el)

const verdict = document.createElement('div')
verdict.className = 'verdict'
verdict.textContent = 'Pick an N and run the race.'

layout.append(controls.el, panels, verdict)

let gpuReady = false
isGpuAvailable().then((ok) => {
  gpuReady = ok
  if (!ok) {
    gpuPanel.setError('WebGPU unavailable — try Chrome/Edge desktop.')
  }
})

function renderVerdict(cpu: PrimeResult, gpu: PrimeResult | null) {
  if (!gpu) {
    verdict.className = 'verdict'
    verdict.textContent = `CPU finished in ${cpu.ms.toFixed(1)} ms. (GPU unavailable.)`
    return
  }
  const match = cpu.sum === gpu.sum
  const gpuFaster = gpu.ms < cpu.ms
  const factor = gpuFaster ? cpu.ms / gpu.ms : gpu.ms / cpu.ms
  const winner = gpuFaster ? 'GPU' : 'CPU'
  verdict.className = `verdict ${gpuFaster ? 'verdict-gpu' : 'verdict-cpu'}`
  verdict.innerHTML = `
    <span class="verdict-main">${winner} was ${factor.toFixed(1)}× faster</span>
    <span class="verdict-match ${match ? 'ok' : 'bad'}">
      ${match ? '✓ sums match' : '✕ sums differ!'}
    </span>
  `
}

async function runRace() {
  const n = controls.getN()
  controls.setRunning(true)
  verdict.className = 'verdict'
  verdict.textContent = 'Racing…'

  cpuPanel.setRunning()
  if (gpuReady) gpuPanel.setRunning()

  let cpu: PrimeResult | null = null
  let gpu: PrimeResult | null = null

  // Re-render the finished panels' bars relative to the slowest result so far,
  // so whichever side finishes first shows immediately and bars rescale once
  // both are in.
  const renderBars = () => {
    const maxMs = Math.max(cpu?.ms ?? 0, gpu?.ms ?? 0, 0.001)
    if (cpu) cpuPanel.setResult(cpu, cpu.ms / maxMs)
    if (gpu) gpuPanel.setResult(gpu, gpu.ms / maxMs)
  }

  const cpuRun = sumPrimesCpu(n)
    .then((r) => {
      cpu = r
      renderBars()
    })
    .catch(() => cpuPanel.setError('CPU computation failed.'))

  const gpuRun = gpuReady
    ? sumPrimesGpu(n)
        .then((r) => {
          gpu = r
          renderBars()
        })
        .catch(() => gpuPanel.setError('GPU computation failed.'))
    : Promise.resolve()

  await Promise.all([cpuRun, gpuRun])

  if (cpu) renderVerdict(cpu, gpu)

  controls.setRunning(false)
}

controls.onRun(runRace)
