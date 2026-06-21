/** Result of a prime-sum computation. */
export interface PrimeResult {
  /** Sum of all primes strictly smaller than N. */
  sum: number
  /** Wall-clock time of the computation, in milliseconds. */
  ms: number
}

/** Message sent to the CPU worker. */
export interface CpuRequest {
  n: number
}

/** Message posted back from the CPU worker. */
export type CpuResponse = PrimeResult
