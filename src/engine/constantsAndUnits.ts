import { MatrixData, VectorData } from '../types/calculator';

export interface ScientificConstant {
  symbol: string;
  name: string;
  value: number;
  unit: string;
  category: 'Universal' | 'Electromagnetic' | 'Atomic' | 'Physico-Chemical';
}

export const SCIENTIFIC_CONSTANTS: ScientificConstant[] = [
  { symbol: 'c', name: 'Speed of light in vacuum', value: 299792458, unit: 'm/s', category: 'Universal' },
  { symbol: 'G', name: 'Newtonian constant of gravitation', value: 6.6743e-11, unit: 'm³/(kg·s²)', category: 'Universal' },
  { symbol: 'h', name: 'Planck constant', value: 6.62607015e-34, unit: 'J·s', category: 'Universal' },
  { symbol: 'ħ', name: 'Reduced Planck constant', value: 1.054571817e-34, unit: 'J·s', category: 'Universal' },
  { symbol: 'g', name: 'Standard acceleration of gravity', value: 9.80665, unit: 'm/s²', category: 'Universal' },
  { symbol: 'e₀', name: 'Elementary charge', value: 1.602176634e-19, unit: 'C', category: 'Electromagnetic' },
  { symbol: 'ε₀', name: 'Vacuum electric permittivity', value: 8.8541878128e-12, unit: 'F/m', category: 'Electromagnetic' },
  { symbol: 'μ₀', name: 'Vacuum magnetic permeability', value: 1.25663706212e-6, unit: 'N/A²', category: 'Electromagnetic' },
  { symbol: 'kₑ', name: 'Coulomb constant', value: 8.9875517923e9, unit: 'N·m²/C²', category: 'Electromagnetic' },
  { symbol: 'mₑ', name: 'Electron mass', value: 9.1093837015e-31, unit: 'kg', category: 'Atomic' },
  { symbol: 'mₚ', name: 'Proton mass', value: 1.67262192369e-27, unit: 'kg', category: 'Atomic' },
  { symbol: 'mₙ', name: 'Neutron mass', value: 1.67492749804e-27, unit: 'kg', category: 'Atomic' },
  { symbol: 'a₀', name: 'Bohr radius', value: 5.29177210903e-11, unit: 'm', category: 'Atomic' },
  { symbol: 'Nₐ', name: 'Avogadro constant', value: 6.02214076e23, unit: '1/mol', category: 'Physico-Chemical' },
  { symbol: 'R', name: 'Molar gas constant', value: 8.314462618, unit: 'J/(mol·K)', category: 'Physico-Chemical' },
  { symbol: 'k_B', name: 'Boltzmann constant', value: 1.380649e-23, unit: 'J/K', category: 'Physico-Chemical' },
  { symbol: 'σ', name: 'Stefan-Boltzmann constant', value: 5.670374419e-8, unit: 'W/(m²·K⁴)', category: 'Physico-Chemical' },
  { symbol: 'atm', name: 'Standard atmosphere', value: 101325, unit: 'Pa', category: 'Physico-Chemical' },
];

export interface SIPrefix {
  symbol: string;
  name: string;
  factor: number;
  exponent: number;
}

export const SI_PREFIXES: SIPrefix[] = [
  { symbol: 'T', name: 'Tera', factor: 1e12, exponent: 12 },
  { symbol: 'G', name: 'Giga', factor: 1e9, exponent: 9 },
  { symbol: 'M', name: 'Mega', factor: 1e6, exponent: 6 },
  { symbol: 'k', name: 'Kilo', factor: 1e3, exponent: 3 },
  { symbol: 'h', name: 'Hecto', factor: 1e2, exponent: 2 },
  { symbol: 'da', name: 'Deca', factor: 1e1, exponent: 1 },
  { symbol: 'd', name: 'Deci', factor: 1e-1, exponent: -1 },
  { symbol: 'c', name: 'Centi', factor: 1e-2, exponent: -2 },
  { symbol: 'm', name: 'Milli', factor: 1e-3, exponent: -3 },
  { symbol: 'μ', name: 'Micro', factor: 1e-6, exponent: -6 },
  { symbol: 'n', name: 'Nano', factor: 1e-9, exponent: -9 },
  { symbol: 'p', name: 'Pico', factor: 1e-12, exponent: -12 },
  { symbol: 'f', name: 'Femto', factor: 1e-15, exponent: -15 },
];

