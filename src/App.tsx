/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AngleUnit,
  BaseMode,
  CalcAppMode,
  CalcTheme,
  ComplexValue,
  CursorPos,
  EvalResult,
  HistoryItem,
  InputMode,
  MathNode,
  ModalSheet,
  NumberFormat,
  ShiftModifier,
  VariableName,
  VariablesMap,
} from './types/calculator';
import * as C from './engine/complex';
import {
  DEFAULT_VARIABLES,
  EvalContext,
  evaluateFull,
  formatComplex,
  formatFractionStr,
  primeFactorization,
  toDMS,
  toFraction,
} from './engine/mathEngine';
import {
  cloneNodes,
  deleteAtCursor,
  getSequenceAtPath,
  insertNodesAtCursor,
  makeText,
  moveCursorLeft,
  moveCursorRight,
  moveCursorVertical,
  nextId,
  nodesToReadableText,
} from './engine/mathNodes';
import { MathDisplay } from './components/MathDisplay';
import { KeyActionId, Keypad } from './components/Keypad';
import { Modals } from './components/Modals';
import { DesktopCompanion } from './components/DesktopCompanion';
import {
  Camera,
  Gem,
  Menu,
  MoreVertical,
  Palette,
  Settings,
} from 'lucide-react';

const HISTORY_STORAGE_KEY = 'calces_history_v1';

function playClickSound(enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
    setTimeout(() => ctx.close().catch(() => {}), 80);
  } catch {
    // ignore audio restrictions
  }
}

