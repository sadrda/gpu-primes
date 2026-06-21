// Why partial sums: the full sum of primes below N (e.g. ~2.8e14 at N=100M)
// overflows a u32. But one workgroup covers 256 consecutive numbers, and primes
// are sparse, so a workgroup's partial sum stays under 2^32 up to ~167M
// (empirically ~2.55e9 max at N=100M, i.e. 1.68x headroom). The host sums the
// partials in f64 (exact to 2^53).
//
// The dispatch is a 2D grid (X capped at the 65,535-per-dimension limit), so we
// reconstruct a linear workgroup index from workgroup_id and num_workgroups.

const WORKGROUP_SIZE: u32 = 256u;

struct Params {
  n: u32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> partials: array<u32>;

var<workgroup> scratch: array<u32, 256>;

fn is_prime(k: u32) -> bool {
  if (k < 2u) { return false; }
  if (k == 2u) { return true; }
  if ((k & 1u) == 0u) { return false; }
  var i: u32 = 3u;
  // For k < 1e8, i stays < ~10000, so i*i never overflows u32.
  loop {
    if (i * i > k) { break; }
    if (k % i == 0u) { return false; }
    i += 2u;
  }
  return true;
}

@compute @workgroup_size(256)
fn main(
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
  @builtin(num_workgroups) nwg: vec3<u32>,
) {
  let wg_index = wid.y * nwg.x + wid.x;
  let k = wg_index * WORKGROUP_SIZE + lid.x;
  var value: u32 = 0u;
  if (k < params.n && is_prime(k)) {
    value = k;
  }
  scratch[lid.x] = value;

  workgroupBarrier();

  var stride: u32 = WORKGROUP_SIZE / 2u;
  loop {
    if (stride == 0u) { break; }
    if (lid.x < stride) {
      scratch[lid.x] = scratch[lid.x] + scratch[lid.x + stride];
    }
    workgroupBarrier();
    stride = stride >> 1u;
  }

  if (lid.x == 0u) {
    partials[wg_index] = scratch[0];
  }
}
