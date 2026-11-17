export type AngleUnit = 'DEG' | 'RAD' | 'GRAD';
export type NumberFormat = 'NORM' | 'FIX' | 'SCI' | 'ENG';
export type InputMode = 'MATH' | 'LINE';
export type BaseMode = 'DECI' | 'HEXA' | 'BINA' | 'OCTA';
export type CalcAppMode =
  | 'COMP'
  | 'CMPLX'
  | 'BASE'
  | 'MATRIX'
  | 'VECTOR'
  | 'STAT'
  | 'EQN'
  | 'GRAPH';

export type ShiftModifier = 'NONE' | 'SHIFT' | 'ALPHA';

export type CalcTheme = 'classic' | 'midnight' | 'obsidian' | 'retro';

export type MathNode =
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'frac'; num: MathNode[]; den: MathNode[] }
  | { id: string; type: 'mixed'; whole: MathNode[]; num: MathNode[]; den: MathNode[] }
  | { id: string; type: 'sqrt'; inner: MathNode[] }
  | { id: string; type: 'nthroot'; index: MathNode[]; inner: MathNode[] }
  | { id: string; type: 'sup'; exp: MathNode[] }
  | { id: string; type: 'logbase'; base: MathNode[]; arg: MathNode[] }
  | { id: string; type: 'abs'; inner: MathNode[] }
  | { id: string; type: 'integral'; expr: MathNode[]; lower: MathNode[]; upper: MathNode[] }
  | { id: string; type: 'deriv'; expr: MathNode[]; at: MathNode[] }
  | { id: string; type: 'sum'; expr: MathNode[]; lower: MathNode[]; upper: MathNode[] }
  | { id: string; type: 'prod'; expr: MathNode[]; lower: MathNode[]; upper: MathNode[] }
  | { id: string; type: 'limit'; expr: MathNode[]; to: MathNode[] };

export interface CursorStep {
  nodeId: string;
  slot: string;
}

export interface CursorPos {
  path: CursorStep[];
  index: number;
}

export interface ComplexValue {
  re: number;
  im: number;
}

export interface FractionValue {
  sign: 1 | -1;
  num: number;
  den: number;
}

export interface EvalResult {
  ok: boolean;
  error?: string;
  numeric?: number;
  complex?: ComplexValue;
  fraction?: FractionValue;
  piMultiple?: FractionValue;
  sqrtMultiple?: { coeff: FractionValue; radicand: number };
  remainder?: { quotient: number; remainder: number };
  dms?: { deg: number; min: number; sec: number; negative: boolean };
  primeFactors?: string;
  formattedDecimal: string;
  formattedExact?: string;
  displayVariants: string[];
}

export interface HistoryItem {
  id: string;
  expressionNodes: MathNode[];
  expressionText: string;
  resultText: string;
  exactText?: string;
  numeric?: number;
  complex?: ComplexValue;
  timestamp: number;
}

export type VariableName = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'x' | 'y' | 'm';

export type VariablesMap = Record<VariableName, ComplexValue>;

export type MatrixData = number[][];
export type VectorData = number[];

export type ModalSheet =
  | null
  | 'MENU'
  | 'PRO'
  | 'THEME'
  | 'SIGMA'
  | 'SETTINGS'
  | 'MODE'
  | 'HISTORY'
  | 'CONST'
  | 'CONV'
  | 'SI'
  | 'MATRIX'
  | 'VECTOR'
  | 'STAT'
  | 'CMPLX'
  | 'DISTR'
  | 'FUNC'
  | 'HELP'
  | 'CALC'
  | 'SOLVE'
  | 'VARIABLES'
  | 'HYP'
  | 'GRAPH'
  | 'EQN'
  | 'DISPLAY_MENU'
  | 'EXPORT';
