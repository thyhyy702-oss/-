import { CursorPos, CursorStep, MathNode } from '../types/calculator';

let idCounter = 1;
export const nextId = (): string => `n_${Date.now().toString(36)}_${idCounter++}`;

export const makeText = (value: string): MathNode => ({
  id: nextId(),
  type: 'text',
  value,
});

export function getSlotOrder(node: MathNode): string[] {
  switch (node.type) {
    case 'text':
      return [];
    case 'frac':
      return ['num', 'den'];
    case 'mixed':
      return ['whole', 'num', 'den'];
    case 'sqrt':
    case 'abs':
      return ['inner'];
    case 'nthroot':
      return ['index', 'inner'];
    case 'sup':
      return ['exp'];
    case 'logbase':
      return ['base', 'arg'];
    case 'integral':
    case 'sum':
    case 'prod':
      return ['lower', 'upper', 'expr'];
    case 'deriv':
      return ['expr', 'at'];
    case 'limit':
      return ['to', 'expr'];
  }
}

export function getSlotNodes(node: MathNode, slot: string): MathNode[] {
  return (node as unknown as Record<string, MathNode[]>)[slot] ?? [];
}

export function cloneNodes(nodes: MathNode[]): MathNode[] {
  return nodes.map((n) => {
    if (n.type === 'text') return { ...n };
    const copy: Record<string, unknown> = { ...n };
    for (const s of getSlotOrder(n)) {
      copy[s] = cloneNodes(getSlotNodes(n, s));
    }
    return copy as unknown as MathNode;
  });
}

export function getSequenceAtPath(root: MathNode[], path: CursorStep[]): MathNode[] {
  let seq = root;
  for (const step of path) {
    const found = seq.find((n) => n.id === step.nodeId);
    if (!found) return seq;
    seq = getSlotNodes(found, step.slot);
  }
  return seq;
}

export function updateSequenceAtPath(
  root: MathNode[],
  path: CursorStep[],
  updater: (seq: MathNode[]) => MathNode[]
): MathNode[] {
  if (path.length === 0) {
    return updater([...root]);
  }
  const [head, ...rest] = path;
  return root.map((n) => {
    if (n.id !== head.nodeId) return n;
    const currentSlot = getSlotNodes(n, head.slot);
    const updatedSlot = updateSequenceAtPath(currentSlot, rest, updater);
    return { ...n, [head.slot]: updatedSlot } as MathNode;
  });
}

export function insertNodesAtCursor(
  root: MathNode[],
  cursor: CursorPos,
  nodesToInsert: MathNode[],
  enterFirstSlot = true
): { nodes: MathNode[]; cursor: CursorPos } {
  const newNodes = updateSequenceAtPath(root, cursor.path, (seq) => {
    const copy = [...seq];
    copy.splice(cursor.index, 0, ...nodesToInsert);
    return copy;
  });

  if (enterFirstSlot && nodesToInsert.length > 0) {
    const first = nodesToInsert[0];
    const slots = getSlotOrder(first);
    if (slots.length > 0) {
      // Find first empty slot or default first slot
      let targetSlot = slots[0];
      if (first.type === 'sup' && first.exp.length > 0) {
        // e.g. x^2 or x^-1: stay after the sup node rather than inside it
        return {
          nodes: newNodes,
          cursor: { path: cursor.path, index: cursor.index + nodesToInsert.length },
        };
      }
      if (first.type === 'frac' && first.num.length > 0 && first.den.length === 0) {
        targetSlot = 'den';
      }
      return {
        nodes: newNodes,
        cursor: {
          path: [...cursor.path, { nodeId: first.id, slot: targetSlot }],
          index: getSlotNodes(first, targetSlot).length,
        },
      };
    }
  }

  return {
    nodes: newNodes,
    cursor: { path: cursor.path, index: cursor.index + nodesToInsert.length },
  };
}

export function moveCursorLeft(root: MathNode[], cursor: CursorPos): CursorPos {
  const seq = getSequenceAtPath(root, cursor.path);
  if (cursor.index > 0) {
    const prevNode = seq[cursor.index - 1];
    const slots = getSlotOrder(prevNode);
    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      const slotSeq = getSlotNodes(prevNode, lastSlot);
      return {
        path: [...cursor.path, { nodeId: prevNode.id, slot: lastSlot }],
        index: slotSeq.length,
      };
    }
    return { path: cursor.path, index: cursor.index - 1 };
  }
  // At start of current slot -> check parent
  if (cursor.path.length > 0) {
    const parentStep = cursor.path[cursor.path.length - 1];
    const parentPath = cursor.path.slice(0, -1);
    const parentSeq = getSequenceAtPath(root, parentPath);
    const parentIdx = parentSeq.findIndex((n) => n.id === parentStep.nodeId);
    if (parentIdx >= 0) {
      const parentNode = parentSeq[parentIdx];
      const slots = getSlotOrder(parentNode);
      const slotIdx = slots.indexOf(parentStep.slot);
      if (slotIdx > 0) {
        const prevSlot = slots[slotIdx - 1];
        return {
          path: [...parentPath, { nodeId: parentNode.id, slot: prevSlot }],
          index: getSlotNodes(parentNode, prevSlot).length,
        };
      }
      return { path: parentPath, index: parentIdx };
    }
  }
  return cursor;
}

