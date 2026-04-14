/**
 * Polyfill for ReactDOM.findDOMNode() which was removed in React 19.
 * Required for third-party libraries (e.g. react-transition-group) that still use it.
 *
 * Walks React's internal fiber tree to find the first host DOM node, mirroring
 * the original React 18 behaviour.
 */
import ReactDOM from "react-dom";

type Fiber = {
  stateNode: unknown;
  child: Fiber | null;
};

function findFirstHostNode(fiber: Fiber | null): Element | Text | null {
  let node: Fiber | null = fiber;
  while (node !== null) {
    if (
      node.stateNode instanceof Element ||
      node.stateNode instanceof Text
    ) {
      return node.stateNode;
    }
    node = node.child;
  }
  return null;
}

function findDOMNode(
  instance: unknown
): Element | Text | null {
  if (instance == null) return null;
  if (instance instanceof Element || instance instanceof Text) return instance;
  const fiber = (instance as { _reactInternals?: Fiber })._reactInternals ?? null;
  return findFirstHostNode(fiber);
}

// Patch the default export object – the same reference that libraries receive when
// they do `import ReactDOM from 'react-dom'`.
const ReactDOMExports = ReactDOM as unknown as Record<string, unknown>;
if (typeof ReactDOMExports["findDOMNode"] !== "function") {
  ReactDOMExports["findDOMNode"] = findDOMNode;
}
