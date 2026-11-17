import {
  AngleUnit,
  ComplexValue,
  EvalResult,
  FractionValue,
  MathNode,
  NumberFormat,
  VariableName,
  VariablesMap,
} from '../types/calculator';
import * as C from './complex';

export interface EvalContext {
  angleUnit: AngleUnit;
  variables: VariablesMap;
  ans: ComplexValue;
  preAns: ComplexValue;
  numberFormat: NumberFormat;
  precisionDigits: number; // FIX/SCI decimal places or NORM digits
}

export const DEFAULT_VARIABLES: VariablesMap = {
  a: C.c(0),
  b: C.c(0),
  c: C.c(0),
  d: C.c(0),
  e: C.c(0),
  f: C.c(0),
  x: C.c(0),
  y: C.c(0),
  m: C.c(0),
};

// Angle conversion helpers
function toRadians(val: number, unit: AngleUnit): number {
  if (unit === 'DEG') return (val * Math.PI) / 180;
  if (unit === 'GRAD') return (val * Math.PI) / 200;
  return val;
}

function fromRadians(rad: number, unit: AngleUnit): number {
  if (unit === 'DEG') return (rad * 180) / Math.PI;
  if (unit === 'GRAD') return (rad * 200) / Math.PI;
  return rad;
}

// Factorial & Gamma
function gamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export function factorial(n: number): number {
  if (!Number.isFinite(n)) throw new Error('Math Error');
  if (n < 0 && Number.isInteger(n)) throw new Error('Math Error: Negative factorial');
  if (Number.isInteger(n)) {
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
  return gamma(n + 1);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

export function lcm(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b;
}

export function nPr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Math Error: Invalid nPr');
  }
  let res = 1;
  for (let i = 0; i < r; i++) res *= n - i;
  return res;
}

export function nCr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Math Error: Invalid nCr');
  }
  if (r > n - r) r = n - r;
  let res = 1;
  for (let i = 0; i < r; i++) res = (res * (n - i)) / (i + 1);
  return Math.round(res);
}