export function moveCursorRight(root: MathNode[], cursor: CursorPos): CursorPos {
  const seq = getSequenceAtPath(root, cursor.path);
  if (cursor.index < seq.length) {
    const nextNode = seq[cursor.index];
    const slots = getSlotOrder(nextNode);
    if (slots.length > 0) {
      const firstSlot = slots[0];
      return {
        path: [...cursor.path, { nodeId: nextNode.id, slot: firstSlot }],
        index: 0,
      };
    }
    return { path: cursor.path, index: cursor.index + 1 };
  }
  if (cursor.path.length > 0) {
    const parentStep = cursor.path[cursor.path.length - 1];
    const parentPath = cursor.path.slice(0, -1);
    const parentSeq = getSequenceAtPath(root, parentPath);
    const parentIdx = parentSeq.findIndex((n) => n.id === parentStep.nodeId);
    if (parentIdx >= 0) {
      const parentNode = parentSeq[parentIdx];
      const slots = getSlotOrder(parentNode);
      const slotIdx = slots.indexOf(parentStep.slot);
      if (slotIdx >= 0 && slotIdx < slots.length - 1) {
        const nextSlot = slots[slotIdx + 1];
        return {
          path: [...parentPath, { nodeId: parentNode.id, slot: nextSlot }],
          index: 0,
        };
      }
      return { path: parentPath, index: parentIdx + 1 };
    }
  }
  return cursor;
}

export function moveCursorVertical(
  root: MathNode[],
  cursor: CursorPos,
  direction: 'up' | 'down'
): CursorPos | null {
  if (cursor.path.length === 0) return null;
  const currentStep = cursor.path[cursor.path.length - 1];
  const parentPath = cursor.path.slice(0, -1);
  const parentSeq = getSequenceAtPath(root, parentPath);
  const parentNode = parentSeq.find((n) => n.id === currentStep.nodeId);
  if (!parentNode) return null;

  let targetSlot: string | null = null;
  if (parentNode.type === 'frac') {
    if (direction === 'down' && currentStep.slot === 'num') targetSlot = 'den';
    if (direction === 'up' && currentStep.slot === 'den') targetSlot = 'num';
  } else if (parentNode.type === 'mixed') {
    if (direction === 'down' && currentStep.slot === 'num') targetSlot = 'den';
    if (direction === 'up' && currentStep.slot === 'den') targetSlot = 'num';
  } else if (parentNode.type === 'nthroot') {
    if (direction === 'down' && currentStep.slot === 'index') targetSlot = 'inner';
    if (direction === 'up' && currentStep.slot === 'inner') targetSlot = 'index';
  } else if (parentNode.type === 'logbase') {
    if (direction === 'up' && currentStep.slot === 'base') targetSlot = 'arg';
    if (direction === 'down' && currentStep.slot === 'arg') targetSlot = 'base';
  } else if (
    parentNode.type === 'integral' ||
    parentNode.type === 'sum' ||
    parentNode.type === 'prod'
  ) {
    if (direction === 'up') {
      if (currentStep.slot === 'lower') targetSlot = 'expr';
      else if (currentStep.slot === 'expr') targetSlot = 'upper';
    } else {
      if (currentStep.slot === 'upper') targetSlot = 'expr';
      else if (currentStep.slot === 'expr') targetSlot = 'lower';
    }
  }

  if (targetSlot) {
    const slotLen = getSlotNodes(parentNode, targetSlot).length;
    return {
      path: [...parentPath, { nodeId: parentNode.id, slot: targetSlot }],
      index: Math.min(cursor.index, slotLen),
    };
  }
  return null;
}

