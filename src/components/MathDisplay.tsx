import React from 'react';
import { CursorPos, CursorStep, InputMode, MathNode } from '../types/calculator';
import { nodesToReadableText } from '../engine/mathNodes';

interface MathDisplayProps {
  nodes: MathNode[];
  cursor: CursorPos;
  inputMode: InputMode;
  onSetCursor: (pos: CursorPos) => void;
  fontSize?: 'sm' | 'md' | 'lg';
}

function pathsEqual(a: CursorStep[], b: CursorStep[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].nodeId !== b[i].nodeId || a[i].slot !== b[i].slot) return false;
  }
  return true;
}

const CursorBar: React.FC = () => (
  <span
    aria-hidden="true"
    className="lcd-cursor inline-block w-[2px] h-[1.15em] bg-[#7658E0] align-middle mx-[0.5px] rounded-full"
  />
);

export const MathDisplay: React.FC<MathDisplayProps> = ({
  nodes,
  cursor,
  inputMode,
  onSetCursor,
  fontSize = 'lg',
}) => {
  if (inputMode === 'LINE') {
    const text = nodesToReadableText(nodes);
    return (
      <div className="font-calc-mono text-xl leading-relaxed text-[#181A1B] break-all whitespace-pre-wrap">
        {text || <span className="opacity-0">0</span>}
        <CursorBar />
      </div>
    );
  }

  const sizeClass =
    fontSize === 'sm' ? 'text-base' : fontSize === 'md' ? 'text-xl' : 'text-[23px]';

  const renderSeq = (seq: MathNode[], path: CursorStep[], isSlot = false): React.ReactNode => {
    const isHere = pathsEqual(path, cursor.path);

    if (seq.length === 0) {
      return (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSetCursor({ path, index: 0 });
          }}
          className={`inline-flex items-center justify-center min-w-[14px] min-h-[20px] px-0.5 rounded-[2px] cursor-text ${
            isSlot
              ? isHere
                ? 'bg-[#7658E0]/15 border border-[#7658E0]'
                : 'border border-dashed border-slate-500/50 bg-black/[0.03]'
              : ''
          }`}
        >
          {isHere && <CursorBar />}
        </span>
      );
    }

    const items: React.ReactNode[] = [];
    for (let i = 0; i <= seq.length; i++) {
      if (isHere && cursor.index === i) {
        items.push(<CursorBar key={`cur_${i}`} />);
      }
      if (i === seq.length) break;
      const node = seq[i];
      items.push(renderNode(node, path, i));
    }

    return <span className="inline-flex items-center flex-wrap gap-y-0.5">{items}</span>;
  };

  const renderNode = (node: MathNode, parentPath: CursorStep[], indexInSeq: number): React.ReactNode => {
    const handleBeforeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSetCursor({ path: parentPath, index: indexInSeq + 1 });
    };

    switch (node.type) {
      case 'text': {
        const displayVal = node.value === '(-)' ? '−' : node.value;
        return (
          <span
            key={node.id}
            onClick={handleBeforeClick}
            className="inline-block whitespace-pre cursor-text leading-tight"
          >
            {displayVal}
          </span>
        );
      }

      case 'frac': {
        return (
          <span
            key={node.id}
            className="inline-flex flex-col items-center align-middle mx-1 text-[0.82em]"
          >
            <span className="px-1 pb-[2px] border-b-[1.5px] border-current min-w-[18px] text-center leading-tight">
              {renderSeq(node.num, [...parentPath, { nodeId: node.id, slot: 'num' }], true)}
            </span>
            <span className="px-1 pt-[2px] min-w-[18px] text-center leading-tight">
              {renderSeq(node.den, [...parentPath, { nodeId: node.id, slot: 'den' }], true)}
            </span>
          </span>
        );
      }

      case 'mixed': {
        return (
          <span key={node.id} className="inline-flex items-center align-middle mx-1">
            <span className="mr-0.5">
              {renderSeq(node.whole, [...parentPath, { nodeId: node.id, slot: 'whole' }], true)}
            </span>
            <span className="inline-flex flex-col items-center text-[0.78em]">
              <span className="px-1 pb-[1.5px] border-b-[1.5px] border-current min-w-[16px] text-center leading-tight">
                {renderSeq(node.num, [...parentPath, { nodeId: node.id, slot: 'num' }], true)}
              </span>
              <span className="px-1 pt-[1.5px] min-w-[16px] text-center leading-tight">
                {renderSeq(node.den, [...parentPath, { nodeId: node.id, slot: 'den' }], true)}
              </span>
            </span>
          </span>
        );
      }

      case 'sqrt': {
        return (
          <span key={node.id} className="inline-flex items-stretch align-middle mx-0.5">
            <span className="inline-flex items-center font-normal select-none leading-none mr-[-1px] text-[1.15em]">
              √
            </span>
            <span className="border-t-[1.5px] border-current pt-[2px] px-1 inline-flex items-center">
              {renderSeq(node.inner, [...parentPath, { nodeId: node.id, slot: 'inner' }], true)}
            </span>
          </span>
        );
      }

      case 'nthroot': {
        return (
          <span key={node.id} className="inline-flex items-stretch align-middle mx-0.5">
            <span className="inline-flex flex-col justify-start mr-[-2px]">
              <span className="text-[0.6em] leading-none mb-[-2px]">
                {renderSeq(node.index, [...parentPath, { nodeId: node.id, slot: 'index' }], true)}
              </span>
            </span>
            <span className="inline-flex items-center leading-none text-[1.15em]">√</span>
            <span className="border-t-[1.5px] border-current pt-[2px] px-1 inline-flex items-center">
              {renderSeq(node.inner, [...parentPath, { nodeId: node.id, slot: 'inner' }], true)}
            </span>
          </span>
        );
      }

      case 'sup': {
        return (
          <span
            key={node.id}
            className="inline-flex items-center align-super text-[0.68em] -translate-y-[0.42em] ml-[1px] mr-[2px]"
          >
            {renderSeq(node.exp, [...parentPath, { nodeId: node.id, slot: 'exp' }], true)}
          </span>
        );
      }

      case 'logbase': {
        return (
          <span key={node.id} className="inline-flex items-baseline mx-0.5">
            <span>log</span>
            <span className="text-[0.65em] translate-y-[0.22em] mx-[1px]">
              {renderSeq(node.base, [...parentPath, { nodeId: node.id, slot: 'base' }], true)}
            </span>
            <span>(</span>
            <span>{renderSeq(node.arg, [...parentPath, { nodeId: node.id, slot: 'arg' }], true)}</span>
            <span>)</span>
          </span>
        );
      }

      case 'abs': {
        return (
          <span key={node.id} className="inline-flex items-center mx-0.5">
            <span className="font-light px-[1px]">|</span>
            {renderSeq(node.inner, [...parentPath, { nodeId: node.id, slot: 'inner' }], true)}
            <span className="font-light px-[1px]">|</span>
          </span>
        );
      }

      case 'integral': {
        return (
          <span key={node.id} className="inline-flex items-center align-middle mx-1 gap-1">
            <span className="inline-flex flex-col items-center leading-none">
              <span className="text-[0.58em] mb-0.5">
                {renderSeq(node.upper, [...parentPath, { nodeId: node.id, slot: 'upper' }], true)}
              </span>
              <span className="text-[1.4em] leading-[0.8]">∫</span>
              <span className="text-[0.58em] mt-0.5">
                {renderSeq(node.lower, [...parentPath, { nodeId: node.id, slot: 'lower' }], true)}
              </span>
            </span>
            <span className="inline-flex items-center">
              <span>(</span>
              {renderSeq(node.expr, [...parentPath, { nodeId: node.id, slot: 'expr' }], true)}
              <span>)</span>
              <span className="text-[0.82em] ml-0.5 opacity-80">dx</span>
            </span>
          </span>
        );
      }

      case 'deriv': {
        return (
          <span key={node.id} className="inline-flex items-center align-middle mx-1 gap-0.5">
            <span className="inline-flex flex-col items-center text-[0.65em] leading-none mr-0.5">
              <span className="border-b border-current px-0.5 pb-[1px]">d</span>
              <span className="pt-[1px]">dx</span>
            </span>
            <span>(</span>
            {renderSeq(node.expr, [...parentPath, { nodeId: node.id, slot: 'expr' }], true)}
            <span>)</span>
            <span className="text-[0.68em] ml-0.5 border-l border-current pl-1 flex items-center gap-0.5">
              <span className="opacity-75">x=</span>
              {renderSeq(node.at, [...parentPath, { nodeId: node.id, slot: 'at' }], true)}
            </span>
          </span>
        );
      }

      case 'sum':
      case 'prod': {
        const sym = node.type === 'sum' ? 'Σ' : 'Π';
        return (
          <span key={node.id} className="inline-flex items-center align-middle mx-1 gap-1">
            <span className="inline-flex flex-col items-center leading-none">
              <span className="text-[0.56em] mb-0.5">
                {renderSeq(node.upper, [...parentPath, { nodeId: node.id, slot: 'upper' }], true)}
              </span>
              <span className="text-[1.35em] leading-[0.85]">{sym}</span>
              <span className="text-[0.56em] mt-0.5 flex items-center gap-0.5">
                <span className="opacity-70">x=</span>
                {renderSeq(node.lower, [...parentPath, { nodeId: node.id, slot: 'lower' }], true)}
              </span>
            </span>
            <span className="inline-flex items-center">
              <span>(</span>
              {renderSeq(node.expr, [...parentPath, { nodeId: node.id, slot: 'expr' }], true)}
              <span>)</span>
            </span>
          </span>
        );
      }

      case 'limit': {
        return (
          <span key={node.id} className="inline-flex items-center align-middle mx-1 gap-1">
            <span className="inline-flex flex-col items-center leading-none">
              <span className="text-[0.85em]">lim</span>
              <span className="text-[0.56em] flex items-center gap-0.5">
                <span>x→</span>
                {renderSeq(node.to, [...parentPath, { nodeId: node.id, slot: 'to' }], true)}
              </span>
            </span>
            <span>(</span>
            {renderSeq(node.expr, [...parentPath, { nodeId: node.id, slot: 'expr' }], true)}
            <span>)</span>
          </span>
        );
      }
    }
  };

  return (
    <div
      onClick={() => onSetCursor({ path: [], index: nodes.length })}
      className={`font-calc-mono ${sizeClass} text-[#181A1B] leading-snug break-words cursor-text min-h-[1.5em]`}
    >
      {renderSeq(nodes, [], false)}
    </div>
  );
};