// Token stream for evaluating MathNode[]
type Token =
  | { kind: 'num'; value: number }
  | { kind: 'id'; name: string }
  | { kind: 'op'; op: string }
  | { kind: 'func'; name: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' }
  | { kind: 'ast'; node: MathNode };

const MULTI_TEXT_TOKENS = new Set([
  'sin(',
  'cos(',
  'tan(',
  'cot(',
  'asin(',
  'acos(',
  'atan(',
  'acot(',
  'sinh(',
  'cosh(',
  'tanh(',
  'coth(',
  'asinh(',
  'acosh(',
  'atanh(',
  'log(',
  'ln(',
  'abs(',
  'ceil(',
  'floor(',
  'round(',
  'gcd(',
  'lcm(',
  'pol(',
  'rec(',
  'ranint(',
  'arg(',
  'conj(',
  're(',
  'im(',
  'PreAns',
  'Ans',
  'Ran#',
  'mod',
  '÷R',
  'nPr',
  'nCr',
  '×10^',
  '(-)',
]);

function tokenizeMathNodes(nodes: MathNode[]): Token[] {
  const tokens: Token[] = [];
  let numBuf = '';

  const flushNum = () => {
    if (numBuf.length > 0) {
      // Handle DMS or trailing dot like "5." -> 5
      const val = Number(numBuf);
      if (Number.isNaN(val)) throw new Error('Syntax Error: Invalid number');
      tokens.push({ kind: 'num', value: val });
      numBuf = '';
    }
  };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type !== 'text') {
      flushNum();
      tokens.push({ kind: 'ast', node });
      continue;
    }

    const v = node.value;
    if (/^[0-9.]$/.test(v)) {
      numBuf += v;
      continue;
    }

    flushNum();

    if (v === ' ' || v === '') continue;

    if (MULTI_TEXT_TOKENS.has(v)) {
      if (v.endsWith('(')) {
        tokens.push({ kind: 'func', name: v.slice(0, -1).toLowerCase() });
      } else if (v === '×10^') {
        tokens.push({ kind: 'op', op: 'E' });
      } else if (v === '(-)') {
        tokens.push({ kind: 'op', op: 'NEG' });
      } else if (v === 'Ans' || v === 'PreAns' || v === 'Ran#') {
        tokens.push({ kind: 'id', name: v });
      } else {
        tokens.push({ kind: 'op', op: v });
      }
      continue;
    }

    // Single character tokens or symbols
    if (v === '(') tokens.push({ kind: 'lparen' });
    else if (v === ')') tokens.push({ kind: 'rparen' });
    else if (v === ',') tokens.push({ kind: 'comma' });
    else if (v === 'π' || v === 'e' || v === 'i' || v === '∞') {
      tokens.push({ kind: 'id', name: v });
    } else if (/^[a-fxym]$/i.test(v)) {
      tokens.push({ kind: 'id', name: v.toLowerCase() });
    } else if (
      ['+', '−', '-', '×', '*', '÷', '/', '!', '%', '∠', '°', "'", '"', '=', '<', '>', '≤', '≥', '≠', ';'].includes(v)
    ) {
      const normalized = v === '-' ? '−' : v === '*' ? '×' : v === '/' ? '÷' : v;
      tokens.push({ kind: 'op', op: normalized });
    } else {
      // Attempt to parse multi-char pasted text
      let j = 0;
      while (j < v.length) {
        const ch = v[j];
        if (/[0-9.]/.test(ch)) {
          let s = '';
          while (j < v.length && /[0-9.]/.test(v[j])) {
            s += v[j++];
          }
          tokens.push({ kind: 'num', value: Number(s) });
        } else if (/[a-zA-Zπ∞]/.test(ch)) {
          let s = '';
          while (j < v.length && /[a-zA-Z0-9_#π∞]/.test(v[j])) {
            s += v[j++];
          }
          if (v[j] === '(') {
            j++;
            tokens.push({ kind: 'func', name: s.toLowerCase() });
          } else {
            tokens.push({ kind: 'id', name: s });
          }
        } else if (ch === '(') {
          tokens.push({ kind: 'lparen' });
          j++;
        } else if (ch === ')') {
          tokens.push({ kind: 'rparen' });
          j++;
        } else if (ch === ',') {
          tokens.push({ kind: 'comma' });
          j++;
        } else if (ch === ' ') {
          j++;
        } else {
          tokens.push({ kind: 'op', op: ch === '-' ? '−' : ch === '*' ? '×' : ch === '/' ? '÷' : ch });
          j++;
        }
      }
    }
  }
  flushNum();
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private ctx: EvalContext;
  public lastRemainder: { quotient: number; remainder: number } | null = null;
  public hasDMS = false;

  constructor(tokens: Token[], ctx: EvalContext) {
    this.tokens = tokens;
    this.ctx = ctx;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private isValueStart(t: Token | undefined): boolean {
    if (!t) return false;
    return (
      t.kind === 'num' ||
      t.kind === 'id' ||
      t.kind === 'func' ||
      t.kind === 'lparen' ||
      (t.kind === 'ast' && t.node.type !== 'sup')
    );
  }

  public parse(): ComplexValue {
    if (this.tokens.length === 0) throw new Error('Empty expression');
    const val = this.parseRelation();
    if (this.pos < this.tokens.length) {
      const rem = this.peek();
      if (rem?.kind === 'rparen') throw new Error('Syntax Error: Unmatched )');
      throw new Error('Syntax Error');
    }
    return val;
  }

  private parseRelation(): ComplexValue {
    let left = this.parseAddSub();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t?.kind === 'op' && ['=', '<', '>', '≤', '≥', '≠'].includes(t.op)) {
        this.consume();
        const right = this.parseAddSub();
        if (!C.isReal(left) || !C.isReal(right)) throw new Error('Math Error: Complex comparison');
        const eps = 1e-10;
        let res = false;
        if (t.op === '=') res = Math.abs(left.re - right.re) < eps;
        else if (t.op === '<') res = left.re < right.re - eps;
        else if (t.op === '>') res = left.re > right.re + eps;
        else if (t.op === '≤') res = left.re <= right.re + eps;
        else if (t.op === '≥') res = left.re >= right.re - eps;
        else if (t.op === '≠') res = Math.abs(left.re - right.re) >= eps;
        left = C.c(res ? 1 : 0);
      } else {
        break;
      }
    }
    return left;
  }

  private parseAddSub(): ComplexValue {
    let left = this.parseMulDiv();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t?.kind === 'op' && (t.op === '+' || t.op === '−')) {
        this.consume();
        const right = this.parseMulDiv();
        left = t.op === '+' ? C.cAdd(left, right) : C.cSub(left, right);
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): ComplexValue {
    let left = this.parsePolarAndExp();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t?.kind === 'op' && ['×', '÷', 'mod', '÷R', 'nPr', 'nCr'].includes(t.op)) {
        this.consume();
        const right = this.parsePolarAndExp();
        if (t.op === '×') {
          left = C.cMul(left, right);
        } else if (t.op === '÷') {
          left = C.cDiv(left, right);
        } else if (t.op === 'mod') {
          if (!C.isReal(left) || !C.isReal(right) || right.re === 0) throw new Error('Math Error: mod');
          left = C.c(((left.re % right.re) + right.re) % right.re);
        } else if (t.op === '÷R') {
          if (!C.isReal(left) || !C.isReal(right) || right.re === 0) throw new Error('Math Error: ÷R');
          const q = Math.trunc(left.re / right.re);
          const r = left.re - q * right.re;
          this.lastRemainder = { quotient: q, remainder: r };
          left = C.c(q);
        } else if (t.op === 'nPr') {
          if (!C.isReal(left) || !C.isReal(right)) throw new Error('Math Error');
          left = C.c(nPr(left.re, right.re));
        } else if (t.op === 'nCr') {
          if (!C.isReal(left) || !C.isReal(right)) throw new Error('Math Error');
          left = C.c(nCr(left.re, right.re));
        }
      } else if (this.isValueStart(t)) {
        // Implicit multiplication
        const right = this.parsePolarAndExp();
        left = C.cMul(left, right);
      } else {
        break;
      }
    }
    return left;
  }

  private parsePolarAndExp(): ComplexValue {
    let left = this.parseUnary();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t?.kind === 'op' && t.op === '∠') {
        this.consume();
        const angle = this.parseUnary();
        if (!C.isReal(left) || !C.isReal(angle)) throw new Error('Math Error: Polar');
        const rad = toRadians(angle.re, this.ctx.angleUnit);
        left = C.c(left.re * Math.cos(rad), left.re * Math.sin(rad));
      } else if (t?.kind === 'op' && t.op === 'E') {
        this.consume();
        const exp = this.parseUnary();
        left = C.cMul(left, C.cPow(C.c(10), exp));
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): ComplexValue {
    const t = this.peek();
    if (t?.kind === 'op' && (t.op === '−' || t.op === '+' || t.op === 'NEG')) {
      this.consume();
      const inner = this.parseUnary();
      return t.op === '+' ? inner : C.c(-inner.re, -inner.im);
    }
    return this.parsePower();
  }

  private parsePower(): ComplexValue {
    let base = this.parsePostfix();
    const t = this.peek();
    if (t?.kind === 'ast' && t.node.type === 'sup') {
      this.consume();
      const expVal = evaluateNodes(t.node.exp, this.ctx);
      base = C.cPow(base, expVal);
      // Support chained superscripts e.g. 2^3^2
      while (this.peek()?.kind === 'ast' && (this.peek() as { kind: 'ast'; node: MathNode }).node.type === 'sup') {
        const nextSup = (this.consume() as { kind: 'ast'; node: MathNode & { type: 'sup' } }).node;
        const nextExp = evaluateNodes(nextSup.exp, this.ctx);
        base = C.cPow(base, nextExp);
      }
    } else if (t?.kind === 'op' && t.op === '^') {
      this.consume();
      const expVal = this.parseUnary();
      base = C.cPow(base, expVal);
    }
    return base;
  }

  private parsePostfix(): ComplexValue {
    let val = this.parsePrimary();
    while (this.pos < this.tokens.length) {
      const t = this.peek();
      if (t?.kind === 'op' && t.op === '!') {
        this.consume();
        if (!C.isReal(val)) throw new Error('Math Error: Complex factorial');
        val = C.c(factorial(val.re));
      } else if (t?.kind === 'op' && t.op === '%') {
        this.consume();
        val = C.cDiv(val, C.c(100));
      } else if (t?.kind === 'op' && t.op === '°') {
        this.consume();
        this.hasDMS = true;
        if (!C.isReal(val)) throw new Error('Math Error: DMS');
        const sign = val.re < 0 ? -1 : 1;
        let deg = Math.abs(val.re);
        let min = 0;
        let sec = 0;
        // Look ahead for minutes (number followed by ')
        if (
          this.peek()?.kind === 'num' &&
          this.tokens[this.pos + 1]?.kind === 'op' &&
          (this.tokens[this.pos + 1] as { kind: 'op'; op: string }).op === "'"
        ) {
          min = (this.consume() as { kind: 'num'; value: number }).value;
          this.consume(); // '
        }
        // Look ahead for seconds (number followed by ")
        if (
          this.peek()?.kind === 'num' &&
          this.tokens[this.pos + 1]?.kind === 'op' &&
          (this.tokens[this.pos + 1] as { kind: 'op'; op: string }).op === '"'
        ) {
          sec = (this.consume() as { kind: 'num'; value: number }).value;
          this.consume(); // "
        }
        val = C.c(sign * (deg + min / 60 + sec / 3600));
      } else {
        break;
      }
    }
    return val;
  }

  private parsePrimary(): ComplexValue {
    const t = this.peek();
    if (!t) throw new Error('Syntax Error: Unexpected end');

    if (t.kind === 'num') {
      this.consume();
      return C.c(t.value);
    }

    if (t.kind === 'id') {
      this.consume();
      const name = t.name;
      if (name === 'π' || name === 'pi') return C.c(Math.PI);
      if (name === 'e') return C.c(Math.E);
      if (name === 'i') return C.c(0, 1);
      if (name === '∞') return C.c(Infinity);
      if (name === 'Ans') return this.ctx.ans;
      if (name === 'PreAns') return this.ctx.preAns;
      if (name === 'Ran#') return C.c(Number(Math.random().toFixed(3)));
      const lower = name.toLowerCase() as VariableName;
      if (lower in this.ctx.variables) return this.ctx.variables[lower];
      if (name.toLowerCase() === 't') return this.ctx.variables.x;
      throw new Error(`Unknown symbol: ${name}`);
    }

    if (t.kind === 'lparen') {
      this.consume();
      const inner = this.parseRelation();
      if (this.peek()?.kind === 'rparen') this.consume();
      return inner;
    }

    if (t.kind === 'func') {
      this.consume();
      const args: ComplexValue[] = [];
      if (this.peek()?.kind !== 'rparen') {
        args.push(this.parseRelation());
        while (this.peek()?.kind === 'comma') {
          this.consume();
          args.push(this.parseRelation());
        }
      }
      if (this.peek()?.kind === 'rparen') this.consume();
      return this.evalFunction(t.name, args);
    }

    if (t.kind === 'ast') {
      this.consume();
      return this.evalAstNode(t.node);
    }

    throw new Error('Syntax Error');
  }

  private evalFunction(name: string, args: ComplexValue[]): ComplexValue {
    if (args.length === 0) throw new Error(`Syntax Error: ${name}()`);
    const a = args[0];
    const b = args[1];

    const trigArg = (z: ComplexValue) =>
      C.isReal(z) ? C.c(toRadians(z.re, this.ctx.angleUnit)) : z;
    const invTrigRes = (z: ComplexValue) =>
      C.isReal(z) ? C.c(fromRadians(z.re, this.ctx.angleUnit)) : z;

    switch (name) {
      case 'sin':
        return C.cSin(trigArg(a));
      case 'cos':
        return C.cCos(trigArg(a));
      case 'tan': {
        if (C.isReal(a) && this.ctx.angleUnit === 'DEG' && ((Math.abs(a.re) % 180) === 90)) {
          throw new Error('Math Error: tan(90°)');
        }
        return C.cTan(trigArg(a));
      }
      case 'cot':
        return C.cCot(trigArg(a));
      case 'asin':
        return invTrigRes(C.cAsin(a));
      case 'acos':
        return invTrigRes(C.cAcos(a));
      case 'atan':
        return invTrigRes(C.cAtan(a));
      case 'acot':
        return invTrigRes(C.cAtan(C.cDiv(C.c(1), a)));
      case 'sinh':
        return C.cSinh(a);
      case 'cosh':
        return C.cCosh(a);
      case 'tanh':
        return C.cTanh(a);
      case 'coth':
        return C.cDiv(C.cCosh(a), C.cSinh(a));
      case 'asinh':
        if (!C.isReal(a)) throw new Error('Math Error');
        return C.c(Math.asinh(a.re));
      case 'acosh':
        if (!C.isReal(a) || a.re < 1) throw new Error('Math Error');
        return C.c(Math.acosh(a.re));
      case 'atanh':
        if (!C.isReal(a) || Math.abs(a.re) >= 1) throw new Error('Math Error');
        return C.c(Math.atanh(a.re));
      case 'log':
        return C.cLog10(a);
      case 'ln':
        return C.cLn(a);
      case 'abs':
        return C.c(C.cAbs(a));
      case 'ceil':
        if (!C.isReal(a)) throw new Error('Math Error');
        return C.c(Math.ceil(a.re));
      case 'floor':
        if (!C.isReal(a)) throw new Error('Math Error');
        return C.c(Math.floor(a.re));
      case 'round':
        if (!C.isReal(a)) throw new Error('Math Error');
        return C.c(Math.round(a.re));
      case 'arg':
        return C.c(fromRadians(C.cArg(a), this.ctx.angleUnit));
      case 'conj':
        return C.cConj(a);
      case 're':
        return C.c(a.re);
      case 'im':
        return C.c(a.im);
      case 'gcd':
        if (!b || !C.isReal(a) || !C.isReal(b)) throw new Error('Syntax Error: gcd(a,b)');
        return C.c(gcd(a.re, b.re));
      case 'lcm':
        if (!b || !C.isReal(a) || !C.isReal(b)) throw new Error('Syntax Error: lcm(a,b)');
        return C.c(lcm(a.re, b.re));
      case 'pol':
        if (!b || !C.isReal(a) || !C.isReal(b)) throw new Error('Syntax Error: Pol(x,y)');
        // Returns r as main value, stores θ in y variable (Casio style)
        this.ctx.variables.x = C.c(Math.hypot(a.re, b.re));
        this.ctx.variables.y = C.c(fromRadians(Math.atan2(b.re, a.re), this.ctx.angleUnit));
        return this.ctx.variables.x;
      case 'rec': {
        if (!b || !C.isReal(a) || !C.isReal(b)) throw new Error('Syntax Error: Rec(r,θ)');
        const rad = toRadians(b.re, this.ctx.angleUnit);
        this.ctx.variables.x = C.c(a.re * Math.cos(rad));
        this.ctx.variables.y = C.c(a.re * Math.sin(rad));
        return this.ctx.variables.x;
      }
      case 'ranint': {
        if (!b || !C.isReal(a) || !C.isReal(b)) throw new Error('Syntax Error: RanInt(a,b)');
        const lo = Math.ceil(Math.min(a.re, b.re));
        const hi = Math.floor(Math.max(a.re, b.re));
        return C.c(Math.floor(Math.random() * (hi - lo + 1)) + lo);
      }
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  private evalAstNode(node: MathNode): ComplexValue {
    switch (node.type) {
      case 'frac': {
        const n = evaluateNodes(node.num, this.ctx);
        const d = evaluateNodes(node.den, this.ctx);
        return C.cDiv(n, d);
      }
      case 'mixed': {
        const w = evaluateNodes(node.whole, this.ctx);
        const n = evaluateNodes(node.num, this.ctx);
        const d = evaluateNodes(node.den, this.ctx);
        const frac = C.cDiv(n, d);
        const sign = C.isReal(w) && w.re < 0 ? -1 : 1;
        return sign < 0 ? C.cSub(w, frac) : C.cAdd(w, frac);
      }
      case 'sqrt': {
        const inner = evaluateNodes(node.inner, this.ctx);
        return C.cSqrt(inner);
      }
      case 'nthroot': {
        const idx = evaluateNodes(node.index, this.ctx);
        const inner = evaluateNodes(node.inner, this.ctx);
        return C.cPow(inner, C.cDiv(C.c(1), idx));
      }
      case 'logbase': {
        const base = evaluateNodes(node.base, this.ctx);
        const arg = evaluateNodes(node.arg, this.ctx);
        return C.cDiv(C.cLn(arg), C.cLn(base));
      }
      case 'abs': {
        const inner = evaluateNodes(node.inner, this.ctx);
        return C.c(C.cAbs(inner));
      }
      case 'integral': {
        const a = evaluateNodes(node.lower, this.ctx);
        const b = evaluateNodes(node.upper, this.ctx);
        if (!C.isReal(a) || !C.isReal(b)) throw new Error('Math Error: Complex bounds');
        return C.c(numericalIntegral(node.expr, a.re, b.re, this.ctx));
      }
      case 'deriv': {
        const at = evaluateNodes(node.at, this.ctx);
        if (!C.isReal(at)) throw new Error('Math Error: Complex derivative point');
        return C.c(numericalDerivative(node.expr, at.re, this.ctx));
      }
      case 'sum': {
        const lo = evaluateNodes(node.lower, this.ctx);
        const hi = evaluateNodes(node.upper, this.ctx);
        if (!C.isReal(lo) || !C.isReal(hi)) throw new Error('Math Error: Bounds');
        const start = Math.round(lo.re);
        const end = Math.round(hi.re);
        if (end - start > 10000) throw new Error('Range too large');
        let acc = C.c(0);
        const savedX = this.ctx.variables.x;
        for (let k = start; k <= end; k++) {
          const localCtx: EvalContext = {
            ...this.ctx,
            variables: { ...this.ctx.variables, x: C.c(k) },
          };
          acc = C.cAdd(acc, evaluateNodes(node.expr, localCtx));
        }
        this.ctx.variables.x = savedX;
        return acc;
      }
      case 'prod': {
        const lo = evaluateNodes(node.lower, this.ctx);
        const hi = evaluateNodes(node.upper, this.ctx);
        if (!C.isReal(lo) || !C.isReal(hi)) throw new Error('Math Error: Bounds');
        const start = Math.round(lo.re);
        const end = Math.round(hi.re);
        if (end - start > 5000) throw new Error('Range too large');
        let acc = C.c(1);
        const savedX = this.ctx.variables.x;
        for (let k = start; k <= end; k++) {
          const localCtx: EvalContext = {
            ...this.ctx,
            variables: { ...this.ctx.variables, x: C.c(k) },
          };
          acc = C.cMul(acc, evaluateNodes(node.expr, localCtx));
        }
        this.ctx.variables.x = savedX;
        return acc;
      }
      case 'limit': {
        const to = evaluateNodes(node.to, this.ctx);
        if (!C.isReal(to)) throw new Error('Math Error: Limit');
        return C.c(numericalLimit(node.expr, to.re, this.ctx));
      }
      default:
        throw new Error('Syntax Error');
    }
  }
}

export function evaluateNodes(nodes: MathNode[], ctx: EvalContext): ComplexValue {
  const tokens = tokenizeMathNodes(nodes);
  const parser = new Parser(tokens, ctx);
  return parser.parse();
}

// Numerical Calculus helpers
function evalAtX(expr: MathNode[], xVal: number, ctx: EvalContext): number {
  const localCtx: EvalContext = {
    ...ctx,
    variables: { ...ctx.variables, x: C.c(xVal) },
  };
  const res = evaluateNodes(expr, localCtx);
  if (!C.isReal(res)) throw new Error('Math Error: Complex result in calculus');
  return res.re;
}

function numericalDerivative(expr: MathNode[], x0: number, ctx: EvalContext): number {
  const h = Math.max(1e-5, Math.abs(x0) * 1e-5);
  const f1 = (evalAtX(expr, x0 + h, ctx) - evalAtX(expr, x0 - h, ctx)) / (2 * h);
  const h2 = h / 2;
  const f2 = (evalAtX(expr, x0 + h2, ctx) - evalAtX(expr, x0 - h2, ctx)) / (2 * h2);
  return (4 * f2 - f1) / 3;
}

function numericalIntegral(expr: MathNode[], a: number, b: number, ctx: EvalContext): number {
  if (a === b) return 0;
  const sign = b < a ? -1 : 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  // 7-point Gauss-Legendre on 16 subintervals (112 evaluations - accurate & fast)
  const nodes = [
    -0.9491079123427585, -0.7415311855993945, -0.4058451513773972, 0,
    0.4058451513773972, 0.7415311855993945, 0.9491079123427585,
  ];
  const weights = [
    0.1294849661688697, 0.2797053914892766, 0.3818300505051189, 0.4179591836734694,
    0.3818300505051189, 0.2797053914892766, 0.1294849661688697,
  ];
  const segments = 16;
  const step = (hi - lo) / segments;
  let total = 0;
  for (let s = 0; s < segments; s++) {
    const x0 = lo + s * step;
    const x1 = x0 + step;
    const mid = 0.5 * (x0 + x1);
    const half = 0.5 * (x1 - x0);
    let sum = 0;
    for (let i = 0; i < nodes.length; i++) {
      sum += weights[i] * evalAtX(expr, mid + half * nodes[i], ctx);
    }
    total += half * sum;
  }
  return sign * total;
}

function numericalLimit(expr: MathNode[], target: number, ctx: EvalContext): number {
  if (!Number.isFinite(target)) {
    const big = target > 0 ? 1e6 : -1e6;
    return evalAtX(expr, big, ctx);
  }
  const eps = 1e-7;
  const left = evalAtX(expr, target - eps, ctx);
  const right = evalAtX(expr, target + eps, ctx);
  if (Math.abs(left - right) > 1e-2) {
    throw new Error('Limit does not exist (left ≠ right)');
  }
  return (left + right) / 2;
}

// Equation solver for expressions (supports '=' or expr = 0)
export function solveForX(nodes: MathNode[], initialGuess: number, ctx: EvalContext): number {
  // Check if there is a top-level '=' text node
  const eqIdx = nodes.findIndex((n) => n.type === 'text' && n.value === '=');
  const lhs = eqIdx >= 0 ? nodes.slice(0, eqIdx) : nodes;
  const rhs = eqIdx >= 0 ? nodes.slice(eqIdx + 1) : [];

  const f = (x: number) => {
    const l = evalAtX(lhs, x, ctx);
    const r = rhs.length > 0 ? evalAtX(rhs, x, ctx) : 0;
    return l - r;
  };

  const guesses = [initialGuess, 0, 1, -1, 2, -2, 5, -5, 10, -10];
  for (const g of guesses) {
    let x = g;
    for (let iter = 0; iter < 80; iter++) {
      let fx: number;
      try {
        fx = f(x);
      } catch {
        break;
      }
      if (!Number.isFinite(fx)) break;
      if (Math.abs(fx) < 1e-11) return Math.abs(x) < 1e-12 ? 0 : x;

      const h = Math.max(1e-6, Math.abs(x) * 1e-6);
      let dfx: number;
      try {
        dfx = (f(x + h) - f(x - h)) / (2 * h);
      } catch {
        break;
      }
      if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
        x += 0.1;
        continue;
      }
      const next = x - fx / dfx;
      if (Math.abs(next - x) < 1e-12) {
        if (Math.abs(f(next)) < 1e-7) return Math.abs(next) < 1e-12 ? 0 : next;
      }
      x = next;
    }
  }
  throw new Error('Could not solve equation near guess');
}

