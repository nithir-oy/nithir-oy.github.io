function generateEulerTrail(edges) {
  if (!edges || edges.length === 0) return null;

  const degree = {};
  for (const [a, b] of edges) {
    degree[a] = (degree[a] || 0) + 1;
    degree[b] = (degree[b] || 0) + 1;
  }
  const nodes = Object.keys(degree).map(n => Number(n));
  const odd = nodes.filter(n => degree[n] % 2 === 1);
  const start = odd.length === 2 ? odd[0] : nodes[0];

  const edgeList = edges.map(([a, b], id) => ({ id, a, b, used: false }));
  const incident = new Map();
  for (const n of nodes) incident.set(n, []);
  edgeList.forEach((e, i) => {
    incident.get(e.a).push(i);
    incident.get(e.b).push(i);
  });

  const stack = [start];
  const path = [];

  while (stack.length) {
    const v = stack[stack.length - 1];
    const list = incident.get(v);
    const nextIndex = list.find(i => !edgeList[i].used);

    if (nextIndex === undefined) {
      path.push(stack.pop());
    } else {
      const e = edgeList[nextIndex];
      e.used = true;
      const to = (e.a === v) ? e.b : e.a;
      stack.push(to);
    }
  }

  const usedCount = edgeList.filter(e => e.used).length;
  if (usedCount !== edges.length) return null;

  return path.reverse();
}