export interface UnitCategory {
  id: string;
  name: string;
  units: Array<{
    id: string;
    label: string;
    toBase: (v: number) => number;
    fromBase: (v: number) => number;
  }>;
}

const linear = (id: string, label: string, factorToBase: number) => ({
  id,
  label,
  toBase: (v: number) => v * factorToBase,
  fromBase: (v: number) => v / factorToBase,
});

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    units: [
      linear('m', 'Meter (m)', 1),
      linear('km', 'Kilometer (km)', 1000),
      linear('cm', 'Centimeter (cm)', 0.01),
      linear('mm', 'Millimeter (mm)', 0.001),
      linear('um', 'Micrometer (μm)', 1e-6),
      linear('mi', 'Mile (mi)', 1609.344),
      linear('yd', 'Yard (yd)', 0.9144),
      linear('ft', 'Foot (ft)', 0.3048),
      linear('in', 'Inch (in)', 0.0254),
      linear('nmi', 'Nautical Mile', 1852),
    ],
  },
  {
    id: 'mass',
    name: 'Mass',
    units: [
      linear('kg', 'Kilogram (kg)', 1),
      linear('g', 'Gram (g)', 0.001),
      linear('mg', 'Milligram (mg)', 1e-6),
      linear('t', 'Metric Ton (t)', 1000),
      linear('lb', 'Pound (lb)', 0.45359237),
      linear('oz', 'Ounce (oz)', 0.028349523125),
    ],
  },
  {
    id: 'temp',
    name: 'Temperature',
    units: [
      { id: 'C', label: 'Celsius (°C)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'F', label: 'Fahrenheit (°F)', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'K', label: 'Kelvin (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    units: [
      linear('m2', 'Square Meter (m²)', 1),
      linear('km2', 'Square Kilometer (km²)', 1e6),
      linear('cm2', 'Square Centimeter (cm²)', 1e-4),
      linear('ha', 'Hectare (ha)', 10000),
      linear('acre', 'Acre', 4046.8564224),
      linear('ft2', 'Square Foot (ft²)', 0.09290304),
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    units: [
      linear('L', 'Liter (L)', 1),
      linear('mL', 'Milliliter (mL)', 0.001),
      linear('m3', 'Cubic Meter (m³)', 1000),
      linear('gal', 'US Gallon (gal)', 3.785411784),
      linear('floz', 'US Fluid Ounce', 0.0295735295625),
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    units: [
      linear('mps', 'm/s', 1),
      linear('kmh', 'km/h', 1 / 3.6),
      linear('mph', 'mph', 0.44704),
      linear('kn', 'Knot (kn)', 0.5144444444),
      linear('mach', 'Mach', 340.29),
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    units: [
      linear('J', 'Joule (J)', 1),
      linear('kJ', 'Kilojoule (kJ)', 1000),
      linear('cal', 'Calorie (cal)', 4.184),
      linear('kcal', 'Kilocalorie (kcal)', 4184),
      linear('Wh', 'Watt-hour (Wh)', 3600),
      linear('kWh', 'Kilowatt-hour (kWh)', 3.6e6),
      linear('eV', 'Electronvolt (eV)', 1.602176634e-19),
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    units: [
      linear('Pa', 'Pascal (Pa)', 1),
      linear('kPa', 'Kilopascal (kPa)', 1000),
      linear('bar', 'Bar', 1e5),
      linear('atm', 'Atmosphere (atm)', 101325),
      linear('psi', 'PSI (lb/in²)', 6894.757293168),
      linear('mmHg', 'mmHg (Torr)', 133.322387415),
    ],
  },
];

// Matrix operations
export function matAdd(A: MatrixData, B: MatrixData): MatrixData {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('Dimension mismatch for A + B');
  }
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

export function matSub(A: MatrixData, B: MatrixData): MatrixData {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('Dimension mismatch for A - B');
  }
  return A.map((row, i) => row.map((v, j) => v - B[i][j]));
}

export function matMul(A: MatrixData, B: MatrixData): MatrixData {
  if (A[0].length !== B.length) {
    throw new Error('Columns of A must equal rows of B');
  }
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < inner; k++) sum += A[i][k] * B[k][j];
      return Number(sum.toFixed(10));
    })
  );
}

export function matTranspose(A: MatrixData): MatrixData {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

export function matDeterminant(A: MatrixData): number {
  const n = A.length;
  if (n !== A[0].length) throw new Error('Matrix must be square');
  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const m = A.map((r) => [...r]);
  let det = 1;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(m[r][i]) > Math.abs(m[pivot][i])) pivot = r;
    }
    if (Math.abs(m[pivot][i]) < 1e-12) return 0;
    if (pivot !== i) {
      [m[i], m[pivot]] = [m[pivot], m[i]];
      det *= -1;
    }
    det *= m[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = m[r][i] / m[i][i];
      for (let c = i; c < n; c++) m[r][c] -= f * m[i][c];
    }
  }
  return Number(det.toFixed(10));
}