// Rational & Symbolic exact representations
export function toFraction(x: number, maxDen = 10000): FractionValue | null {
  if (!Number.isFinite(x)) return null;
  const sign: 1 | -1 = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  if (Math.abs(ax - Math.round(ax)) < 1e-11) {
    return { sign, num: Math.round(ax), den: 1 };
  }
  let h1 = 1,
    h2 = 0,
    k1 = 0,
    k2 = 1;
  let b = ax;
  for (let i = 0; i < 32; i++) {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    if (k > maxDen) break;
    h2 = h1;
    h1 = h;
    k2 = k1;
    k1 = k;
    if (Math.abs(ax - h1 / k1) < 1e-10) {
      return { sign, num: h1, den: k1 };
    }
    const rem = b - a;
    if (rem < 1e-12) break;
    b = 1 / rem;
  }
  return null;
}

export function formatFractionStr(f: FractionValue, mixed = false): string {
  const s = f.sign < 0 ? '-' : '';
  if (f.den === 1) return `${s}${f.num}`;
  if (mixed && f.num > f.den) {
    const whole = Math.floor(f.num / f.den);
    const rem = f.num % f.den;
    return `${s}${whole} ${rem}/${f.den}`;
  }
  return `${s}${f.num}/${f.den}`;
}

export function primeFactorization(n: number): string | null {
  if (!Number.isInteger(n) || n < 2 || n > 1e12) return null;
  let rem = n;
  const factors: Array<{ p: number; e: number }> = [];
  for (let p = 2; p * p <= rem; p += p === 2 ? 1 : 2) {
    if (rem % p === 0) {
      let e = 0;
      while (rem % p === 0) {
        rem /= p;
        e++;
      }
      factors.push({ p, e });
    }
  }
  if (rem > 1) factors.push({ p: rem, e: 1 });
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  const toSup = (k: number) =>
    String(k)
      .split('')
      .map((d) => supMap[d] || d)
      .join('');
  return factors.map((f) => (f.e === 1 ? `${f.p}` : `${f.p}${toSup(f.e)}`)).join(' × ');
}