export function deleteAtCursor(
  root: MathNode[],
  cursor: CursorPos
): { nodes: MathNode[]; cursor: CursorPos } {
  const seq = getSequenceAtPath(root, cursor.path);
  if (cursor.index > 0) {
    const prevNode = seq[cursor.index - 1];
    const slots = getSlotOrder(prevNode);
    if (slots.length > 0) {
      // Check if all slots are empty; if so delete whole container node
      const allEmpty = slots.every((s) => getSlotNodes(prevNode, s).length === 0);
      if (allEmpty) {
        const newNodes = updateSequenceAtPath(root, cursor.path, (s) => {
          const copy = [...s];
          copy.splice(cursor.index - 1, 1);
          return copy;
        });
        return {
          nodes: newNodes,
          cursor: { path: cursor.path, index: cursor.index - 1 },
        };
      }
      // If it's a sup with only -1 or 2, or user wants to delete the node cleanly
      if (prevNode.type === 'sup') {
        const lastSlotNodes = prevNode.exp;
        if (lastSlotNodes.length <= 1) {
          const newNodes = updateSequenceAtPath(root, cursor.path, (s) => {
            const copy = [...s];
            copy.splice(cursor.index - 1, 1);
            return copy;
          });
          return {
            nodes: newNodes,
            cursor: { path: cursor.path, index: cursor.index - 1 },
          };
        }
      }
      // Step into last non-empty slot at the end
      const targetSlot = [...slots].reverse().find((s) => getSlotNodes(prevNode, s).length > 0) || slots[0];
      return {
        nodes: root,
        cursor: {
          path: [...cursor.path, { nodeId: prevNode.id, slot: targetSlot }],
          index: getSlotNodes(prevNode, targetSlot).length,
        },
      };
    }
    const newNodes = updateSequenceAtPath(root, cursor.path, (s) => {
      const copy = [...s];
      copy.splice(cursor.index - 1, 1);
      return copy;
    });
    return {
      nodes: newNodes,
      cursor: { path: cursor.path, index: cursor.index - 1 },
    };
  }

  // At index 0 of a child slot: if current container is completely empty, delete it!
  if (cursor.path.length > 0) {
    const step = cursor.path[cursor.path.length - 1];
    const parentPath = cursor.path.slice(0, -1);
    const parentSeq = getSequenceAtPath(root, parentPath);
    const parentIdx = parentSeq.findIndex((n) => n.id === step.nodeId);
    if (parentIdx >= 0) {
      const parentNode = parentSeq[parentIdx];
      const slots = getSlotOrder(parentNode);
      const allEmpty = slots.every((s) => getSlotNodes(parentNode, s).length === 0);
      if (allEmpty) {
        const newNodes = updateSequenceAtPath(root, parentPath, (s) => {
          const copy = [...s];
          copy.splice(parentIdx, 1);
          return copy;
        });
        return {
          nodes: newNodes,
          cursor: { path: parentPath, index: parentIdx },
        };
      }
      // Otherwise unwrap or move left
      return { nodes: root, cursor: moveCursorLeft(root, cursor) };
    }
  }
  return { nodes: root, cursor };
}

export function nodesToReadableText(nodes: MathNode[]): string {
  return nodes
    .map((n) => {
      switch (n.type) {
        case 'text':
          return n.value;
        case 'frac':
          return `(${nodesToReadableText(n.num)})/(${nodesToReadableText(n.den)})`;
        case 'mixed':
          return `(${nodesToReadableText(n.whole)} + (${nodesToReadableText(n.num)})/(${nodesToReadableText(n.den)}))`;
        case 'sqrt':
          return `√(${nodesToReadableText(n.inner)})`;
        case 'nthroot':
          return `root(${nodesToReadableText(n.index)}, ${nodesToReadableText(n.inner)})`;
        case 'sup':
          return `^(${nodesToReadableText(n.exp)})`;
        case 'logbase':
          return `log_${nodesToReadableText(n.base)}(${nodesToReadableText(n.arg)})`;
        case 'abs':
          return `|${nodesToReadableText(n.inner)}|`;
        case 'integral':
          return `∫(${nodesToReadableText(n.expr)}, ${nodesToReadableText(n.lower)}..${nodesToReadableText(n.upper)})`;
        case 'deriv':
          return `d/dx(${nodesToReadableText(n.expr)}, x=${nodesToReadableText(n.at)})`;
        case 'sum':
          return `Σ(${nodesToReadableText(n.expr)}, ${nodesToReadableText(n.lower)}..${nodesToReadableText(n.upper)})`;
        case 'prod':
          return `Π(${nodesToReadableText(n.expr)}, ${nodesToReadableText(n.lower)}..${nodesToReadableText(n.upper)})`;
        case 'limit':
          return `lim(x→${nodesToReadableText(n.to)}, ${nodesToReadableText(n.expr)})`;
      }
    })
    .join('');
}
