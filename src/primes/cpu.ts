import type { CpuRequest, CpuResponse, PrimeResult } from './types.ts'
import CpuWorker from './cpu.worker.ts?worker'

/**
 * Runs in a background Web Worker so the main thread (and thus the UI) stays
 * responsive while the CPU grinds. A fresh worker per run avoids stale-state
 * bugs between runs.
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
