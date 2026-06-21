import type { CpuRequest, CpuResponse, PrimeResult } from './types.ts'
// Vite resolves this `?worker` import to a Worker constructor.
import CpuWorker from './cpu.worker.ts?worker'

/**
 * Runs the trial-division prime sum on a background Web Worker so the main
 * thread (and thus the UI) stays responsive while the CPU grinds. A fresh
 * worker is spun up per run and terminated when done — simple and avoids any
 * stale-state bugs between runs.
 */
export function sumPrimesCpu(n: number): Promise<PrimeResult> {
  return new Promise((resolve, reject) => {
    const worker = new CpuWorker()
    worker.onmessage = (e: MessageEvent<CpuResponse>) => {
      resolve(e.data)
      worker.terminate()
    }
    worker.onerror = (err) => {
      reject(err)
      worker.terminate()
    }
    const req: CpuRequest = { n }
    worker.postMessage(req)
  })
}