export function toDMS(val: number): { deg: number; min: number; sec: number; negative: boolean } {
  const negative = val < 0;
  let abs = Math.abs(val);
  const deg = Math.floor(abs + 1e-12);
  abs = (abs - deg) * 60;
  let min = Math.floor(abs + 1e-10);
  let sec = Number(((abs - min) * 60).toFixed(2));
  if (sec >= 60) {
    sec -= 60;
    min += 1;
  }
  return { deg, min, sec, negative };
}

export function formatRealNumber(
  x: number,
  format: NumberFormat,
  precision: number
): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '-∞' : 'NaN';
  if (Math.abs(x) < 1e-13) return '0';

  if (format === 'FIX') {
    return x.toFixed(Math.min(Math.max(precision, 0), 10));
  }
  if (format === 'SCI') {
    const str = x.toExponential(Math.min(Math.max(precision, 1), 10));
    return str.replace(/e\+?/, '×10^');
  }
  if (format === 'ENG') {
    const sign = x < 0 ? '-' : '';
    const ax = Math.abs(x);
    const exp3 = Math.floor(Math.log10(ax) / 3) * 3;
    const mant = ax / Math.pow(10, exp3);
    const mStr = Number(mant.toPrecision(precision)).toString();
    return exp3 === 0 ? `${sign}${mStr}` : `${sign}${mStr}×10^${exp3}`;
  }

  // NORM-11 default
  const ax = Math.abs(x);
  if (ax >= 1e11 || (ax > 0 && ax < 1e-9)) {
    const s = x.toExponential(8).replace(/\.?0+e/, 'e').replace(/e\+?/, '×10^');
    return s;
  }
  const rounded = Number(x.toPrecision(11));
  return rounded.toString();
}