export function matInverse(A: MatrixData): MatrixData {
  const n = A.length;
  if (n !== A[0].length) throw new Error('Matrix must be square');
  const aug = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(aug[r][i]) > Math.abs(aug[pivot][i])) pivot = r;
    }
    if (Math.abs(aug[pivot][i]) < 1e-12) throw new Error('Matrix is singular (det = 0)');
    [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
    const div = aug[i][i];
    for (let c = 0; c < 2 * n; c++) aug[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = aug[r][i];
      for (let c = 0; c < 2 * n; c++) aug[r][c] -= f * aug[i][c];
    }
  }
  return aug.map((row) => row.slice(n).map((v) => Number(v.toFixed(8))));
}

// Vector operations
export function vecMag(v: VectorData): number {
  return Math.hypot(...v);
}

export function vecDot(a: VectorData, b: VectorData): number {
  if (a.length !== b.length) throw new Error('Vector dimensions must match');
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}

export function vecCross(a: VectorData, b: VectorData): VectorData {
  const a3 = [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0];
  const b3 = [b[0] ?? 0, b[1] ?? 0, b[2] ?? 0];
  return [
    a3[1] * b3[2] - a3[2] * b3[1],
    a3[2] * b3[0] - a3[0] * b3[2],
    a3[0] * b3[1] - a3[1] * b3[0],
  ];
}

// Probability Distributions
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function normalPDF(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

export function normalCDF(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

export function binomialPMF(k: number, n: number, p: number): number {
  let coeff = 1;
  for (let i = 0; i < k; i++) coeff = (coeff * (n - i)) / (i + 1);
  return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function poissonPMF(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

// Statistics
export interface StatSummary {
  n: number;
  meanX: number;
  sumX: number;
  sumX2: number;
  popStdX: number;
  sampStdX: number;
  minX: number;
  medianX: number;
  maxX: number;
  meanY?: number;
  regSlope?: number;
  regIntercept?: number;
  regR?: number;
}

export function computeStatistics(points: Array<{ x: number; y?: number }>): StatSummary | null {
  if (points.length === 0) return null;
  const n = points.length;
  const xs = points.map((p) => p.x);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const meanX = sumX / n;
  const popVar = Math.max(0, sumX2 / n - meanX * meanX);
  const sampVar = n > 1 ? xs.reduce((a, b) => a + (b - meanX) ** 2, 0) / (n - 1) : 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const medianX = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const summary: StatSummary = {
    n,
    meanX,
    sumX,
    sumX2,
    popStdX: Math.sqrt(popVar),
    sampStdX: Math.sqrt(sampVar),
    minX: sorted[0],
    medianX,
    maxX: sorted[n - 1],
  };

  if (points.every((p) => typeof p.y === 'number')) {
    const ys = points.map((p) => p.y as number);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const meanY = sumY / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    const b = sxx === 0 ? 0 : sxy / sxx;
    const a = meanY - b * meanX;
    const r = sxx * syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
    summary.meanY = meanY;
    summary.regSlope = b;
    summary.regIntercept = a;
    summary.regR = r;
  }

  return summary;
}
