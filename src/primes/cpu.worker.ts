/// <reference lib="webworker" />
import type { CpuRequest, CpuResponse } from './types.ts'

/**
 * Deliberately the SAME algorithm the GPU shader runs (no sieve), so the
 * CPU-vs-GPU comparison isolates raw parallelism rather than algorithmic
 * differences. The sum is accumulated in a JS number (f64), which is exact for
 * integers up to 2^53 — far above the ~2.8e14 max at n = 100,000,000.
 */
function sumPrimesBelow(n: number): number {
  let sum = 0
  if (n > 2) sum += 2
  for (let k = 3; k < n; k += 2) {
    let isPrime = true
    for (let i = 3; i * i <= k; i += 2) {
      if (k % i === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) sum += k
  }
  return sum
}

self.onmessage = (e: MessageEvent<CpuRequest>) => {
  const { n } = e.data
  const start = performance.now()
  const sum = sumPrimesBelow(n)
  const ms = performance.now() - start
  const response: CpuResponse = { sum, ms }
  ;(self as DedicatedWorkerGlobalScope).postMessage(response)
}
