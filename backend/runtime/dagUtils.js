/**
 * Deliberately scoped to LINEAR chains: every node has at most one
 * outgoing edge that matters for execution order. All three of the
 * project's actual workflows (GitHub Analyzer, Resume Builder, the
 * onboarding starter) are linear chains -- none of them branch.
 *
 * Branching (a Condition node with two outgoing edges, "take this path
 * if X") is real DAG territory and would need this module to pick
 * *which* outgoing edge to follow based on the previous node's output,
 * not just "the" outgoing edge. That's a deliberate non-goal here --
 * it's not required by any current template, and building it now would
 * mean designing conditional-branch semantics nobody has asked for yet.
 * If a Condition node type gets added later, this file is where that
 * logic would go.
 */

function getEntryNode(nodes, edges) {
  const targetIds = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targetIds.has(n.id)) || null;
}

function getNextNode(nodes, edges, currentNodeId) {
  const outgoing = edges.find((e) => e.source === currentNodeId);
  if (!outgoing) return null; // no outgoing edge -- this was the last node
  return nodes.find((n) => n.id === outgoing.target) || null;
}

module.exports = { getEntryNode, getNextNode };
