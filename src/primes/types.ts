export interface PrimeResult {
  sum: number
  ms: number
}

export interface CpuRequest {
  n: number
}

export type CpuResponse = PrimeResult
