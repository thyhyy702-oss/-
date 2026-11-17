import { ComplexValue } from '../types/calculator';

export const c = (re: number, im = 0): ComplexValue => ({
  re: Math.abs(re) < 1e-13 ? 0 : re,
  im: Math.abs(im) < 1e-13 ? 0 : im,
});

export const isReal = (z: ComplexValue): boolean => Math.abs(z.im) < 1e-11;

export const cAdd = (a: ComplexValue, b: ComplexValue): ComplexValue =>
  c(a.re + b.re, a.im + b.im);

export const cSub = (a: ComplexValue, b: ComplexValue): ComplexValue =>
  c(a.re - b.re, a.im - b.im);

export const cMul = (a: ComplexValue, b: ComplexValue): ComplexValue =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

export const cDiv = (a: ComplexValue, b: ComplexValue): ComplexValue => {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) throw new Error('Math Error: Division by zero');
  return c(
    (a.re * b.re + a.im * b.im) / denom,
    (a.im * b.re - a.re * b.im) / denom
  );
};

export const cAbs = (z: ComplexValue): number => Math.hypot(z.re, z.im);

export const cArg = (z: ComplexValue): number => Math.atan2(z.im, z.re);

export const cConj = (z: ComplexValue): ComplexValue => c(z.re, -z.im);

export const cExp = (z: ComplexValue): ComplexValue => {
  const r = Math.exp(z.re);
  return c(r * Math.cos(z.im), r * Math.sin(z.im));
};

export const cLn = (z: ComplexValue): ComplexValue => {
  const r = cAbs(z);
  if (r === 0) throw new Error('Math Error: ln(0)');
  return c(Math.log(r), cArg(z));
};

export const cLog10 = (z: ComplexValue): ComplexValue =>
  cDiv(cLn(z), c(Math.LN10));

export const cPow = (base: ComplexValue, exp: ComplexValue): ComplexValue => {
  if (isReal(base) && isReal(exp)) {
    const x = base.re;
    const y = exp.re;
    if (x === 0 && y < 0) throw new Error('Math Error: 0 to negative power');
    if (x === 0 && y === 0) return c(1);
    if (x > 0) return c(Math.pow(x, y));
    // Negative base with integer or rational exponent
    if (Number.isInteger(y)) return c(Math.pow(x, y));
    // Check odd denominator rational e.g. (-8)^(1/3) = -2 for real branch
    for (let den = 3; den <= 99; den += 2) {
      const num = Math.round(y * den);
      if (Math.abs(y - num / den) < 1e-10) {
        const root = Math.pow(Math.abs(x), num / den);
        return c(num % 2 !== 0 ? -root : root);
      }
    }
  }
  if (base.re === 0 && base.im === 0) {
    if (exp.re > 0) return c(0);
    throw new Error('Math Error: Invalid power');
  }
  return cExp(cMul(exp, cLn(base)));
};

export const cSqrt = (z: ComplexValue): ComplexValue => {
  if (isReal(z)) {
    if (z.re >= 0) return c(Math.sqrt(z.re), 0);
    return c(0, Math.sqrt(-z.re));
  }
  const r = cAbs(z);
  const re = Math.sqrt((r + z.re) / 2);
  const im = (z.im >= 0 ? 1 : -1) * Math.sqrt((r - z.re) / 2);
  return c(re, im);
};

export const cSin = (z: ComplexValue): ComplexValue => {
  if (isReal(z)) return c(Math.sin(z.re));
  return c(
    Math.sin(z.re) * Math.cosh(z.im),
    Math.cos(z.re) * Math.sinh(z.im)
  );
};

export const cCos = (z: ComplexValue): ComplexValue => {
  if (isReal(z)) return c(Math.cos(z.re));
  return c(
    Math.cos(z.re) * Math.cosh(z.im),
    -Math.sin(z.re) * Math.sinh(z.im)
  );
};

export const cTan = (z: ComplexValue): ComplexValue =>
  cDiv(cSin(z), cCos(z));

export const cCot = (z: ComplexValue): ComplexValue =>
  cDiv(cCos(z), cSin(z));

export const cSinh = (z: ComplexValue): ComplexValue =>
  c(Math.sinh(z.re) * Math.cos(z.im), Math.cosh(z.re) * Math.sin(z.im));

export const cCosh = (z: ComplexValue): ComplexValue =>
  c(Math.cosh(z.re) * Math.cos(z.im), Math.sinh(z.re) * Math.sin(z.im));

export const cTanh = (z: ComplexValue): ComplexValue =>
  cDiv(cSinh(z), cCosh(z));

export const cAsin = (z: ComplexValue): ComplexValue => {
  if (isReal(z) && z.re >= -1 && z.re <= 1) return c(Math.asin(z.re));
  // -i * ln(iz + sqrt(1 - z^2))
  const iz = c(-z.im, z.re);
  const under = cSub(c(1), cMul(z, z));
  const lnVal = cLn(cAdd(iz, cSqrt(under)));
  return cMul(c(0, -1), lnVal);
};

export const cAcos = (z: ComplexValue): ComplexValue => {
  if (isReal(z) && z.re >= -1 && z.re <= 1) return c(Math.acos(z.re));
  return cSub(c(Math.PI / 2), cAsin(z));
};

export const cAtan = (z: ComplexValue): ComplexValue => {
  if (isReal(z)) return c(Math.atan(z.re));
  // (i/2) * ln((1 - iz) / (1 + iz))
  const iz = c(-z.im, z.re);
  const ratio = cDiv(cSub(c(1), iz), cAdd(c(1), iz));
  return cMul(c(0, 0.5), cLn(ratio));
};
