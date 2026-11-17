import React, { useMemo, useState } from 'react';
import {
  AngleUnit,
  BaseMode,
  CalcAppMode,
  CalcTheme,
  HistoryItem,
  InputMode,
  MathNode,
  MatrixData,
  ModalSheet,
  NumberFormat,
  VariableName,
  VariablesMap,
  VectorData,
} from '../types/calculator';
import {
  SCIENTIFIC_CONSTANTS,
  SI_PREFIXES,
  UNIT_CATEGORIES,
  binomialPMF,
  computeStatistics,
  matAdd,
  matDeterminant,
  matInverse,
  matMul,
  matSub,
  matTranspose,
  normalCDF,
  normalPDF,
  poissonPMF,
  vecCross,
  vecDot,
  vecMag,
} from '../engine/constantsAndUnits';
import { EvalContext, evaluateNodes, formatComplex, solveForX } from '../engine/mathEngine';
import { nodesToReadableText } from '../engine/mathNodes';
import * as C from '../engine/complex';
import { X, Trash2, Copy, RotateCcw, CornerDownLeft, Check } from 'lucide-react';

interface ModalsProps {
  activeModal: ModalSheet;
  onClose: () => void;
  history: HistoryItem[];
  onLoadHistoryExpression: (item: HistoryItem) => void;
  onInsertText: (txt: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  angleUnit: AngleUnit;
  onChangeAngleUnit: (u: AngleUnit) => void;
  numberFormat: NumberFormat;
  onChangeNumberFormat: (f: NumberFormat) => void;
  precisionDigits: number;
  onChangePrecision: (p: number) => void;
  inputMode: InputMode;
  onChangeInputMode: (m: InputMode) => void;
  calcMode: CalcAppMode;
  onChangeCalcMode: (m: CalcAppMode) => void;
  baseMode: BaseMode;
  onChangeBaseMode: (b: BaseMode) => void;
  theme: CalcTheme;
  onChangeTheme: (t: CalcTheme) => void;
  variables: VariablesMap;
  onUpdateVariable: (name: VariableName, val: number) => void;
  onClearVariables: () => void;
  ansFormatted: string;
  preAnsFormatted: string;
  currentNodes: MathNode[];
  evalContext: EvalContext;
  onSetResultDirect: (label: string, numeric: number) => void;
  onOpenModal: (m: ModalSheet) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const SheetShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-[460px] max-h-[85vh] bg-[#1C1D20] text-[#F1F3F5] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#232428]">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1 space-y-3">{children}</div>
    </div>
  </div>
);

export const Modals: React.FC<ModalsProps> = (props) => {
  const { activeModal, onClose } = props;

  // CONST filter
  const [constQuery, setConstQuery] = useState('');

  // CONV state
  const [convCatIdx, setConvCatIdx] = useState(0);
  const [convFromIdx, setConvFromIdx] = useState(0);
  const [convToIdx, setConvToIdx] = useState(1);
  const [convValue, setConvValue] = useState('1');

  // MATRIX state
  const [matA, setMatA] = useState<MatrixData>([[1, 2], [3, 4]]);
  const [matB, setMatB] = useState<MatrixData>([[5, 6], [7, 8]]);
  const [matActive, setMatActive] = useState<'A' | 'B'>('A');
  const [matOutput, setMatOutput] = useState<string>('');

  // VECTOR state
  const [vecA, setVecA] = useState<VectorData>([3, 4, 0]);
  const [vecB, setVecB] = useState<VectorData>([1, 2, 2]);
  const [vecOutput, setVecOutput] = useState<string>('');

  // STAT state
  const [statRows, setStatRows] = useState<Array<{ x: string; y: string }>>([
    { x: '10', y: '21' },
    { x: '20', y: '39' },
    { x: '30', y: '62' },
    { x: '40', y: '78' },
  ]);
  const [statTwoVar, setStatTwoVar] = useState(true);

  // DISTR state
  const [distrType, setDistrType] = useState<'NORM' | 'BINOM' | 'POISSON'>('NORM');
  const [dX, setDX] = useState('1.96');
  const [dParam1, setDParam1] = useState('0'); // mu or n or lambda
  const [dParam2, setDParam2] = useState('1'); // sigma or p

  // CALC / SOLVE state
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({
    x: '0',
    y: '0',
    a: '0',
    b: '0',
    c: '0',
    d: '0',
    e: '0',
    f: '0',
    m: '0',
  });
  const [solveGuess, setSolveGuess] = useState('1');
  const [solveResult, setSolveResult] = useState<string>('');

  // EQN Solver state (Quadratic & 2x2 Linear)
  const [eqnTab, setEqnTab] = useState<'QUAD' | 'SYS2'>('QUAD');
  const [qa, setQa] = useState('1');
  const [qb, setQb] = useState('-5');
  const [qc, setQc] = useState('6');
  const [sys, setSys] = useState({ a1: '2', b1: '1', c1: '5', a2: '1', b2: '-1', c2: '1' });

  // GRAPH state
  const [graphExpr, setGraphExpr] = useState('sin(x) + 0.5*x');
  const [graphRange, setGraphRange] = useState(10);

  // BASE-N state
  const [baseDecVal, setBaseDecVal] = useState('255');

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const convResult = useMemo(() => {
    const cat = UNIT_CATEGORIES[convCatIdx] || UNIT_CATEGORIES[0];
    const fromU = cat.units[convFromIdx] || cat.units[0];
    const toU = cat.units[convToIdx] || cat.units[1] || cat.units[0];
    const num = Number(convValue);
    if (Number.isNaN(num)) return '—';
    const base = fromU.toBase(num);
    const out = toU.fromBase(base);
    return Number(out.toPrecision(10)).toString();
  }, [convCatIdx, convFromIdx, convToIdx, convValue]);

  const statSummary = useMemo(() => {
    const pts = statRows
      .map((r) => ({
        x: Number(r.x),
        y: statTwoVar && r.y.trim() !== '' ? Number(r.y) : undefined,
      }))
      .filter((p) => !Number.isNaN(p.x) && (p.y === undefined || !Number.isNaN(p.y)));
    return computeStatistics(pts);
  }, [statRows, statTwoVar]);

  if (!activeModal) return null;

  if (activeModal === 'HISTORY') {
    return (
      <SheetShell
        title="Calculation History (السجل)"
        subtitle="Tap any calculation to re-enter & edit it"
        onClose={onClose}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {props.history.length} {props.history.length === 1 ? 'entry' : 'entries'}
          </span>
          {props.history.length > 0 && (
            <button
              type="button"
              onClick={props.onClearHistory}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {props.history.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No calculations recorded yet. Evaluate an expression with <span className="font-calc-mono text-white">=</span> to save it here.
          </div>
        ) : (
          <div className="space-y-2">
            {props.history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#27292D] border border-white/10 p-3 hover:border-[#967CE3]/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      props.onLoadHistoryExpression(item);
                      onClose();
                    }}
                    className="text-left flex-1 cursor-pointer group"
                  >
                    <div className="font-calc-mono text-sm text-slate-200 group-hover:text-white break-all">
                      {item.expressionText}
                    </div>
                    <div className="font-calc-mono text-base font-semibold text-[#F8C42C] mt-1">
                      = {item.resultText}
                    </div>
                    {item.exactText && item.exactText !== item.resultText && (
                      <div className="font-calc-mono text-xs text-[#9D85E8]">
                        Exact: {item.exactText}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDeleteHistoryItem(item.id)}
                    aria-label="Delete entry"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      props.onLoadHistoryExpression(item);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#967CE3]/20 hover:bg-[#967CE3]/35 text-[#C5B4FF] text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Edit Expression
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      props.onInsertText(item.resultText);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <CornerDownLeft className="w-3 h-3" /> Insert Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'CONST') {
    const filtered = SCIENTIFIC_CONSTANTS.filter(
      (c) =>
        c.name.toLowerCase().includes(constQuery.toLowerCase()) ||
        c.symbol.toLowerCase().includes(constQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(constQuery.toLowerCase())
    );
    return (
      <SheetShell title="Physical Constants (CONST)" subtitle="CODATA 2022 values — tap to insert" onClose={onClose}>
        <input
          type="text"
          value={constQuery}
          onChange={(e) => setConstQuery(e.target.value)}
          placeholder="Search constant (c, G, h, Planck...)"
          className="w-full px-3 py-2 rounded-lg bg-[#141517] border border-white/10 text-sm focus:outline-none focus:border-[#F8C42C]"
        />
        <div className="space-y-1.5">
          {filtered.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => {
                props.onInsertText(String(item.value));
                onClose();
              }}
              className="w-full text-left p-2.5 rounded-xl bg-[#27292D] hover:bg-[#313338] border border-white/5 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div>
                <div className="text-xs font-semibold text-white">
                  <span className="text-[#F8C42C] font-calc-mono mr-2">{item.symbol}</span>
                  {item.name}
                </div>
                <div className="text-[11px] text-slate-400">{item.category} · {item.unit}</div>
              </div>
              <div className="font-calc-mono text-xs text-slate-200 shrink-0">
                {item.value.toExponential(4)}
              </div>
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'SI') {
    return (
      <SheetShell title="SI Prefixes" subtitle="Tap prefix multiplier to insert into expression" onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          {SI_PREFIXES.map((p) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => {
                props.onInsertText(`×10^(${p.exponent})`);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#33353A] border border-white/5 text-left flex items-center justify-between cursor-pointer"
            >
              <div>
                <span className="font-calc-mono font-bold text-[#9D85E8] mr-2">{p.symbol}</span>
                <span className="text-xs text-slate-200">{p.name}</span>
              </div>
              <span className="font-calc-mono text-xs text-slate-400">10^{p.exponent}</span>
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'CONV') {
    const cat = UNIT_CATEGORIES[convCatIdx] || UNIT_CATEGORIES[0];
    return (
      <SheetShell title="Unit Converter (CONV)" subtitle="Convert values across scientific & engineering units" onClose={onClose}>
        <div className="flex flex-wrap gap-1.5">
          {UNIT_CATEGORIES.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setConvCatIdx(idx);
                setConvFromIdx(0);
                setConvToIdx(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                convCatIdx === idx ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300 hover:bg-[#32343A]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">From</label>
              <select
                value={convFromIdx}
                onChange={(e) => setConvFromIdx(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#141517] border border-white/10 text-xs"
              >
                {cat.units.map((u, i) => (
                  <option key={u.id} value={i}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">To</label>
              <select
                value={convToIdx}
                onChange={(e) => setConvToIdx(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#141517] border border-white/10 text-xs"
              >
                {cat.units.map((u, i) => (
                  <option key={u.id} value={i}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Value</label>
            <input
              type="number"
              value={convValue}
              onChange={(e) => setConvValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-base"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Converted Result</span>
            <span className="font-calc-mono text-lg font-bold">{convResult}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (convResult !== '—') props.onInsertText(convResult);
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[#F8C42C] text-black font-semibold text-xs cursor-pointer"
          >
            Insert into Calculator
          </button>
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'HYP') {
    const hypFuncs = ['sinh(', 'cosh(', 'tanh(', 'coth(', 'asinh(', 'acosh(', 'atanh('];
    return (
      <SheetShell title="Hyperbolic Functions (hyp)" subtitle="Tap function to insert into expression" onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          {hypFuncs.map((fn) => (
            <button
              key={fn}
              type="button"
              onClick={() => {
                props.onInsertText(fn);
                onClose();
              }}
              className="p-3 rounded-xl bg-[#27292D] hover:bg-[#34363C] border border-white/10 font-calc-mono text-sm text-white cursor-pointer"
            >
              {fn})
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'CMPLX') {
    const cmplxItems = [
      { label: 'i (Imaginary Unit)', insert: 'i' },
      { label: '∠ (Polar Angle)', insert: '∠' },
      { label: 'arg(z) Argument', insert: 'arg(' },
      { label: 'conj(z) Conjugate', insert: 'conj(' },
      { label: 'Re(z) Real Part', insert: 're(' },
      { label: 'Im(z) Imaginary Part', insert: 'im(' },
      { label: '|z| Modulus', insert: 'abs(' },
    ];
    return (
      <SheetShell title="Complex Number Tools (CMPLX)" subtitle="Complex operations & polar conversion" onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          {cmplxItems.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                props.onInsertText(it.insert);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#35373D] border border-white/10 text-left text-xs text-white cursor-pointer"
            >
              <div className="font-calc-mono font-semibold text-[#F8C42C]">{it.insert}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{it.label}</div>
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'FUNC' || activeModal === 'SIGMA' || activeModal === 'HELP') {
    const items = [
      { label: 'abs(x)', desc: 'Absolute value', insert: 'abs(' },
      { label: 'ceil(x)', desc: 'Round up to integer', insert: 'ceil(' },
      { label: 'floor(x)', desc: 'Round down to integer', insert: 'floor(' },
      { label: 'round(x)', desc: 'Round to nearest integer', insert: 'round(' },
      { label: 'gcd(a,b)', desc: 'Greatest common divisor', insert: 'gcd(' },
      { label: 'lcm(a,b)', desc: 'Least common multiple', insert: 'lcm(' },
      { label: 'Pol(x,y)', desc: 'Cartesian → Polar (r, θ)', insert: 'pol(' },
      { label: 'Rec(r,θ)', desc: 'Polar → Cartesian (x, y)', insert: 'rec(' },
      { label: 'Ran#', desc: 'Random number 0.000–0.999', insert: 'Ran#' },
      { label: 'RanInt(a,b)', desc: 'Random integer in [a,b]', insert: 'ranint(' },
    ];
    return (
      <SheetShell
        title={activeModal === 'HELP' ? 'Calculator Guide & Functions' : 'Functions Catalog (FUNC)'}
        subtitle="Tap any function to insert"
        onClose={onClose}
      >
        {activeModal === 'HELP' && (
          <div className="p-3 rounded-xl bg-[#27292D] text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <p><strong className="text-[#F8C42C]">SHIFT</strong> activates yellow functions above keys (SOLVE, d/dx, CONST, History, π, etc.).</p>
            <p><strong className="text-[#9D85E8]">ALPHA</strong> activates purple variables & tools (a–f, x, y, m, e, PreAns, GCD, LCM).</p>
            <p><strong className="text-white">D-Pad (◄ ▲ ► ▼)</strong> navigates inside fractions, roots, integrals, exponents, and recalls history.</p>
            <p><strong className="text-white">S ⇌ D</strong> cycles results between exact fraction / π / radical and decimal.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                props.onInsertText(it.insert);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#35373D] border border-white/5 text-left cursor-pointer"
            >
              <div className="font-calc-mono text-xs font-semibold text-[#F8C42C]">{it.label}</div>
              <div className="text-[11px] text-slate-400">{it.desc}</div>
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'MATRIX') {
    const activeMat = matActive === 'A' ? matA : matB;
    const setMat = matActive === 'A' ? setMatA : setMatB;

    const resizeMat = (rows: number, cols: number) => {
      const next: MatrixData = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => activeMat[r]?.[c] ?? 0)
      );
      setMat(next);
    };

    const runMatOp = (op: 'DET' | 'INV' | 'TRANSP' | 'ADD' | 'SUB' | 'MUL') => {
      try {
        if (op === 'DET') {
          const d = matDeterminant(activeMat);
          setMatOutput(`det(Mat${matActive}) = ${d}`);
        } else if (op === 'INV') {
          const inv = matInverse(activeMat);
          setMatOutput(inv.map((r) => `[ ${r.join(' , ')} ]`).join('\n'));
        } else if (op === 'TRANSP') {
          const tr = matTranspose(activeMat);
          setMatOutput(tr.map((r) => `[ ${r.join(' , ')} ]`).join('\n'));
        } else if (op === 'ADD') {
          setMatOutput(matAdd(matA, matB).map((r) => `[ ${r.join(' , ')} ]`).join('\n'));
        } else if (op === 'SUB') {
          setMatOutput(matSub(matA, matB).map((r) => `[ ${r.join(' , ')} ]`).join('\n'));
        } else if (op === 'MUL') {
          setMatOutput(matMul(matA, matB).map((r) => `[ ${r.join(' , ')} ]`).join('\n'));
        }
      } catch (e) {
        setMatOutput(e instanceof Error ? e.message : 'Matrix Error');
      }
    };

    return (
      <SheetShell title="Matrix Calculator (MATRIX)" subtitle="Edit MatA & MatB up to 4×4" onClose={onClose}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['A', 'B'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMatActive(m)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  matActive === m ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'
                }`}
              >
                Mat{m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Size:</span>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => resizeMat(n, n)}
                className={`px-2 py-1 rounded bg-[#27292D] hover:bg-[#35373D] cursor-pointer ${
                  activeMat.length === n && activeMat[0].length === n ? 'text-[#F8C42C] font-bold' : ''
                }`}
              >
                {n}×{n}
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${activeMat[0].length}, minmax(0, 1fr))` }}
        >
          {activeMat.map((row, r) =>
            row.map((val, c) => (
              <input
                key={`${r}-${c}`}
                type="number"
                value={val}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0;
                  setMat(activeMat.map((rr, ri) => rr.map((cc, ci) => (ri === r && ci === c ? v : cc))));
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 text-center font-calc-mono text-sm"
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => runMatOp('DET')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Det</button>
          <button type="button" onClick={() => runMatOp('INV')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Inverse</button>
          <button type="button" onClick={() => runMatOp('TRANSP')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Transpose</button>
          <button type="button" onClick={() => runMatOp('ADD')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">A + B</button>
          <button type="button" onClick={() => runMatOp('SUB')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">A − B</button>
          <button type="button" onClick={() => runMatOp('MUL')} className="py-1.5 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">A × B</button>
        </div>

        {matOutput && (
          <pre className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-xs whitespace-pre-wrap">
            {matOutput}
          </pre>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'VECTOR') {
    const runVec = (op: 'DOT' | 'CROSS' | 'MAG_A' | 'ANGLE') => {
      try {
        if (op === 'DOT') setVecOutput(`VctA · VctB = ${vecDot(vecA, vecB)}`);
        else if (op === 'CROSS') setVecOutput(`VctA × VctB = [ ${vecCross(vecA, vecB).join(', ')} ]`);
        else if (op === 'MAG_A') setVecOutput(`|VctA| = ${vecMag(vecA).toFixed(6)}`);
        else if (op === 'ANGLE') {
          const cosT = vecDot(vecA, vecB) / (vecMag(vecA) * vecMag(vecB));
          const rad = Math.acos(Math.max(-1, Math.min(1, cosT)));
          const deg = (rad * 180) / Math.PI;
          setVecOutput(`Angle = ${deg.toFixed(4)}° (${rad.toFixed(4)} rad)`);
        }
      } catch (e) {
        setVecOutput(e instanceof Error ? e.message : 'Vector Error');
      }
    };

    return (
      <SheetShell title="Vector Calculator (VECTOR)" subtitle="3D Vector arithmetic, dot & cross product" onClose={onClose}>
        {(['A', 'B'] as const).map((which) => {
          const vec = which === 'A' ? vecA : vecB;
          const setVec = which === 'A' ? setVecA : setVecB;
          return (
            <div key={which} className="space-y-1">
              <div className="text-xs font-semibold text-[#F8C42C]">Vct{which} (x, y, z)</div>
              <div className="grid grid-cols-3 gap-2">
                {vec.map((v, i) => (
                  <input
                    key={i}
                    type="number"
                    value={v}
                    onChange={(e) => {
                      const next = [...vec];
                      next[i] = Number(e.target.value) || 0;
                      setVec(next);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm text-center"
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => runVec('DOT')} className="py-2 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Dot (A·B)</button>
          <button type="button" onClick={() => runVec('CROSS')} className="py-2 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Cross (A×B)</button>
          <button type="button" onClick={() => runVec('MAG_A')} className="py-2 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">|VctA| Magnitude</button>
          <button type="button" onClick={() => runVec('ANGLE')} className="py-2 rounded-lg bg-[#2A2C30] hover:bg-[#383A40] text-xs cursor-pointer">Angle(A, B)</button>
        </div>

        {vecOutput && (
          <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-sm font-semibold">
            {vecOutput}
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'STAT') {
    return (
      <SheetShell title="Statistics & Regression (STAT)" subtitle="1-Var stats & linear regression y = a + bx" onClose={onClose}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStatTwoVar((s) => !s)}
            className="px-3 py-1 rounded-lg bg-[#27292D] text-xs font-medium cursor-pointer"
          >
            Mode: {statTwoVar ? '2-Var (X, Y)' : '1-Var (X)'}
          </button>
          <button
            type="button"
            onClick={() => setStatRows([...statRows, { x: '', y: '' }])}
            className="px-3 py-1 rounded-lg bg-[#F8C42C] text-black text-xs font-semibold cursor-pointer"
          >
            + Add Row
          </button>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {statRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-5">{idx + 1}.</span>
              <input
                type="number"
                value={row.x}
                placeholder="X"
                onChange={(e) => {
                  const next = [...statRows];
                  next[idx] = { ...next[idx], x: e.target.value };
                  setStatRows(next);
                }}
                className="flex-1 px-2.5 py-1 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-xs"
              />
              {statTwoVar && (
                <input
                  type="number"
                  value={row.y}
                  placeholder="Y"
                  onChange={(e) => {
                    const next = [...statRows];
                    next[idx] = { ...next[idx], y: e.target.value };
                    setStatRows(next);
                  }}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-xs"
                />
              )}
              <button
                type="button"
                onClick={() => setStatRows(statRows.filter((_, i) => i !== idx))}
                className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {statSummary && (
          <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-xs space-y-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span>n = {statSummary.n}</span>
              <span>x̄ = {statSummary.meanX.toFixed(4)}</span>
              <span>Σx = {statSummary.sumX.toFixed(4)}</span>
              <span>σx = {statSummary.popStdX.toFixed(4)}</span>
              <span>sx = {statSummary.sampStdX.toFixed(4)}</span>
              <span>Med = {statSummary.medianX.toFixed(4)}</span>
              <span>Min = {statSummary.minX}</span>
              <span>Max = {statSummary.maxX}</span>
            </div>
            {statSummary.regSlope !== undefined && (
              <div className="pt-1.5 mt-1.5 border-t border-black/15">
                <div>Regression: y = {statSummary.regIntercept?.toFixed(4)} + {statSummary.regSlope.toFixed(4)}x</div>
                <div>Correlation r = {statSummary.regR?.toFixed(5)}</div>
              </div>
            )}
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'DISTR') {
    const x = Number(dX) || 0;
    const p1 = Number(dParam1) || 0;
    const p2 = Number(dParam2) || 1;
    let out1 = '', out2 = '';
    if (distrType === 'NORM') {
      out1 = `PDF = ${normalPDF(x, p1, Math.max(1e-9, p2)).toFixed(6)}`;
      out2 = `CDF P(X ≤ ${x}) = ${normalCDF(x, p1, Math.max(1e-9, p2)).toFixed(6)}`;
    } else if (distrType === 'BINOM') {
      const k = Math.max(0, Math.round(x));
      const n = Math.max(1, Math.round(p1));
      const p = Math.max(0, Math.min(1, p2));
      const pmf = k <= n ? binomialPMF(k, n, p) : 0;
      let cdf = 0;
      for (let i = 0; i <= Math.min(k, n); i++) cdf += binomialPMF(i, n, p);
      out1 = `P(X = ${k}) = ${pmf.toFixed(6)}`;
      out2 = `P(X ≤ ${k}) = ${cdf.toFixed(6)}`;
    } else {
      const k = Math.max(0, Math.round(x));
      const lam = Math.max(0.0001, p1);
      const pmf = poissonPMF(k, lam);
      let cdf = 0;
      for (let i = 0; i <= k; i++) cdf += poissonPMF(i, lam);
      out1 = `P(X = ${k}) = ${pmf.toFixed(6)}`;
      out2 = `P(X ≤ ${k}) = ${cdf.toFixed(6)}`;
    }

    return (
      <SheetShell title="Probability Distributions (DISTR)" subtitle="Normal, Binomial & Poisson PDF/CDF" onClose={onClose}>
        <div className="flex gap-1.5">
          {(['NORM', 'BINOM', 'POISSON'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDistrType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                distrType === t ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-slate-400">x / k</label>
            <input type="number" value={dX} onChange={(e) => setDX(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-xs" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">{distrType === 'NORM' ? 'μ (Mean)' : distrType === 'BINOM' ? 'n (Trials)' : 'λ (Rate)'}</label>
            <input type="number" value={dParam1} onChange={(e) => setDParam1(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-xs" />
          </div>
          {distrType !== 'POISSON' && (
            <div>
              <label className="text-[11px] text-slate-400">{distrType === 'NORM' ? 'σ (Std)' : 'p (Prob)'}</label>
              <input type="number" value={dParam2} onChange={(e) => setDParam2(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-xs" />
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-xs space-y-1 font-semibold">
          <div>{out1}</div>
          <div>{out2}</div>
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'CALC') {
    const exprText = nodesToReadableText(props.currentNodes);
    const vars: VariableName[] = ['x', 'y', 'a', 'b', 'c', 'd', 'e', 'f', 'm'];
    const handleEvalCalc = () => {
      const updatedVars: VariablesMap = { ...props.variables };
      for (const v of vars) {
        const num = Number(calcInputs[v] || '0');
        updatedVars[v] = C.c(Number.isNaN(num) ? 0 : num);
        props.onUpdateVariable(v, Number.isNaN(num) ? 0 : num);
      }
      try {
        const val = evaluateNodes(props.currentNodes, {
          ...props.evalContext,
          variables: updatedVars,
        });
        if (C.isReal(val)) {
          props.onSetResultDirect(`CALC(${exprText})`, val.re);
        } else {
          setSolveResult(formatComplex(val, props.numberFormat, props.precisionDigits));
          return;
        }
        onClose();
      } catch (e) {
        setSolveResult(e instanceof Error ? e.message : 'Error');
      }
    };

    return (
      <SheetShell title="CALC — Evaluate Expression" subtitle={exprText || 'Enter an expression first'} onClose={onClose}>
        <div className="grid grid-cols-3 gap-2">
          {vars.map((v) => (
            <div key={v}>
              <label className="text-[11px] text-[#9D85E8] font-calc-mono uppercase">{v} =</label>
              <input
                type="number"
                value={calcInputs[v]}
                onChange={(e) => setCalcInputs({ ...calcInputs, [v]: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm"
              />
            </div>
          ))}
        </div>
        {solveResult && <div className="text-xs text-rose-400">{solveResult}</div>}
        <button
          type="button"
          onClick={handleEvalCalc}
          className="w-full py-2.5 rounded-xl bg-[#F8C42C] text-black font-semibold text-xs cursor-pointer"
        >
          Evaluate Expression
        </button>
      </SheetShell>
    );
  }

  if (activeModal === 'SOLVE') {
    const exprText = nodesToReadableText(props.currentNodes);
    const runSolve = () => {
      try {
        const guess = Number(solveGuess) || 0;
        const root = solveForX(props.currentNodes, guess, props.evalContext);
        props.onUpdateVariable('x', root);
        setSolveResult(`x = ${Number(root.toPrecision(10))}`);
      } catch (e) {
        setSolveResult(e instanceof Error ? e.message : 'No root found');
      }
    };

    return (
      <SheetShell title="Newton-Raphson Equation Solver (SOLVE)" subtitle={`Solving: ${exprText || 'f(x) = 0'} for x`} onClose={onClose}>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Initial guess for x</label>
          <input
            type="number"
            value={solveGuess}
            onChange={(e) => setSolveGuess(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm"
          />
        </div>
        <button
          type="button"
          onClick={runSolve}
          className="w-full py-2.5 rounded-xl bg-[#F8C42C] text-black font-semibold text-xs cursor-pointer"
        >
          Solve for x
        </button>
        {solveResult && (
          <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-sm font-bold flex items-center justify-between">
            <span>{solveResult}</span>
            {solveResult.startsWith('x = ') && (
              <button
                type="button"
                onClick={() => {
                  props.onInsertText(solveResult.replace('x = ', ''));
                  onClose();
                }}
                className="px-2 py-1 rounded bg-[#181A1B] text-white text-xs cursor-pointer"
              >
                Use
              </button>
            )}
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'EQN') {
    const a = Number(qa) || 0, b = Number(qb) || 0, c = Number(qc) || 0;
    const disc = b * b - 4 * a * c;
    let quadOut = 'a cannot be 0';
    if (a !== 0) {
      if (disc >= 0) {
        const x1 = (-b + Math.sqrt(disc)) / (2 * a);
        const x2 = (-b - Math.sqrt(disc)) / (2 * a);
        quadOut = `x₁ = ${Number(x1.toPrecision(8))},   x₂ = ${Number(x2.toPrecision(8))}`;
      } else {
        const re = -b / (2 * a);
        const im = Math.sqrt(-disc) / (2 * a);
        quadOut = `x₁ = ${re.toFixed(4)} + ${im.toFixed(4)}i,  x₂ = ${re.toFixed(4)} − ${im.toFixed(4)}i`;
      }
    }

    const a1 = Number(sys.a1) || 0, b1 = Number(sys.b1) || 0, c1 = Number(sys.c1) || 0;
    const a2 = Number(sys.a2) || 0, b2 = Number(sys.b2) || 0, c2 = Number(sys.c2) || 0;
    const det = a1 * b2 - a2 * b1;
    const sysOut =
      Math.abs(det) < 1e-12
        ? 'No unique solution (det = 0)'
        : `x = ${((c1 * b2 - c2 * b1) / det).toFixed(6)},   y = ${((a1 * c2 - a2 * c1) / det).toFixed(6)}`;

    return (
      <SheetShell title="Equation & System Solver" subtitle="Quadratic equations & 2×2 linear systems" onClose={onClose}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEqnTab('QUAD')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${eqnTab === 'QUAD' ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'}`}
          >
            ax² + bx + c = 0
          </button>
          <button
            type="button"
            onClick={() => setEqnTab('SYS2')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${eqnTab === 'SYS2' ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'}`}
          >
            2×2 Linear System
          </button>
        </div>

        {eqnTab === 'QUAD' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-slate-400">a</label><input type="number" value={qa} onChange={(e) => setQa(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm" /></div>
              <div><label className="text-xs text-slate-400">b</label><input type="number" value={qb} onChange={(e) => setQb(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm" /></div>
              <div><label className="text-xs text-slate-400">c</label><input type="number" value={qc} onChange={(e) => setQc(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm" /></div>
            </div>
            <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-xs font-bold">{quadOut}</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={sys.a1} onChange={(e) => setSys({ ...sys, a1: e.target.value })} placeholder="a1" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
              <input type="number" value={sys.b1} onChange={(e) => setSys({ ...sys, b1: e.target.value })} placeholder="b1" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
              <input type="number" value={sys.c1} onChange={(e) => setSys({ ...sys, c1: e.target.value })} placeholder="c1" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={sys.a2} onChange={(e) => setSys({ ...sys, a2: e.target.value })} placeholder="a2" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
              <input type="number" value={sys.b2} onChange={(e) => setSys({ ...sys, b2: e.target.value })} placeholder="b2" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
              <input type="number" value={sys.c2} onChange={(e) => setSys({ ...sys, c2: e.target.value })} placeholder="c2" className="px-2 py-1.5 rounded bg-[#141517] border border-white/10 font-calc-mono text-xs" />
            </div>
            <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-xs font-bold">{sysOut}</div>
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'GRAPH') {
    const W = 380, H = 220;
    const pts: string[] = [];
    for (let px = 0; px <= W; px += 2) {
      const x = ((px / W) * 2 - 1) * graphRange;
      try {
        const val = evaluateNodes([{ id: 'g', type: 'text', value: graphExpr }], {
          ...props.evalContext,
          angleUnit: 'RAD',
          variables: { ...props.variables, x: C.c(x) },
        });
        if (C.isReal(val) && Number.isFinite(val.re)) {
          const py = H / 2 - (val.re / graphRange) * (H / 2);
          if (py >= -100 && py <= H + 100) {
            pts.push(`${pts.length === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
          }
        }
      } catch {
        // skip discontinuity
      }
    }

    return (
      <SheetShell title="Function Grapher — y = f(x)" subtitle="Live SVG plot in Radians" onClose={onClose}>
        <div className="flex gap-2">
          <input
            type="text"
            value={graphExpr}
            onChange={(e) => setGraphExpr(e.target.value)}
            placeholder="e.g. sin(x) + 0.5*x"
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm"
          />
          <select
            value={graphRange}
            onChange={(e) => setGraphRange(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg bg-[#141517] border border-white/10 text-xs"
          >
            <option value={5}>±5</option>
            <option value={10}>±10</option>
            <option value={25}>±25</option>
          </select>
        </div>

        <div className="rounded-xl overflow-hidden bg-[#E3ECE8] border border-white/10 p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#94A3B8" strokeWidth="1" />
            <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#94A3B8" strokeWidth="1" />
            {pts.length > 1 && (
              <path d={pts.join(' ')} fill="none" stroke="#6F54D4" strokeWidth="2.2" />
            )}
          </svg>
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'VARIABLES') {
    const varNames: VariableName[] = ['a', 'b', 'c', 'd', 'e', 'f', 'x', 'y', 'm'];
    return (
      <SheetShell title="Memory & Variable Registers (RCL / STO)" subtitle="Tap a variable to insert into expression" onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              props.onInsertText('Ans');
              onClose();
            }}
            className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#33363C] text-left cursor-pointer"
          >
            <div className="text-xs font-bold text-[#F8C42C] font-calc-mono">Ans</div>
            <div className="font-calc-mono text-xs text-slate-200 truncate">{props.ansFormatted}</div>
          </button>
          <button
            type="button"
            onClick={() => {
              props.onInsertText('PreAns');
              onClose();
            }}
            className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#33363C] text-left cursor-pointer"
          >
            <div className="text-xs font-bold text-[#9D85E8] font-calc-mono">PreAns</div>
            <div className="font-calc-mono text-xs text-slate-200 truncate">{props.preAnsFormatted}</div>
          </button>
          {varNames.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                props.onInsertText(v);
                onClose();
              }}
              className="p-2.5 rounded-xl bg-[#27292D] hover:bg-[#33363C] text-left cursor-pointer"
            >
              <div className="text-xs font-bold text-[#9D85E8] font-calc-mono uppercase">{v}</div>
              <div className="font-calc-mono text-xs text-slate-200 truncate">
                {formatComplex(props.variables[v], props.numberFormat, props.precisionDigits)}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={props.onClearVariables}
          className="w-full py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
        >
          Clear All Variables (CLRv)
        </button>
      </SheetShell>
    );
  }

  if (activeModal === 'MODE' || activeModal === 'MENU' || activeModal === 'PRO') {
    const modeItems: Array<{ id: CalcAppMode; title: string; desc: string; modal?: ModalSheet }> = [
      { id: 'COMP', title: '1: COMP (Scientific)', desc: 'Standard scientific & calculus mode' },
      { id: 'CMPLX', title: '2: CMPLX (Complex)', desc: 'Complex numbers a + bi & polar', modal: 'CMPLX' },
      { id: 'BASE', title: '3: BASE-N (Dec/Hex/Bin/Oct)', desc: 'Programmer number base converter' },
      { id: 'MATRIX', title: '4: MATRIX', desc: 'Matrix determinant, inverse & multiply', modal: 'MATRIX' },
      { id: 'VECTOR', title: '5: VECTOR', desc: 'Dot, cross product & magnitude', modal: 'VECTOR' },
      { id: 'STAT', title: '6: STAT & Regression', desc: '1-Var, 2-Var & linear regression', modal: 'STAT' },
      { id: 'EQN', title: '7: EQN Solver', desc: 'Quadratic & 2×2 system solver', modal: 'EQN' },
      { id: 'GRAPH', title: '8: GRAPH Plotter', desc: 'Plot y = f(x) curves', modal: 'GRAPH' },
    ];

    const parsedDec = Math.trunc(Number(baseDecVal) || 0);

    return (
      <SheetShell
        title={activeModal === 'PRO' ? 'CalcES Pro Tools' : 'Calculator Mode (MODE)'}
        subtitle="Select active mode or open specialized workspace"
        onClose={onClose}
      >
        <div className="grid grid-cols-1 gap-2">
          {modeItems.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                props.onChangeCalcMode(m.id);
                if (m.modal) {
                  props.onOpenModal(m.modal);
                } else if (m.id !== 'BASE') {
                  onClose();
                }
              }}
              className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                props.calcMode === m.id
                  ? 'bg-[#967CE3]/20 border-[#967CE3] text-white'
                  : 'bg-[#27292D] border-white/5 hover:bg-[#32343A] text-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">{m.title}</div>
                <div className="text-[11px] text-slate-400">{m.desc}</div>
              </div>
              {props.calcMode === m.id && <Check className="w-4 h-4 text-[#F8C42C]" />}
            </button>
          ))}
        </div>

        {props.calcMode === 'BASE' && (
          <div className="p-3 rounded-xl bg-[#27292D] border border-white/10 space-y-2 mt-2">
            <div className="text-xs font-semibold text-[#F8C42C]">BASE-N Live Converter</div>
            <input
              type="number"
              value={baseDecVal}
              onChange={(e) => setBaseDecVal(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#141517] border border-white/10 font-calc-mono text-sm"
            />
            <div className="grid grid-cols-2 gap-1.5 font-calc-mono text-xs">
              <div className="p-2 rounded bg-[#141517]">DEC: {parsedDec}</div>
              <div className="p-2 rounded bg-[#141517]">HEX: {(parsedDec >>> 0).toString(16).toUpperCase()}</div>
              <div className="p-2 rounded bg-[#141517]">OCT: {(parsedDec >>> 0).toString(8)}</div>
              <div className="p-2 rounded bg-[#141517] truncate">BIN: {(parsedDec >>> 0).toString(2)}</div>
            </div>
          </div>
        )}
      </SheetShell>
    );
  }

  if (activeModal === 'SETTINGS') {
    return (
      <SheetShell title="Calculator Settings" subtitle="Angle unit, number format, display & audio" onClose={onClose}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-400 mb-1.5">Angle Unit</div>
            <div className="grid grid-cols-3 gap-2">
              {(['DEG', 'RAD', 'GRAD'] as AngleUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => props.onChangeAngleUnit(u)}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    props.angleUnit === u ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">Number Format</div>
            <div className="grid grid-cols-4 gap-2">
              {(['NORM', 'FIX', 'SCI', 'ENG'] as NumberFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => props.onChangeNumberFormat(f)}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    props.numberFormat === f ? 'bg-[#967CE3] text-white' : 'bg-[#27292D] text-slate-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Precision Digits ({props.precisionDigits})</div>
            <input
              type="range"
              min={1}
              max={11}
              value={props.precisionDigits}
              onChange={(e) => props.onChangePrecision(Number(e.target.value))}
              className="w-full accent-[#F8C42C]"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">Input Display Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {(['MATH', 'LINE'] as InputMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => props.onChangeInputMode(m)}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    props.inputMode === m ? 'bg-[#F8C42C] text-black' : 'bg-[#27292D] text-slate-300'
                  }`}
                >
                  {m === 'MATH' ? 'MATH (Natural)' : 'LINE (Linear)'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={props.onToggleSound}
            className="w-full py-2.5 px-3 rounded-xl bg-[#27292D] flex items-center justify-between text-xs cursor-pointer"
          >
            <span>Key Click Sound</span>
            <span className={props.soundEnabled ? 'text-[#F8C42C] font-bold' : 'text-slate-400'}>
              {props.soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'THEME') {
    const themes: Array<{ id: CalcTheme; name: string; swatch: string }> = [
      { id: 'classic', name: 'CalcES Classic Dark', swatch: 'bg-[#181A1B]' },
      { id: 'obsidian', name: 'Obsidian Matte', swatch: 'bg-[#0C0D0F]' },
      { id: 'midnight', name: 'Midnight Indigo', swatch: 'bg-[#131826]' },
      { id: 'retro', name: 'Retro Graphite', swatch: 'bg-[#242623]' },
    ];
    return (
      <SheetShell title="Calculator Theme" subtitle="Choose chassis appearance" onClose={onClose}>
        <div className="space-y-2">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                props.onChangeTheme(t.id);
                onClose();
              }}
              className={`w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                props.theme === t.id ? 'border-[#F8C42C] bg-white/5' : 'border-white/10 bg-[#27292D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-md border border-white/20 ${t.swatch}`} />
                <span className="text-xs font-medium">{t.name}</span>
              </div>
              {props.theme === t.id && <Check className="w-4 h-4 text-[#F8C42C]" />}
            </button>
          ))}
        </div>
      </SheetShell>
    );
  }

  if (activeModal === 'EXPORT' || activeModal === 'DISPLAY_MENU') {
    const exprText = nodesToReadableText(props.currentNodes);
    const copyStr = (id: string, txt: string) => {
      navigator.clipboard?.writeText(txt).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    };
    return (
      <SheetShell title="Expression & Result Actions" subtitle="Copy or export current calculation" onClose={onClose}>
        <div className="p-3 rounded-xl bg-[#E3ECE8] text-[#181A1B] font-calc-mono text-sm">
          <div>{exprText || '(empty)'}</div>
          <div className="font-bold text-right mt-1">= {props.ansFormatted}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => copyStr('expr', exprText)}
            className="py-2.5 rounded-xl bg-[#27292D] hover:bg-[#32343A] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> {copiedId === 'expr' ? 'Copied!' : 'Copy Expression'}
          </button>
          <button
            type="button"
            onClick={() => copyStr('res', props.ansFormatted)}
            className="py-2.5 rounded-xl bg-[#F8C42C] text-black text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> {copiedId === 'res' ? 'Copied!' : 'Copy Result'}
          </button>
        </div>
      </SheetShell>
    );
  }

  return null;
};
