- [deployment](https://sadrda.github.io/gpu-primes/)

a side-by-side demo comparing summing the primes below N on the cpu (single-threaded trial division in a web worker, left) versus on the gpu via a webgpu compute shader (one thread per number, right). drag the slider to set N and hit run to race them — at small N the cpu wins on setup overhead, but as N grows the gpu's parallelism pulls far ahead. each side shows its sum, elapsed time, and a bar, and a verdict line reports the speedup and confirms both sums match.
