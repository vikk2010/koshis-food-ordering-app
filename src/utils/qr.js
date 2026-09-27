// Minimal QR code encoder (byte mode, error-correction level M, versions 1–40).
// No dependencies. Based on the algorithm in ISO/IEC 18004 as laid out by Project Nayuki's
// "QR Code generator" (MIT). encodeQr(text) returns a square grid of booleans (true = dark).

// Error-correction level M tables, indexed by version (index 0 unused).
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]
const ECL_FORMAT_BITS = 0 // M

const getBit = (x, i) => ((x >>> i) & 1) !== 0

function numRawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}

const numDataCodewords = (ver) => Math.floor(numRawDataModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver]

// ---- Reed–Solomon over GF(2^8) ----
function gfMul(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function rsDivisor(degree) {
  const result = new Array(degree - 1).fill(0)
  result.push(1)
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ result.shift()
    result.push(0)
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)))
  }
  return result
}

function addEccAndInterleave(data, ver) {
  const numBlocks = NUM_BLOCKS[ver]
  const eccLen = ECC_PER_BLOCK[ver]
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8)
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  const shortBlockLen = Math.floor(rawCodewords / numBlocks)
  const divisor = rsDivisor(eccLen)
  const blocks = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, divisor)
    if (i < numShortBlocks) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const result = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - eccLen || j >= numShortBlocks) result.push(block[i])
    })
  }
  return result
}

// ---- Data encoding ----
function encodeData(text) {
  const bytes = Array.from(new TextEncoder().encode(text))
  let ver = 1
  for (; ver <= 40; ver++) {
    const ccBits = ver <= 9 ? 8 : 16
    if (4 + ccBits + bytes.length * 8 <= numDataCodewords(ver) * 8) break
  }
  if (ver > 40) throw new Error('Text too long for a QR code')

  const bits = []
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1) }
  push(0b0100, 4) // byte mode
  push(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => push(b, 8))

  const capacity = numDataCodewords(ver) * 8
  push(0, Math.min(4, capacity - bits.length)) // terminator
  push(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)

  const codewords = []
  for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  return { ver, codewords }
}

// ---- Matrix ----
function alignmentPositions(ver, size) {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const step = Math.floor((ver * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2
  const result = [6]
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

function buildMatrix(ver, codewords) {
  const size = ver * 4 + 17
  const modules = Array.from({ length: size }, () => new Array(size).fill(false))
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false))
  const setFn = (x, y, dark) => { modules[y][x] = dark; isFunction[y][x] = true }

  const drawFormatBits = (mask) => {
    const data = (ECL_FORMAT_BITS << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(bits, i))
    setFn(8, 7, getBit(bits, 6))
    setFn(8, 8, getBit(bits, 7))
    setFn(7, 8, getBit(bits, 8))
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(bits, i))
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(bits, i))
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(bits, i))
    setFn(8, size - 8, true) // dark module
  }

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }
  // Finder patterns (+ separators)
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx
        const y = cy + dy
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4)
      }
    }
  }
  // Alignment patterns
  const pos = alignmentPositions(ver, size)
  const n = pos.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) setFn(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }
  drawFormatBits(0) // reserve the area; real bits are drawn after choosing a mask
  // Version information (v7+)
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i)
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(a, b, bit)
      setFn(b, a, bit)
    }
  }

  // Data codewords, zig-zag from bottom-right
  const data = addEccAndInterleave(codewords, ver)
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!isFunction[y][x] && i < data.length * 8) {
          modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7))
          i++
        }
      }
    }
  }

  const applyMask = (mask) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (isFunction[y][x]) continue
        let invert
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
        }
        if (invert) modules[y][x] = !modules[y][x]
      }
    }
  }

  let bestMask = 0
  let bestPenalty = Infinity
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask)
    drawFormatBits(mask)
    const p = penalty(modules)
    if (p < bestPenalty) { bestPenalty = p; bestMask = mask }
    applyMask(mask) // undo
  }
  applyMask(bestMask)
  drawFormatBits(bestMask)
  return modules
}

// Standard penalty score (lower = easier to scan). Only affects which mask is picked.
function penalty(m) {
  const size = m.length
  let result = 0
  const lines = []
  for (let y = 0; y < size; y++) lines.push(m[y])
  for (let x = 0; x < size; x++) lines.push(m.map((row) => row[x]))
  const finderLike = [
    [true, false, true, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, true, true, true, false, true],
  ]
  for (const line of lines) {
    // Rule 1: runs of 5+ same-colour modules
    let run = 1
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++
      else {
        if (run >= 5) result += run - 2
        run = 1
      }
    }
    // Rule 3: finder-like patterns
    for (let i = 0; i + 11 <= size; i++) {
      for (const pat of finderLike) if (pat.every((v, k) => line[i + k] === v)) result += 40
    }
  }
  // Rule 2: 2×2 blocks
  let dark = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y][x]) dark++
      if (x < size - 1 && y < size - 1) {
        const c = m[y][x]
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) result += 3
      }
    }
  }
  // Rule 4: dark/light balance
  const total = size * size
  result += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10
  return result
}

/** Encodes text (UTF-8) as a QR code. Returns rows of booleans, true = dark module. */
export function encodeQr(text) {
  const { ver, codewords } = encodeData(text)
  return buildMatrix(ver, codewords)
}

// ---- UPI ----
export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/

/**
 * UPI payment link (NPCI deep-link format) — any UPI app (GPay, PhonePe, Paytm, BHIM…) opens it
 * with the payee and amount pre-filled.
 */
export function upiPayLink({ upiId, name, amount, note }) {
  const params = [
    ['pa', upiId],
    ['pn', name],
    amount != null && ['am', Number(amount).toFixed(2)],
    ['cu', 'INR'],
    note && ['tn', note],
  ].filter(Boolean)
  // Keep "@" literal — some UPI apps don't decode %40 in the payee address.
  return 'upi://pay?' + params.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%40/g, '@')}`).join('&')
}
