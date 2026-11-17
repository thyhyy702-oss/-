import React, { useState } from 'react';
import {
  HistoryItem,
  ModalSheet,
  NumberFormat,
  VariableName,
  VariablesMap,
} from '../types/calculator';
import { formatComplex } from '../engine/mathEngine';
import { History, Trash2, RotateCcw, CornerDownLeft, Layers, Calculator } from 'lucide-react';

interface DesktopCompanionProps {
  history: HistoryItem[];
  onLoadHistoryExpression: (item: HistoryItem) => void;
  onInsertText: (txt: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  variables: VariablesMap;
  ansFormatted: string;
  preAnsFormatted: string;
  numberFormat: NumberFormat;
  precisionDigits: number;
  onOpenModal: (m: ModalSheet) => void;
}

export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  history,
  onLoadHistoryExpression,
  onInsertText,
  onDeleteHistoryItem,
  onClearHistory,
  variables,
  ansFormatted,
  preAnsFormatted,
  numberFormat,
  precisionDigits,
  onOpenModal,
}) => {
  const [tab, setTab] = useState<'HISTORY' | 'VARS' | 'TOOLS'>('HISTORY');
  const varNames: VariableName[] = ['a', 'b', 'c', 'd', 'e', 'f', 'x', 'y', 'm'];

  const quickTools: Array<{ label: string; desc: string; modal: ModalSheet }> = [
    { label: 'CONST', desc: 'CODATA Constants', modal: 'CONST' },
    { label: 'CONV', desc: 'Unit Converter', modal: 'CONV' },
    { label: 'MATRIX', desc: 'Matrix Operations', modal: 'MATRIX' },
    { label: 'VECTOR', desc: '3D Vector Math', modal: 'VECTOR' },
    { label: 'STAT', desc: 'Stats & Regression', modal: 'STAT' },
    { label: 'DISTR', desc: 'Distributions', modal: 'DISTR' },
    { label: 'EQN', desc: 'Quadratic & Systems', modal: 'EQN' },
    { label: 'GRAPH', desc: 'Plot y = f(x)', modal: 'GRAPH' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[380px] h-[720px] rounded-2xl bg-[#1A1B1E] border border-white/10 shadow-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1.5 bg-[#141517] border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('HISTORY')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'HISTORY' ? 'bg-[#2A2C30] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#F8C42C]" />
          History ({history.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('VARS')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'VARS' ? 'bg-[#2A2C30] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#9D85E8]" />
          Registers
        </button>
        <button
          type="button"
          onClick={() => setTab('TOOLS')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
            tab === 'TOOLS' ? 'bg-[#2A2C30] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-[#E69B56]" />
          Modules
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {tab === 'HISTORY' && (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-slate-400">
                Click an entry to edit or reuse
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center px-4">
                <p className="text-sm text-slate-400">No calculations yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluate any expression with <span className="font-calc-mono text-slate-300">=</span> or Enter to record it here.
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#232529] border border-white/5 hover:border-[#967CE3]/50 p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadHistoryExpression(item)}
                      className="text-left flex-1 cursor-pointer group"
                    >
                      <div className="font-calc-mono text-xs text-slate-300 group-hover:text-white break-all">
                        {item.expressionText}
                      </div>
                      <div className="font-calc-mono text-base font-semibold text-[#F8C42C] mt-1">
                        = {item.resultText}
                      </div>
                      {item.exactText && item.exactText !== item.resultText && (
                        <div className="font-calc-mono text-[11px] text-[#9D85E8]">
                          {item.exactText}
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryItem(item.id)}
                      aria-label="Delete history item"
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => onLoadHistoryExpression(item)}
                      className="px-2 py-1 rounded bg-[#967CE3]/15 hover:bg-[#967CE3]/30 text-[#C5B4FF] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onInsertText(item.resultText)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <CornerDownLeft className="w-3 h-3" /> Use Result
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'VARS' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onInsertText('Ans')}
              className="p-2.5 rounded-xl bg-[#232529] hover:bg-[#2C2E33] border border-white/5 text-left cursor-pointer"
            >
              <div className="text-[11px] font-bold text-[#F8C42C] font-calc-mono">Ans</div>
              <div className="font-calc-mono text-xs text-white truncate mt-0.5">{ansFormatted}</div>
            </button>
            <button
              type="button"
              onClick={() => onInsertText('PreAns')}
              className="p-2.5 rounded-xl bg-[#232529] hover:bg-[#2C2E33] border border-white/5 text-left cursor-pointer"
            >
              <div className="text-[11px] font-bold text-[#9D85E8] font-calc-mono">PreAns</div>
              <div className="font-calc-mono text-xs text-white truncate mt-0.5">{preAnsFormatted}</div>
            </button>
            {varNames.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onInsertText(v)}
                className="p-2.5 rounded-xl bg-[#232529] hover:bg-[#2C2E33] border border-white/5 text-left cursor-pointer"
              >
                <div className="text-[11px] font-bold text-[#9D85E8] font-calc-mono uppercase">{v}</div>
                <div className="font-calc-mono text-xs text-slate-200 truncate mt-0.5">
                  {formatComplex(variables[v], numberFormat, precisionDigits)}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'TOOLS' && (
          <div className="grid grid-cols-2 gap-2">
            {quickTools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => onOpenModal(tool.modal)}
                className="p-3 rounded-xl bg-[#232529] hover:bg-[#2D2F35] border border-white/5 text-left cursor-pointer"
              >
                <div className="font-calc-mono text-xs font-bold text-[#F8C42C]">{tool.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{tool.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts footer */}
      <div className="px-3.5 py-2.5 border-t border-white/10 bg-[#141517] text-[11px] text-slate-400 flex items-center justify-between">
        <span>Keyboard: 0-9, +−*/, ^, (), Enter, Esc</span>
        <button
          type="button"
          onClick={() => onOpenModal('HELP')}
          className="text-[#9D85E8] hover:underline cursor-pointer"
        >
          Guide
        </button>
      </div>
    </aside>
  );
};