export default function App() {
  // Expression & Cursor
  const [nodes, setNodes] = useState<MathNode[]>([]);
  const [cursor, setCursor] = useState<CursorPos>({ path: [], index: 0 });
  const [evaluated, setEvaluated] = useState<EvalResult | null>(null);
  const [variantIdx, setVariantIdx] = useState(0);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [factDisplay, setFactDisplay] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Calculator Modes & Modifiers
  const [shift, setShift] = useState<ShiftModifier>('NONE');
  const [is2nd, setIs2nd] = useState(false);
  const [stoPending, setStoPending] = useState(false);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('NORM');
  const [precisionDigits, setPrecisionDigits] = useState(11);
  const [inputMode, setInputMode] = useState<InputMode>('MATH');
  const [calcMode, setCalcMode] = useState<CalcAppMode>('COMP');
  const [baseMode, setBaseMode] = useState<BaseMode>('DECI');
  const [theme, setTheme] = useState<CalcTheme>('classic');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Memory & History
  const [variables, setVariables] = useState<VariablesMap>(() => ({ ...DEFAULT_VARIABLES }));
  const [ans, setAns] = useState<ComplexValue>(C.c(0));
  const [preAns, setPreAns] = useState<ComplexValue>(C.c(0));
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as HistoryItem[];
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [historyNavIdx, setHistoryNavIdx] = useState(-1);
  const [clipboardBuffer, setClipboardBuffer] = useState<string>('');

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalSheet>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const evalContext: EvalContext = useMemo(
    () => ({
      angleUnit,
      variables,
      ans,
      preAns,
      numberFormat,
      precisionDigits,
    }),
    [angleUnit, variables, ans, preAns, numberFormat, precisionDigits]
  );

  // Live preview calculation while typing
  const livePreview: EvalResult | null = useMemo(() => {
    if (nodes.length === 0) return null;
    const res = evaluateFull(nodes, evalContext);
    return res.ok ? res : null;
  }, [nodes, evalContext]);

  const ansFormatted = useMemo(
    () => formatComplex(ans, numberFormat, precisionDigits),
    [ans, numberFormat, precisionDigits]
  );

  const preAnsFormatted = useMemo(
    () => formatComplex(preAns, numberFormat, precisionDigits),
    [preAns, numberFormat, precisionDigits]
  );

  const insertTextTokens = useCallback(
    (text: string) => {
      const resetFresh = justEvaluated && /^[0-9.(a-zA-Z√πe]$/.test(text[0] || '');
      const baseNodes = resetFresh ? [] : nodes;
      const baseCursor = resetFresh ? { path: [], index: 0 } : cursor;

      // If just evaluated and pressing an operator (+, -, ×, ÷, mod, etc.), prepend Ans
      const isBinaryOp = ['+', '−', '×', '÷', 'mod', '÷R', 'nPr', 'nCr', '∠'].includes(text);
      const tokensToInsert: MathNode[] =
        justEvaluated && isBinaryOp && nodes.length > 0
          ? [makeText(text)]
          : [makeText(text)];

      if (justEvaluated && isBinaryOp) {
        const res = insertNodesAtCursor([makeText('Ans')], { path: [], index: 1 }, [makeText(text)], false);
        setNodes(res.nodes);
        setCursor(res.cursor);
      } else {
        const res = insertNodesAtCursor(baseNodes, baseCursor, tokensToInsert, false);
        setNodes(res.nodes);
        setCursor(res.cursor);
      }

      setJustEvaluated(false);
      setEvaluated(null);
      setFactDisplay(null);
      setHistoryNavIdx(-1);
    },
    [nodes, cursor, justEvaluated]
  );

  const insertAstNode = useCallback(
    (node: MathNode, autoFillFracNumerator = false) => {
      let baseNodes = justEvaluated ? [] : nodes;
      let baseCursor = justEvaluated ? { path: [], index: 0 } : cursor;

      // Smart numerator capture for x/y when typing e.g. 3 [x/y] 4
      if (autoFillFracNumerator && node.type === 'frac' && baseCursor.index > 0) {
        const seq = getSequenceAtPath(baseNodes, baseCursor.path);
        let start = baseCursor.index - 1;
        while (start >= 0) {
          const item = seq[start];
          if (
            item.type === 'text' &&
            /^[0-9.a-ftxymπei]$/.test(item.value)
          ) {
            start--;
          } else {
            break;
          }
        }
        const count = baseCursor.index - 1 - start;
        if (count > 0) {
          const captured = seq.slice(start + 1, baseCursor.index);
          const fracWithNum: MathNode = { ...node, num: captured };
          // Remove captured and insert fracWithNum
          let tempNodes = baseNodes;
          let tempCursor = baseCursor;
          for (let k = 0; k < count; k++) {
            const del = deleteAtCursor(tempNodes, tempCursor);
            tempNodes = del.nodes;
            tempCursor = del.cursor;
          }
          const res = insertNodesAtCursor(tempNodes, tempCursor, [fracWithNum], true);
          setNodes(res.nodes);
          setCursor(res.cursor);
          setJustEvaluated(false);
          setEvaluated(null);
          setFactDisplay(null);
          return;
        }
      }

      const res = insertNodesAtCursor(baseNodes, baseCursor, [node], true);
      setNodes(res.nodes);
      setCursor(res.cursor);
      setJustEvaluated(false);
      setEvaluated(null);
      setFactDisplay(null);
      setHistoryNavIdx(-1);
    },
    [nodes, cursor, justEvaluated]
  );

  const handleEvaluate = useCallback(() => {
    if (nodes.length === 0) return;
    const result = evaluateFull(nodes, evalContext);
    setEvaluated(result);
    setVariantIdx(0);
    setFactDisplay(null);

    if (result.ok && result.complex) {
      setPreAns(ans);
      setAns(result.complex);
      setJustEvaluated(true);

      const exprText = nodesToReadableText(nodes);
      const newItem: HistoryItem = {
        id: nextId(),
        expressionNodes: cloneNodes(nodes),
        expressionText: exprText,
        resultText: result.formattedDecimal,
        exactText: result.formattedExact,
        numeric: result.numeric,
        complex: result.complex,
        timestamp: Date.now(),
      };
      setHistory((prev) => [newItem, ...prev.slice(0, 99)]);
    } else {
      setJustEvaluated(false);
    }
  }, [nodes, evalContext, ans]);

  const handleStoreVariable = useCallback(
    (varName: VariableName) => {
      let valToStore = ans;
      if (nodes.length > 0 && !justEvaluated) {
        const res = evaluateFull(nodes, evalContext);
        if (res.ok && res.complex) {
          valToStore = res.complex;
          setEvaluated(res);
          setAns(res.complex);
          setJustEvaluated(true);
        }
      }
      setVariables((prev) => ({ ...prev, [varName]: valToStore }));
      setStoPending(false);
      setShift('NONE');
      showToast(`Stored → ${varName.toUpperCase()} = ${formatComplex(valToStore, numberFormat, precisionDigits)}`);
    },
    [ans, nodes, justEvaluated, evalContext, numberFormat, precisionDigits, showToast]
  );

  const handleLoadHistoryExpression = useCallback((item: HistoryItem) => {
    const cloned = cloneNodes(item.expressionNodes);
    setNodes(cloned);
    setCursor({ path: [], index: cloned.length });
    setEvaluated(null);
    setJustEvaluated(false);
    setFactDisplay(null);
  }, []);

  const handleKeyPress = useCallback(
    (id: KeyActionId) => {
      playClickSound(soundEnabled);

      if (id === 'SHIFT') {
        setShift((s) => (s === 'SHIFT' ? 'NONE' : 'SHIFT'));
        return;
      }
      if (id === 'ALPHA') {
        setShift((s) => (s === 'ALPHA' ? 'NONE' : 'ALPHA'));
        return;
      }
      if (id === '2ND') {
        setIs2nd((v) => !v);
        return;
      }

      const currentShift = shift;
      // Clear modifier after non-modifier press
      if (currentShift !== 'NONE') setShift('NONE');

      // Handle STO pending variable target
      if (stoPending) {
        const varMap: Partial<Record<KeyActionId, VariableName>> = {
          NEG: 'a',
          DMS: 'b',
          HYP: 'c',
          SIN: 'd',
          COS: 'e',
          TAN: 'f',
          RPAREN: 'x',
          SD: 'y',
          MPLUS: 'm',
        };
        const target = varMap[id];
        if (target) {
          handleStoreVariable(target);
          return;
        }
        setStoPending(false);
      }

      switch (id) {
        case 'MODE':
          setActiveModal('MODE');
          return;

        case 'LEFT':
          setCursor((cPos) => moveCursorLeft(nodes, cPos));
          return;

        case 'RIGHT':
          setCursor((cPos) => moveCursorRight(nodes, cPos));
          return;

        case 'UP': {
          const vert = moveCursorVertical(nodes, cursor, 'up');
          if (vert) {
            setCursor(vert);
          } else if (history.length > 0) {
            const nextIdx = Math.min(history.length - 1, historyNavIdx + 1);
            setHistoryNavIdx(nextIdx);
            handleLoadHistoryExpression(history[nextIdx]);
          }
          return;
        }

        case 'DOWN': {
          const vert = moveCursorVertical(nodes, cursor, 'down');
          if (vert) {
            setCursor(vert);
          } else if (historyNavIdx > 0) {
            const nextIdx = historyNavIdx - 1;
            setHistoryNavIdx(nextIdx);
            handleLoadHistoryExpression(history[nextIdx]);
          } else if (historyNavIdx === 0) {
            setHistoryNavIdx(-1);
            setNodes([]);
            setCursor({ path: [], index: 0 });
            setEvaluated(null);
          }
          return;
        }

        case 'CENTER':
          handleEvaluate();
          return;

        case 'CALC':
          if (currentShift === 'SHIFT') setActiveModal('SOLVE');
          else if (currentShift === 'ALPHA') insertTextTokens('=');
          else setActiveModal('CALC');
          return;

        case 'INT':
          if (currentShift === 'SHIFT') {
            insertAstNode({ id: nextId(), type: 'deriv', expr: [], at: [] });
          } else if (currentShift === 'ALPHA') {
            insertTextTokens(',');
          } else {
            insertAstNode({ id: nextId(), type: 'integral', expr: [], lower: [], upper: [] });
          }
          return;

        case 'INV':
          if (currentShift === 'SHIFT') {
            insertTextTokens('!');
          } else if (currentShift === 'ALPHA') {
            // Cycle relation symbol if previous token is a relation
            const seq = getSequenceAtPath(nodes, cursor.path);
            const prev = cursor.index > 0 ? seq[cursor.index - 1] : null;
            const rels = ['=', '<', '>', '≤', '≥', '≠'];
            if (prev?.type === 'text' && rels.includes(prev.value)) {
              const nextRel = rels[(rels.indexOf(prev.value) + 1) % rels.length];
              const del = deleteAtCursor(nodes, cursor);
              const res = insertNodesAtCursor(del.nodes, del.cursor, [makeText(nextRel)], false);
              setNodes(res.nodes);
              setCursor(res.cursor);
            } else {
              insertTextTokens('=');
            }
          } else {
            insertAstNode({ id: nextId(), type: 'sup', exp: [makeText('-1')] });
          }
          return;

        case 'LOGXY':
          if (currentShift === 'SHIFT') {
            insertAstNode({ id: nextId(), type: 'sum', expr: [], lower: [], upper: [] });
          } else if (currentShift === 'ALPHA') {
            insertAstNode({ id: nextId(), type: 'prod', expr: [], lower: [], upper: [] });
          } else {
            insertAstNode({ id: nextId(), type: 'logbase', base: [], arg: [] });
          }
          return;

        case 'FRAC':
          if (currentShift === 'SHIFT') {
            insertAstNode({ id: nextId(), type: 'mixed', whole: [], num: [], den: [] });
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('÷R');
          } else {
            insertAstNode({ id: nextId(), type: 'frac', num: [], den: [] }, true);
          }
          return;

        case 'SQRT':
          if (currentShift === 'SHIFT' || is2nd) {
            insertAstNode({ id: nextId(), type: 'nthroot', index: [makeText('3')], inner: [] });
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('mod');
          } else {
            insertAstNode({ id: nextId(), type: 'sqrt', inner: [] });
          }
          return;

        case 'SQ':
          if (currentShift === 'SHIFT' || is2nd) {
            insertAstNode({ id: nextId(), type: 'sup', exp: [makeText('3')] });
          } else if (currentShift === 'ALPHA') {
            setNodes([]);
            setCursor({ path: [], index: 0 });
            setEvaluated(null);
            setFactDisplay(null);
          } else {
            insertAstNode({ id: nextId(), type: 'sup', exp: [makeText('2')] });
          }
          return;

        case 'POW':
          if (currentShift === 'SHIFT' || is2nd) {
            insertAstNode({ id: nextId(), type: 'nthroot', index: [], inner: [] });
          } else {
            insertAstNode({ id: nextId(), type: 'sup', exp: [] });
          }
          return;

        case 'LOG':
          if (currentShift === 'SHIFT' || is2nd) {
            const baseTen = makeText('10');
            const supNode: MathNode = { id: nextId(), type: 'sup', exp: [] };
            const res = insertNodesAtCursor(
              justEvaluated ? [] : nodes,
              justEvaluated ? { path: [], index: 0 } : cursor,
              [baseTen, supNode],
              false
            );
            setNodes(res.nodes);
            setCursor({
              path: [...(justEvaluated ? [] : cursor.path), { nodeId: supNode.id, slot: 'exp' }],
              index: 0,
            });
            setJustEvaluated(false);
            setEvaluated(null);
          } else {
            insertTextTokens('log(');
          }
          return;

        case 'LN':
          if (currentShift === 'SHIFT' || is2nd) {
            const baseE = makeText('e');
            const supNode: MathNode = { id: nextId(), type: 'sup', exp: [] };
            const res = insertNodesAtCursor(
              justEvaluated ? [] : nodes,
              justEvaluated ? { path: [], index: 0 } : cursor,
              [baseE, supNode],
              false
            );
            setNodes(res.nodes);
            setCursor({
              path: [...(justEvaluated ? [] : cursor.path), { nodeId: supNode.id, slot: 'exp' }],
              index: 0,
            });
            setJustEvaluated(false);
            setEvaluated(null);
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('t');
          } else {
            insertTextTokens('ln(');
          }
          return;

        case 'NEG':
          if (currentShift === 'SHIFT') insertTextTokens('∠');
          else if (currentShift === 'ALPHA') insertTextTokens('a');
          else insertTextTokens('(-)');
          return;

        case 'DMS':
          if (currentShift === 'SHIFT') {
            // Prime factorization of integer result
            const targetNum = evaluated?.numeric ?? livePreview?.numeric;
            if (targetNum !== undefined && Number.isInteger(targetNum)) {
              const pf = primeFactorization(targetNum);
              if (pf) setFactDisplay(pf);
              else showToast('FACT requires integer ≥ 2');
            } else {
              showToast('Evaluate an integer first for FACT');
            }
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('b');
          } else {
            // If just evaluated, toggle DMS formatting on display
            if (justEvaluated && evaluated?.numeric !== undefined) {
              const dms = toDMS(evaluated.numeric);
              const dmsStr = `${dms.negative ? '-' : ''}${dms.deg}°${dms.min}'${dms.sec}"`;
              setFactDisplay((prev) => (prev === dmsStr ? null : dmsStr));
            } else {
              // Insert °, then ', then "
              const seq = getSequenceAtPath(nodes, cursor.path);
              const textBefore = seq
                .slice(0, cursor.index)
                .map((n) => (n.type === 'text' ? n.value : ''))
                .join('');
              const lastDeg = textBefore.lastIndexOf('°');
              const lastMin = textBefore.lastIndexOf("'");
              if (lastDeg === -1) insertTextTokens('°');
              else if (lastMin < lastDeg) insertTextTokens("'");
              else insertTextTokens('"');
            }
          }
          return;

        case 'HYP':
          if (currentShift === 'SHIFT') insertAstNode({ id: nextId(), type: 'abs', inner: [] });
          else if (currentShift === 'ALPHA') insertTextTokens('c');
          else setActiveModal('HYP');
          return;

        case 'SIN':
          if (currentShift === 'SHIFT') insertTextTokens('asin(');
          else if (currentShift === 'ALPHA') insertTextTokens('d');
          else insertTextTokens(is2nd ? 'sinh(' : 'sin(');
          return;

        case 'COS':
          if (currentShift === 'SHIFT') insertTextTokens('acos(');
          else if (currentShift === 'ALPHA') insertTextTokens('e');
          else insertTextTokens(is2nd ? 'cosh(' : 'cos(');
          return;

        case 'TAN':
          if (currentShift === 'SHIFT') insertTextTokens('atan(');
          else if (currentShift === 'ALPHA') insertTextTokens('f');
          else insertTextTokens(is2nd ? 'tanh(' : 'tan(');
          return;

        case 'RCL':
          if (currentShift === 'SHIFT') {
            setStoPending(true);
            showToast('STO: Tap variable key (a–f, x, y, m)');
          } else if (currentShift === 'ALPHA') {
            setVariables({ ...DEFAULT_VARIABLES });
            showToast('All variables cleared (CLRv)');
          } else {
            setActiveModal('VARIABLES');
          }
          return;

        case 'ENG':
          if (currentShift === 'SHIFT') insertTextTokens('i');
          else if (currentShift === 'ALPHA') insertTextTokens('cot(');
          else {
            setNumberFormat((f) => (f === 'ENG' ? 'NORM' : 'ENG'));
            showToast(numberFormat === 'ENG' ? 'Format: NORM' : 'Format: ENG');
          }
          return;

        case 'LPAREN':
          if (currentShift === 'SHIFT' || is2nd) insertTextTokens('%');
          else if (currentShift === 'ALPHA') insertTextTokens('acot(');
          else insertTextTokens('(');
          return;

        case 'RPAREN':
          if (currentShift === 'SHIFT') insertTextTokens(',');
          else if (currentShift === 'ALPHA') insertTextTokens('x');
          else insertTextTokens(')');
          return;

        case 'SD':
          if (currentShift === 'SHIFT') {
            if (evaluated?.numeric !== undefined) {
              const f = toFraction(evaluated.numeric, 10000);
              if (f) {
                const mixedStr = formatFractionStr(f, true);
                const impStr = formatFractionStr(f, false);
                setFactDisplay((prev) => (prev === mixedStr ? impStr : mixedStr));
              }
            }
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('y');
          } else {
            const target = evaluated || livePreview;
            if (target && target.displayVariants.length > 1) {
              setVariantIdx((idx) => (idx + 1) % target.displayVariants.length);
            }
          }
          return;

        case 'MPLUS':
          if (currentShift === 'ALPHA') {
            insertTextTokens('m');
          } else {
            const val = evaluated?.complex ?? livePreview?.complex ?? ans;
            const subtract = currentShift === 'SHIFT' || is2nd;
            const nextM = subtract ? C.cSub(variables.m, val) : C.cAdd(variables.m, val);
            setVariables((prev) => ({ ...prev, m: nextM }));
            showToast(`M ${subtract ? '−' : '+'} = ${formatComplex(nextM, numberFormat, precisionDigits)}`);
          }
          return;

        case 'N7':
          if (currentShift === 'SHIFT') setActiveModal('CONST');
          else insertTextTokens('7');
          return;
        case 'N8':
          if (currentShift === 'SHIFT') setActiveModal('CONV');
          else if (currentShift === 'ALPHA') setActiveModal('SI');
          else insertTextTokens('8');
          return;
        case 'N9':
          if (currentShift === 'SHIFT') {
            insertAstNode({ id: nextId(), type: 'limit', expr: [], to: [] });
          } else if (currentShift === 'ALPHA') {
            insertTextTokens('∞');
          } else {
            insertTextTokens('9');
          }
          return;

        case 'DEL': {
          const res = deleteAtCursor(nodes, cursor);
          setNodes(res.nodes);
          setCursor(res.cursor);
          setEvaluated(null);
          setJustEvaluated(false);
          setFactDisplay(null);
          return;
        }

        case 'AC':
          if (currentShift === 'SHIFT') {
            setNodes([]);
            setCursor({ path: [], index: 0 });
            setEvaluated(null);
            setJustEvaluated(false);
            setFactDisplay(null);
            setVariables({ ...DEFAULT_VARIABLES });
            setAns(C.c(0));
            setPreAns(C.c(0));
            showToast('Cleared All Memory & Screen');
          } else {
            setNodes([]);
            setCursor({ path: [], index: 0 });
            setEvaluated(null);
            setJustEvaluated(false);
            setFactDisplay(null);
          }
          return;

        case 'N4':
          if (currentShift === 'SHIFT' || currentShift === 'ALPHA') setActiveModal('MATRIX');
          else insertTextTokens('4');
          return;
        case 'N5':
          if (currentShift === 'SHIFT') setActiveModal('VECTOR');
          else insertTextTokens('5');
          return;
        case 'N6':
          if (currentShift === 'SHIFT') setActiveModal('FUNC');
          else if (currentShift === 'ALPHA') setActiveModal('HELP');
          else insertTextTokens('6');
          return;

        case 'MUL':
          if (currentShift === 'SHIFT') insertTextTokens('nPr');
          else if (currentShift === 'ALPHA') insertTextTokens('gcd(');
          else insertTextTokens('×');
          return;
        case 'DIV':
          if (currentShift === 'SHIFT') insertTextTokens('nCr');
          else if (currentShift === 'ALPHA') insertTextTokens('lcm(');
          else insertTextTokens('÷');
          return;

        case 'N1':
          if (currentShift === 'SHIFT') setActiveModal('STAT');
          else insertTextTokens('1');
          return;
        case 'N2':
          if (currentShift === 'SHIFT') setActiveModal('CMPLX');
          else insertTextTokens('2');
          return;
        case 'N3':
          if (currentShift === 'SHIFT') setActiveModal('DISTR');
          else insertTextTokens('3');
          return;

        case 'ADD':
          if (currentShift === 'SHIFT') insertTextTokens('pol(');
          else if (currentShift === 'ALPHA') insertTextTokens('ceil(');
          else insertTextTokens('+');
          return;
        case 'SUB':
          if (currentShift === 'SHIFT') insertTextTokens('rec(');
          else if (currentShift === 'ALPHA') insertTextTokens('floor(');
          else insertTextTokens('−');
          return;

        case 'N0':
          if (currentShift === 'SHIFT') {
            const toCopy = evaluated?.formattedDecimal || nodesToReadableText(nodes) || ansFormatted;
            setClipboardBuffer(toCopy);
            navigator.clipboard?.writeText(toCopy).catch(() => {});
            showToast(`Copied: ${toCopy}`);
          } else if (currentShift === 'ALPHA') {
            if (clipboardBuffer) {
              insertTextTokens(clipboardBuffer);
            } else {
              navigator.clipboard
                ?.readText()
                .then((t) => {
                  if (t) insertTextTokens(t);
                })
                .catch(() => showToast('Paste buffer empty'));
            }
          } else {
            insertTextTokens('0');
          }
          return;

        case 'DOT':
          if (currentShift === 'SHIFT') insertTextTokens('Ran#');
          else if (currentShift === 'ALPHA') insertTextTokens('ranint(');
          else insertTextTokens('.');
          return;

        case 'EXP':
          if (currentShift === 'SHIFT') insertTextTokens('π');
          else if (currentShift === 'ALPHA') insertTextTokens('e');
          else insertTextTokens('×10^');
          return;

        case 'ANS':
          if (currentShift === 'ALPHA') insertTextTokens('PreAns');
          else insertTextTokens('Ans');
          return;

        case 'EQ':
          if (currentShift === 'SHIFT') setActiveModal('HISTORY');
          else handleEvaluate();
          return;
      }
    },
    [
      soundEnabled,
      shift,
      stoPending,
      nodes,
      cursor,
      is2nd,
      justEvaluated,
      evaluated,
      livePreview,
      ans,
      ansFormatted,
      variables,
      numberFormat,
      precisionDigits,
      history,
      historyNavIdx,
      clipboardBuffer,
      handleStoreVariable,
      handleEvaluate,
      insertTextTokens,
      insertAstNode,
      handleLoadHistoryExpression,
      showToast,
    ]
  );

  // Physical Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal) {
        if (e.key === 'Escape') setActiveModal(null);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const map: Record<string, KeyActionId> = {
        '0': 'N0', '1': 'N1', '2': 'N2', '3': 'N3', '4': 'N4',
        '5': 'N5', '6': 'N6', '7': 'N7', '8': 'N8', '9': 'N9',
        '.': 'DOT', '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV',
        '(': 'LPAREN', ')': 'RPAREN', '^': 'POW',
        Enter: 'EQ', '=': 'EQ', Backspace: 'DEL', Escape: 'AC',
        ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
      };

      if (map[e.key]) {
        e.preventDefault();
        handleKeyPress(map[e.key]);
      } else if (e.key === 's') {
        insertTextTokens('sin(');
      } else if (e.key === 'c') {
        insertTextTokens('cos(');
      } else if (e.key === 't') {
        insertTextTokens('tan(');
      } else if (e.key === 'l') {
        insertTextTokens('log(');
      } else if (e.key === 'p') {
        insertTextTokens('π');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, handleKeyPress, insertTextTokens]);

  // Theme palette classes
  const chassisClass =
    theme === 'obsidian'
      ? 'bg-[#0C0D0F]'
      : theme === 'midnight'
      ? 'bg-[#121725]'
      : theme === 'retro'
      ? 'bg-[#212320]'
      : 'bg-[#141517]';

  const buttonToneClass =
    theme === 'midnight'
      ? 'bg-[#262D40] hover:bg-[#313A52] text-white border-[#3E4863]'
      : theme === 'obsidian'
      ? 'bg-[#28292C] hover:bg-[#343538] text-white border-[#3A3B3F]'
      : 'bg-[#343537] hover:bg-[#414245] text-white border-[#4A4B4E]';

  // Determine displayed output line
  const activeResult = evaluated || livePreview;
  const displayedOutput = useMemo(() => {
    if (factDisplay) return factDisplay;
    if (evaluated && !evaluated.ok) return evaluated.error || 'Syntax Error';
    if (!activeResult) return '';
    return activeResult.displayVariants[variantIdx % activeResult.displayVariants.length] ?? activeResult.formattedDecimal;
  }, [factDisplay, evaluated, activeResult, variantIdx]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#0E0F11] flex items-center justify-center sm:p-4 lg:p-6">
      <div className="w-full max-w-[100vw] lg:max-w-[900px] flex items-center justify-center gap-6">
        {/* MAIN CALCES CALCULATOR UNIT (Matches Screenshot 1:1) */}
        <main
          className={`w-full max-w-[440px] min-h-[100dvh] sm:min-h-0 sm:rounded-[20px] ${chassisClass} sm:border sm:border-white/10 sm:shadow-[0_24px_70px_rgba(0,0,0,0.75)] flex flex-col justify-between overflow-hidden`}
        >
          {/* TOP STATUS BAR */}
          <div className="px-2.5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wide select-none">
            <div className="flex items-center gap-2">
              <span className={shift === 'SHIFT' ? 'text-[#F8C42C]' : 'text-[#44464A]'}>S</span>
              <span className={shift === 'ALPHA' ? 'text-[#9D85E8]' : 'text-[#44464A]'}>A</span>
              <span className={stoPending ? 'text-[#F8C42C]' : 'text-[#44464A]'}>STO</span>
              <button
                type="button"
                onClick={() => setActiveModal('VARIABLES')}
                className="text-[#44464A] hover:text-slate-300 cursor-pointer"
              >
                RCL
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('SETTINGS')}
                className="text-[#D4D6D9] hover:text-white cursor-pointer"
              >
                {numberFormat}-{precisionDigits}
              </button>
              <button
                type="button"
                onClick={() => setInputMode((m) => (m === 'MATH' ? 'LINE' : 'MATH'))}
                className="text-[#D4D6D9] hover:text-white cursor-pointer"
              >
                {inputMode}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('MODE')}
                className="text-[#D4D6D9] hover:text-white cursor-pointer"
              >
                {calcMode === 'COMP' ? baseMode : calcMode}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {is2nd && <span className="text-[#9D85E8] font-bold">2nd</span>}
              {Math.hypot(variables.m.re, variables.m.im) > 1e-11 && (
                <span className="text-[#F8C42C]">M</span>
              )}
            </div>
          </div>

          {/* LCD DISPLAY PANEL */}
          <div className="px-2 pb-1.5">
            <div className="relative w-full min-h-[146px] sm:min-h-[164px] max-h-[210px] rounded-[8px] bg-[#E3ECE8] border border-black/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] px-3 py-2.5 flex flex-col justify-between overflow-hidden">
              {/* Top-right 3-dot display menu */}
              <button
                type="button"
                aria-label="Display options"
                onClick={() => setActiveModal('DISPLAY_MENU')}
                className="absolute top-2 right-1.5 w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center text-[#5A6266] cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Expression Area */}
              <div className="pr-6 overflow-y-auto no-scrollbar max-h-[115px]">
                <MathDisplay
                  nodes={nodes}
                  cursor={cursor}
                  inputMode={inputMode}
                  onSetCursor={setCursor}
                />
              </div>

              {/* Toast / Mode Notification inside LCD */}
              {toastMsg && (
                <div className="text-[11px] font-calc-mono text-[#6F54D4] font-medium truncate">
                  {toastMsg}
                </div>
              )}

              {/* Result Line */}
              <div className="flex items-end justify-between gap-2 pt-1 border-t border-black/[0.06] min-h-[34px]">
                <div className="flex items-center gap-1.5">
                  {activeResult && activeResult.displayVariants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleKeyPress('SD')}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/15 text-[#303538] cursor-pointer"
                    >
                      S⇌D
                    </button>
                  )}
                </div>

                <div
                  className={`font-calc-mono text-right truncate max-w-[85%] ${
                    evaluated && !evaluated.ok
                      ? 'text-rose-700 text-sm font-semibold'
                      : evaluated
                      ? 'text-[#141618] text-[22px] sm:text-[24px] font-bold leading-none'
                      : 'text-[#555E62] text-[17px] font-medium leading-none'
                  }`}
                >
                  {displayedOutput}
                </div>
              </div>
            </div>
          </div>

          {/* TOOLBAR ROW (Menu, PRO, Palette, Σ, Settings, +/-, Camera ... DEG) */}
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label="Tools Menu"
                onClick={() => setActiveModal('MENU')}
                className="w-7 h-7 rounded-[6px] border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('PRO')}
                className="h-7 px-2 rounded-full bg-[#D8B4FE] hover:bg-[#E4C9FF] text-[#1D162B] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Gem className="w-3.5 h-3.5" />
                <span>PRO</span>
              </button>

              <button
                type="button"
                aria-label="Theme"
                onClick={() => setActiveModal('THEME')}
                className="w-7 h-7 rounded-full border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Functions and Calculus"
                onClick={() => setActiveModal('SIGMA')}
                className="w-7 h-7 rounded-full border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center font-serif text-sm cursor-pointer"
              >
                Σ
              </button>

              <button
                type="button"
                aria-label="Settings"
                onClick={() => setActiveModal('SETTINGS')}
                className="w-7 h-7 rounded-full border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                aria-label="Toggle Sign or History"
                onClick={() => setActiveModal('HISTORY')}
                title="Calculation History"
                className="w-7 h-7 rounded-full border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center text-[11px] font-bold cursor-pointer"
              >
                ±
              </button>

              <button
                type="button"
                aria-label="Export or Copy"
                onClick={() => setActiveModal('EXPORT')}
                className="w-7 h-7 rounded-md border border-white/25 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setAngleUnit((u) => (u === 'DEG' ? 'RAD' : u === 'RAD' ? 'GRAD' : 'DEG'))
              }
              className="h-6 px-2.5 rounded-full border border-white/35 hover:bg-white/10 text-white text-[11px] font-semibold tracking-wide cursor-pointer"
            >
              {angleUnit}
            </button>
          </div>

          {/* FULL SCIENTIFIC KEYPAD */}
          <Keypad
            shift={shift}
            is2nd={is2nd}
            stoPending={stoPending}
            onKeyPress={handleKeyPress}
            buttonToneClass={buttonToneClass}
          />
        </main>

        {/* DESKTOP WORKSTATION PANEL (History Tape, Memory Registers, Modules) */}
        <DesktopCompanion
          history={history}
          onLoadHistoryExpression={handleLoadHistoryExpression}
          onInsertText={insertTextTokens}
          onDeleteHistoryItem={(id) => setHistory((prev) => prev.filter((x) => x.id !== id))}
          onClearHistory={() => setHistory([])}
          variables={variables}
          ansFormatted={ansFormatted}
          preAnsFormatted={preAnsFormatted}
          numberFormat={numberFormat}
          precisionDigits={precisionDigits}
          onOpenModal={setActiveModal}
        />
      </div>

      {/* ALL INTERACTIVE MODALS & SHEETS */}
      <Modals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        history={history}
        onLoadHistoryExpression={handleLoadHistoryExpression}
        onInsertText={insertTextTokens}
        onDeleteHistoryItem={(id) => setHistory((prev) => prev.filter((x) => x.id !== id))}
        onClearHistory={() => setHistory([])}
        angleUnit={angleUnit}
        onChangeAngleUnit={setAngleUnit}
        numberFormat={numberFormat}
        onChangeNumberFormat={setNumberFormat}
        precisionDigits={precisionDigits}
        onChangePrecision={setPrecisionDigits}
        inputMode={inputMode}
        onChangeInputMode={setInputMode}
        calcMode={calcMode}
        onChangeCalcMode={setCalcMode}
        baseMode={baseMode}
        onChangeBaseMode={setBaseMode}
        theme={theme}
        onChangeTheme={setTheme}
        variables={variables}
        onUpdateVariable={(name, val) =>
          setVariables((prev) => ({ ...prev, [name]: C.c(val) }))
        }
        onClearVariables={() => {
          setVariables({ ...DEFAULT_VARIABLES });
          showToast('Variables cleared');
        }}
        ansFormatted={ansFormatted}
        preAnsFormatted={preAnsFormatted}
        currentNodes={nodes}
        evalContext={evalContext}
        onSetResultDirect={(label, numeric) => {
          const z = C.c(numeric);
          setPreAns(ans);
          setAns(z);
          const formatted = formatComplex(z, numberFormat, precisionDigits);
          setEvaluated({
            ok: true,
            numeric,
            complex: z,
            formattedDecimal: formatted,
            displayVariants: [formatted],
          });
          setJustEvaluated(true);
          setHistory((prev) => [
            {
              id: nextId(),
              expressionNodes: cloneNodes(nodes),
              expressionText: label,
              resultText: formatted,
              numeric,
              complex: z,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 99),
          ]);
        }}
        onOpenModal={setActiveModal}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
      />
    </div>
  );
}
