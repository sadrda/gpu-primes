import type { PrimeResult } from './types.ts'
// Vite inlines the .wgsl file as a string via the `?raw` suffix.
import shaderSource from './shader.wgsl?raw'

const WORKGROUP_SIZE = 256
// WebGPU guarantees at least 65,535 workgroups per dispatch dimension, so above
// ~16.7M numbers we must spread the workgroups across a 2D grid.
const MAX_DIM = 65535

/** Thrown when WebGPU is not available in the current browser. */
export class WebGpuUnsupportedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebGpuUnsupportedError'
  }
}

interface GpuContext {
  device: GPUDevice
  pipeline: GPUComputePipeline
}

let contextPromise: Promise<GpuContext> | null = null

/** Lazily initialises the WebGPU device and compute pipeline (once). */
function getContext(): Promise<GpuContext> {
  if (contextPromise) return contextPromise
  contextPromise = (async () => {
    if (!navigator.gpu) {
      throw new WebGpuUnsupportedError(
        'WebGPU is not available. Try a recent Chrome or Edge (desktop).',
      )
    }
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new WebGpuUnsupportedError(
        'No WebGPU adapter found. Your GPU or driver may be unsupported.',
      )
    }
    const device = await adapter.requestDevice()
    const module = device.createShaderModule({ code: shaderSource })
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    })
    return { device, pipeline }
  })()
  return contextPromise
}

/** Returns true if the WebGPU pipeline can be initialised in this browser. */
export async function isGpuAvailable(): Promise<boolean> {
  try {
    await getContext()
    return true
  } catch {
    return false
  }
}

/**
 * Sums the primes below n on the GPU. Each workgroup produces one u32 partial
 * sum (see shader.wgsl); the host reduces those partials in f64.
 *
 * Timing covers the full end-to-end cost — dispatch + submit + readback — which
 * is the honest wall-clock figure to compare against the CPU.
 */
export async function sumPrimesGpu(n: number): Promise<PrimeResult> {
  const { device, pipeline } = await getContext()

  const numWorkgroups = Math.max(1, Math.ceil(n / WORKGROUP_SIZE))
  // Lay the workgroups out on a 2D grid so neither dimension exceeds MAX_DIM.
  const dispatchX = Math.min(numWorkgroups, MAX_DIM)
  const dispatchY = Math.ceil(numWorkgroups / dispatchX)
  // The grid may cover a few more workgroups than needed; the extras compute 0.
  const totalWorkgroups = dispatchX * dispatchY
  const partialsBytes = totalWorkgroups * 4

  const paramsBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  const partialsBuffer = device.createBuffer({
    size: partialsBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const readBuffer = device.createBuffer({
    size: partialsBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  })

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: partialsBuffer } },
    ],
  })

  const start = performance.now()

  device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([n]))

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(dispatchX, dispatchY)
  pass.end()
  encoder.copyBufferToBuffer(partialsBuffer, 0, readBuffer, 0, partialsBytes)
  device.queue.submit([encoder.finish()])

  await readBuffer.mapAsync(GPUMapMode.READ)
  const partials = new Uint32Array(readBuffer.getMappedRange().slice(0))
  readBuffer.unmap()

  // Reduce partials in f64 (exact for integers up to 2^53).
  let sum = 0
  for (let i = 0; i < partials.length; i++) sum += partials[i]

  const ms = performance.now() - start

  paramsBuffer.destroy()
  partialsBuffer.destroy()
  readBuffer.destroy()

  return { sum, ms }
}