export function formatComplex(
  z: ComplexValue,
  format: NumberFormat,
  precision: number
): string {
  if (C.isReal(z)) return formatRealNumber(z.re, format, precision);
  const reStr = Math.abs(z.re) < 1e-11 ? '' : formatRealNumber(z.re, format, precision);
  const absIm = Math.abs(z.im);
  const imCoeff = Math.abs(absIm - 1) < 1e-11 ? '' : formatRealNumber(absIm, format, precision);
  const sign = z.im < 0 ? (reStr ? ' − ' : '-') : reStr ? ' + ' : '';
  return `${reStr}${sign}${imCoeff}i`;
}

export function evaluateFull(nodes: MathNode[], ctx: EvalContext): EvalResult {
  try {
    const tokens = tokenizeMathNodes(nodes);
    const parser = new Parser(tokens, ctx);
    const val = parser.parse();

    if (parser.lastRemainder) {
      const { quotient, remainder } = parser.lastRemainder;
      const rFmt = formatRealNumber(remainder, ctx.numberFormat, ctx.precisionDigits);
      const txt = `${quotient} R ${rFmt}`;
      return {
        ok: true,
        numeric: quotient,
        complex: C.c(quotient),
        remainder: parser.lastRemainder,
        formattedDecimal: txt,
        formattedExact: txt,
        displayVariants: [txt],
      };
    }

    const formattedDecimal = formatComplex(val, ctx.numberFormat, ctx.precisionDigits);
    const variants: string[] = [];

    if (C.isReal(val)) {
      const x = val.re;
      let formattedExact: string | undefined;

      // Check fraction
      const frac = toFraction(x, 10000);
      if (frac && frac.den > 1) {
        formattedExact = formatFractionStr(frac, false);
        variants.push(formattedExact);
        if (frac.num > frac.den) {
          variants.push(formatFractionStr(frac, true));
        }
      }

      // Check clean π multiple
      const piRatio = toFraction(x / Math.PI, 120);
      if (piRatio && Math.abs(x) > 1e-9) {
        const s = piRatio.sign < 0 ? '-' : '';
        const nStr = piRatio.num === 1 ? '' : `${piRatio.num}`;
        const dStr = piRatio.den === 1 ? '' : `/${piRatio.den}`;
        const piStr = `${s}${nStr}π${dStr}`;
        if (!formattedExact) formattedExact = piStr;
        variants.push(piStr);
      }

      // Check clean √k multiple (k = 2,3,5,6,7,10)
      if (!frac) {
        for (const k of [2, 3, 5, 6, 7, 10]) {
          const sqRatio = toFraction(x / Math.sqrt(k), 120);
          if (sqRatio && Math.abs(x) > 1e-9) {
            const s = sqRatio.sign < 0 ? '-' : '';
            const nStr = sqRatio.num === 1 ? '' : `${sqRatio.num}`;
            const dStr = sqRatio.den === 1 ? '' : `/${sqRatio.den}`;
            const sqStr = `${s}${nStr}√${k}${dStr}`;
            if (!formattedExact) formattedExact = sqStr;
            variants.push(sqStr);
            break;
          }
        }
      }

      variants.push(formattedDecimal);
      const dms = toDMS(x);
      if (parser.hasDMS) {
        const dmsStr = `${dms.negative ? '-' : ''}${dms.deg}°${dms.min}'${dms.sec}"`;
        variants.unshift(dmsStr);
      }

      const uniqueVariants = Array.from(new Set(variants));
      const pf = Number.isInteger(x) ? primeFactorization(x) ?? undefined : undefined;

      return {
        ok: true,
        numeric: x,
        complex: val,
        fraction: frac ?? undefined,
        dms,
        primeFactors: pf,
        formattedDecimal,
        formattedExact,
        displayVariants: uniqueVariants,
      };
    }

    // Complex number polar variant
    const r = C.cAbs(val);
    const theta = fromRadians(C.cArg(val), ctx.angleUnit);
    const polarStr = `${formatRealNumber(r, ctx.numberFormat, ctx.precisionDigits)}∠${formatRealNumber(
      theta,
      ctx.numberFormat,
      ctx.precisionDigits
    )}`;
    return {
      ok: true,
      complex: val,
      formattedDecimal,
      displayVariants: [formattedDecimal, polarStr],
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Syntax Error',
      formattedDecimal: '',
      displayVariants: [],
    };
  }
}
