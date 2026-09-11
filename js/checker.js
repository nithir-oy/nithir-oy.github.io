function checkPattern(edges) {
  const degree = {};
  const seen = new Set();

  for (const [a, b] of edges) {
    const u = Math.min(a, b);
    const v = Math.max(a, b);
    const key = `${u}-${v}`;
    if (seen.has(key)) {
      return { ok: false, reason: `duplicate edge: ${key}` };
    }
    seen.add(key);

    degree[a] = (degree[a] || 0) + 1;
    degree[b] = (degree[b] || 0) + 1;
  }

  const nodes = Object.keys(degree).map(n => Number(n));
  if (nodes.length === 0) {
    return { ok: false, reason: "no nodes" };
  }

  const oddNodes = nodes.filter(n => degree[n] % 2 === 1);
  if (!(oddNodes.length === 0 || oddNodes.length === 2)) {
    return {
      ok: false,
      reason: `invalid odd-degree count: ${oddNodes.length} (must be 0 or 2)`,
      oddNodes
    };
  }

  const adj = new Map();
  for (const n of nodes) adj.set(n, []);
  for (const [a, b] of edges) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }

  const visited = new Set();
  const stack = [nodes[0]];
  while (stack.length) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nxt of adj.get(cur)) {
      if (!visited.has(nxt)) stack.push(nxt);
    }
  }

  if (visited.size !== nodes.length) {
    return {
      ok: false,
      reason: `graph not connected: visited ${visited.size} / ${nodes.length}`,
      visited: Array.from(visited)
    };
  }

  const trail = generateEulerTrail(edges);
  if (!trail) {
    return {
      ok: false,
      reason: "no euler trail (could not use all edges)"
    };
  }

  return {
    ok: true,
    type: oddNodes.length === 2 ? "trail" : "circuit",
    start: oddNodes.length === 2 ? oddNodes[0] : nodes[0],
    oddNodes,
    trailNodes: trail
  };
}