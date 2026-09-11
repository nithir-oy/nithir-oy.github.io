// ===============================
// ONE LINE - Level Generator (20問版)
// ===============================

// ---- A：リング生成 ----
function generateRingPattern(nodeCount) {
  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    edges.push([i, (i + 1) % nodeCount]);
  }
  return edges;
}

// ---- B：ランダム閉路生成 ----
function generateRandomCycle(nodeCount) {
  const nodes = [...Array(nodeCount).keys()];

  // シャッフル
  for (let i = nodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
  }

  const edges = [];
  for (let i = 0; i < nodeCount; i++) {
    edges.push([nodes[i], nodes[(i + 1) % nodeCount]]);
  }
  return edges;
}

// ---- C：閉路＋小閉路（複雑構造） ----
function generateComplexCycle(nodeCount) {
  const base = generateRandomCycle(nodeCount);

  const smallCount = Math.random() < 0.5 ? 3 : 4;
  const smallNodes = [];
  while (smallNodes.length < smallCount) {
    const n = Math.floor(Math.random() * nodeCount);
    if (!smallNodes.includes(n)) smallNodes.push(n);
  }

  const smallEdges = [];
  for (let i = 0; i < smallNodes.length; i++) {
    smallEdges.push([smallNodes[i], smallNodes[(i + 1) % smallNodes.length]]);
  }

  const joint = smallNodes[0];

  // base側のjointに接続する辺を1本だけ削除
  const baseFiltered = [...base];
  const baseIndex = baseFiltered.findIndex(([a, b]) => a === joint || b === joint);
  if (baseIndex !== -1) baseFiltered.splice(baseIndex, 1);

  // small側のjointに接続する辺を1本だけ削除
  const smallFiltered = [...smallEdges];
  const smallIndex = smallFiltered.findIndex(([a, b]) => a === joint || b === joint);
  if (smallIndex !== -1) smallFiltered.splice(smallIndex, 1);

  // 新しい接続を追加
  const newEdge = [joint, smallNodes[1]];

  const edges = [...baseFiltered, ...smallFiltered, newEdge];
  return edges;
}

// ---- 次数チェック ----
function validatePattern(edges, nodeCount) {
  const degree = Array(nodeCount).fill(0);

  edges.forEach(([a, b]) => {
    degree[a]++;
    degree[b]++;
  });

  const allTwo = degree.every(d => d === 2);
  return { degree, isValid: allTwo };
}

// ---- 20問生成 ----
function generate20Levels() {
  const levels = [];
  const patterns = {};

  for (let id = 1; id <= 20; id++) {
    const layoutName = "A" + ((id - 1) % 10 + 1);
    let edges;

    if (id <= 10) {
      edges = generateRingPattern(10);
    } else {
      edges = generateRandomCycle(10);
    }

    // 安全性チェック（A/Bは基本的に常にOKだけど念のため）
    let attempts = 0;
    while (!validatePattern(edges, 10).isValid && attempts < 5) {
      if (id <= 10) edges = generateRingPattern(10);
      else edges = generateRandomCycle(10);
      attempts++;
    }

    const patternName = "D" + id;
    patterns[patternName] = edges;

    levels.push({
      id,
      layout: layoutName,
      pattern: patternName
    });
  }

  return { levels, patterns };
}

function formatPatterns(patterns) {
  let out = "{\n";
  const keys = Object.keys(patterns);

  keys.forEach((key, index) => {
    const edges = patterns[key]
      .map(([a, b]) => `[${a},${b}]`)
      .join(",");

    out += ` "${key}": [\n  ${edges}\n ]`;
    if (index < keys.length - 1) out += ",\n";
  });

  out += "\n}";
  return out;
}

// ---- 実行して JSON を出力 ----
const result = generate20Levels();

console.log("=== level-schemes.json ===");
console.log(JSON.stringify(result.levels, null, 1));

console.log("=== edge-patterns.json ===");
console.log(formatPatterns(result.patterns));