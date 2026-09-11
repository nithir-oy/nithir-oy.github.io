// pattern_generator.js
const edgePatterns = {};
const nodeLayouts = {};
const levelSchemes = [];

function resetAllGeneratedData() {
  Object.keys(edgePatterns).forEach(k => delete edgePatterns[k]);
  Object.keys(nodeLayouts).forEach(k => delete nodeLayouts[k]);
  levelSchemes.length = 0;
}

// ---------------------------------------------------------
// 1. 補助関数
// ---------------------------------------------------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// グラフが連結しているかを判定するBFS関数
function isConnectedGraph(N, edges) {
  if (N <= 0) return true;
  if (!Array.isArray(edges) || edges.length === 0) return false;

  const visited = new Array(N).fill(false);
  const queue = [0];
  visited[0] = true;
  let count = 1;

  while (queue.length > 0) {
    const curr = queue.shift();
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (!e || e.length < 2) continue;
      
      const u = e[0];
      const v = e[1];
      if (u >= N || v >= N || u < 0 || v < 0) continue; // 不正なノード番号をスキップ

      let next = -1;
      if (u === curr) next = v;
      else if (v === curr) next = u;

      if (next !== -1 && !visited[next]) {
        visited[next] = true;
        count++;
        queue.push(next);
      }
    }
  }
  return count === N;
}

// 一筆書きの解が少なくとも1つ存在するか高速判定する関数
function hasAtLeastOneEulerPath(N, edges) {
  if (!edges || edges.length === 0) return false;
  const numEdges = edges.length;

  // 隣接リスト作成
  const adj = Array.from({ length: N }, () => []);
  edges.forEach((edge, index) => {
    adj[edge[0]].push({ to: edge[1], edgeIdx: index });
    adj[edge[1]].push({ to: edge[0], edgeIdx: index });
  });

  // 奇数ノード（始点候補）の特定
  const degrees = new Array(N).fill(0);
  edges.forEach(e => { degrees[e[0]]++; degrees[e[1]]++; });
  const oddNodes = [];
  for (let i = 0; i < N; i++) {
    if (degrees[i] % 2 !== 0) oddNodes.push(i);
  }

  // 奇数ノード数が 0 または 2 以外なら即座に不可
  if (oddNodes.length !== 0 && oddNodes.length !== 2) return false;

  // 始点リスト（奇数ノードがあればそれが始点、なければ全ノードが候補）
  const startNodes = oddNodes.length === 2 ? oddNodes : Array.from({ length: N }, (_, i) => i);

  let steps = 0;
  const MAX_STEPS = 20000; // 安全上限

  for (let startNode of startNodes) {
    const visitedEdges = new Array(numEdges).fill(false);
    let found = false;

    function dfs(currNode, count) {
      if (found) return;
      steps++;
      if (steps > MAX_STEPS) return;

      if (count === numEdges) {
        found = true;
        return;
      }

      for (let neighbor of adj[currNode]) {
        if (!visitedEdges[neighbor.edgeIdx]) {
          visitedEdges[neighbor.edgeIdx] = true;
          dfs(neighbor.to, count + 1);
          visitedEdges[neighbor.edgeIdx] = false;
          if (found) return;
        }
      }
    }

    dfs(startNode, 0);
    if (found) return true;
  }

  return false;
}

// ---------------------------------------------------------
// 2. 難易度パラメータカーブ
// ---------------------------------------------------------
function difficultyCurve(score) {
  let minScore, maxScore;
  let nodeRange, branchRange, loopRange, crossRange, innerRange, allowTrail;

  if (score <= 10) { // easy (1~10)
    minScore = 1; maxScore = 10;
    nodeRange = [3, 4];       // 3〜4（最初はごくシンプルに）
    branchRange = [0, 0];
    loopRange = [1, 1];
    crossRange = [0, 0];
    innerRange = [0, 0];
    allowTrail = false;
  } else if (score <= 30) { // easy+ (11~30)
    minScore = 11; maxScore = 30;
    nodeRange = [5, 6];       // 5〜6
    branchRange = [0, 1];
    loopRange = [1, 2];
    crossRange = [0, 1];
    innerRange = [0, 1];
    allowTrail = false;
  } else if (score <= 70) { // normal (31~70)
    minScore = 31; maxScore = 70;
    nodeRange = [6, 8];       // 6〜8
    branchRange = [1, 2];
    loopRange = [2, 2];
    crossRange = [1, 2];
    innerRange = [1, 2];
    allowTrail = false;
  } else if (score <= 130) { // normal+ (71~130)
    minScore = 71; maxScore = 130;
    nodeRange = [8, 10];      // 8〜10
    branchRange = [2, 3];
    loopRange = [2, 3];
    crossRange = [2, 4];
    innerRange = [2, 3];
    allowTrail = false;
  } else { // hard (131~200)
    minScore = 131; maxScore = 200;
    nodeRange = [10, 12];     // 外周ノード数（最大12）
    branchRange = [3, 4];
    loopRange = [2, 3];
    crossRange = [2, 4];      // 交差線を最大4本に制限（幾何衝突を大幅低減）
    innerRange = [2, 3];      // 内側ノードを最大3個に制限
    allowTrail = score >= 150;
  }

  // 区間内での進行度 (0.0 ～ 1.0) を正しく算出
  const progress = (score - minScore) / Math.max(1, (maxScore - minScore));

  // 進行度に応じた補間
  const pickVal = (range) => {
    if (range[0] === range[1]) return range[0];
    const target = range[0] + progress * (range[1] - range[0]);
    return Math.random() < 0.5 ? Math.floor(target) : Math.ceil(target);
  };

  return {
    nodeCount: pickVal(nodeRange),
    wantBranches: pickVal(branchRange),
    wantLoops: pickVal(loopRange),
    wantCross: pickVal(crossRange),
    wantInnerEdges: pickVal(innerRange),
    allowTrail
  };
}

// ---------------------------------------------------------
// 3. エッジパターン生成器（分断バグ防止ガード追加）
// ---------------------------------------------------------
function EdgePatternGenerator(score, params) {
  const OUT = params.nodeCount;
  const IN = params.wantInnerEdges;
  const N = OUT + IN;

  let edges = [];
  const edgeSet = new Set();

  const addEdge = (a, b) => {
    if (a < 0 || b < 0 || a >= N || b >= N || a === b) return false;
    const u = Math.min(a, b);
    const v = Math.max(a, b);
    const key = `${u}-${v}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    edges.push([u, v]);
    return true;
  };

  const removeEdge = (a, b) => {
    const u = Math.min(a, b);
    const v = Math.max(a, b);
    const key = `${u}-${v}`;
    if (edgeSet.has(key)) {
      // 削除後の連結性テスト
      const nextEdges = edges.filter(e => !((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u)));
      if (!isConnectedGraph(N, nextEdges)) {
        return false; // 分断される場合は削除をキャンセル
      }
      edgeSet.delete(key);
      edges = nextEdges;
      return true;
    }
    return false;
  };

  // 外周閉路
  const outerIndices = Array.from({ length: OUT }, (_, i) => i);
  for (let i = 0; i < OUT - 1; i++) addEdge(outerIndices[i], outerIndices[i + 1]);
  addEdge(outerIndices[OUT - 1], outerIndices[0]);

  // 内側ノードの接続
  if (IN > 0) {
    for (let i = 0; i < IN; i++) {
      const innerId = OUT + i;
      const targets = shuffleArray(outerIndices).slice(0, 2);
      addEdge(innerId, targets[0]);
      addEdge(innerId, targets[1]);
    }
  }

  // 閉路・交差エッジ
  const extraConnections = params.wantLoops + params.wantCross;
  let addedExtra = 0;
  let attempts = 0;
  while (addedExtra < extraConnections && attempts < 100) {
    attempts++;
    const u = randInt(0, N - 1);
    const maxOffset = Math.min(4, Math.floor(N / 2)); 
    const offset = randInt(2, Math.max(2, maxOffset));
    const v = (u + offset) % N;

    if (!(u === 0 && v === OUT - 1)) {
      if (addEdge(u, v)) addedExtra++;
    }
  }

  // 次数補正（オイラー条件の厳格化）
  // --- 安全なオイラー条件補正処理 ---
  const getOddNodes = () => {
    const deg = new Array(N).fill(0);
    edges.forEach(([u, v]) => { deg[u]++; deg[v]++; });
    const odds = [];
    for (let i = 0; i < N; i++) {
      if (deg[i] % 2 !== 0) odds.push(i);
    }
    return odds;
  };

  let oddNodes = getOddNodes();
  const targetOddCount = params.allowTrail ? 2 : 0;

  let loopGuard = 0;
  while (oddNodes.length > targetOddCount && loopGuard < 20) {
    loopGuard++;
    const u = oddNodes.pop();
    const v = oddNodes.pop();

    // 1. まず追加を試みる
    if (!addEdge(u, v)) {
      // 2. 追加できない場合、他のノードとの接続を探して奇数性を解消
      let fixed = false;
      for (let w = 0; w < N; w++) {
        if (w !== u && w !== v) {
          if (addEdge(u, w)) {
            fixed = true;
            break;
          }
        }
      }
      // 3. どうしても追加できなければ、安全に削除できる場合のみ削除
      if (!fixed) {
        removeEdge(u, v);
      }
    }
    oddNodes = getOddNodes(); // 最新の奇数ノードを再取得
  }

  return edges;
}

// ---------------------------------------------------------
// 4. ノード座標配置生成器（変数の二重宣言修正＆反発強化）
// ---------------------------------------------------------
function NodeLayoutGenerator(score, params, edges = []) {
  const OUT = params.nodeCount;
  const IN = params.wantInnerEdges;
  const N = OUT + IN;

  let nodes = [];
  let isValid = false;
  let attempts = 0;

  const archetypes = ['circle', 'flower', 'grid', 'random'];

  const MIN_DIST = N <= 5 ? 0.20 : (N <= 8 ? 0.16 : 0.12);
  const PADDING_X_MIN = 0.08, PADDING_X_MAX = 0.92;
  const PADDING_Y_MIN = 0.04, PADDING_Y_MAX = 0.96;

  while (!isValid && attempts < 100) {
    attempts++;
    nodes = [];

    let archetype = archetypes[score % archetypes.length];
    if (score > 80) {
      archetype = (score % 2 === 0) ? 'circle' : 'flower';
    }

    if (archetype === 'circle') {
      const baseRadius = randRange(0.35, 0.40);
      const angleOffset = randRange(0, Math.PI * 2);
      for (let i = 0; i < OUT; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / OUT;
        nodes.push({
          x: 0.5 + baseRadius * Math.cos(angle),
          y: 0.5 + baseRadius * Math.sin(angle)
        });
      }
      for (let i = 0; i < IN; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / (IN || 1) + Math.PI / 4;
        const r = IN === 1 ? 0.08 : randRange(0.14, 0.22);
        nodes.push({
          x: 0.5 + r * Math.cos(angle),
          y: 0.5 + r * Math.sin(angle)
        });
      }
    } else if (archetype === 'flower') {
      const angleOffset = randRange(0, Math.PI * 2);
      for (let i = 0; i < N; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / N;
        const r = i % 2 === 0 ? 0.38 : 0.18;
        nodes.push({
          x: 0.5 + r * Math.cos(angle),
          y: 0.5 + r * Math.sin(angle)
        });
      }
    } else if (archetype === 'grid') {
      const cols = Math.ceil(Math.sqrt(N));
      const rows = Math.ceil(N / cols);
      const spacing = Math.min(0.25, 0.75 / Math.max(cols, rows));
      const startX = 0.5 - ((cols - 1) * spacing) / 2;
      const startY = 0.5 - ((rows - 1) * spacing) / 2;

      const jitter = 0.03 + (attempts * 0.002);

      for (let i = 0; i < N; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        
        const offsetX = (r % 2 === 0 ? 0.025 : -0.025) + randRange(-jitter, jitter);
        const offsetY = (c % 2 === 0 ? 0.025 : -0.025) + randRange(-jitter, jitter);

        nodes.push({
          x: startX + c * spacing + offsetX,
          y: startY + r * spacing + offsetY
        });
      }
    } else {
      for (let i = 0; i < N; i++) {
        nodes.push({
          x: randRange(PADDING_X_MIN + 0.02, PADDING_X_MAX - 0.02),
          y: randRange(PADDING_Y_MIN + 0.02, PADDING_Y_MAX - 0.02)
        });
      }
    }

    // ノード数の安全ガード付き反発シミュレーション（点-点 ＆ 点-線）
    if (nodes.length === N && edges && edges.length > 0) {
      for (let iter = 0; iter < 25; iter++) {
        // 1. ノード同士（点と点）の反発
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            if (!nodes[i] || !nodes[j]) continue;
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.hypot(dx, dy) || 0.001;

            if (dist < MIN_DIST) {
              const overlap = (MIN_DIST - dist) / 2;
              const nx = (dx / dist) * overlap;
              const ny = (dy / dist) * overlap;

              nodes[i].x -= nx;
              nodes[i].y -= ny;
              nodes[j].x += nx;
              nodes[j].y += ny;
            }
          }
        }

        // ★追加: 2. ノードとエッジ（点と線）の反発ベクトル計算
        const reqDist = N <= 5 ? 0.07 : (N <= 8 ? 0.05 : 0.035);
        for (let edge of edges) {
          const u = edge[0];
          const v = edge[1];
          if (!nodes[u] || !nodes[v]) continue;

          for (let i = 0; i < N; i++) {
            if (i === u || i === v || !nodes[i]) continue;

            const p = nodes[i];
            const a = nodes[u];
            const b = nodes[v];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;

            let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));

            const projX = a.x + t * dx;
            const projY = a.y + t * dy;
            const dist = Math.hypot(p.x - projX, p.y - projY) || 0.001;

            // 線分に近すぎる場合、線と垂直な方向へノードを押し出す
            if (dist < reqDist) {
              const push = (reqDist - dist) * 0.5;
              const nx = (p.x - projX) / dist;
              const ny = (p.y - projY) / dist;

              nodes[i].x += nx * push;
              nodes[i].y += ny * push;
            }
          }
        }
      }
    }

    let minObservedDist = Infinity;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (!nodes[i] || !nodes[j]) continue;
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < minObservedDist) minObservedDist = d;
      }
    }

    if (minObservedDist >= MIN_DIST * 0.8 || N <= 3) {
      isValid = true;
    }
  }

  return nodes.map(n => ({
    x: Number(Math.min(PADDING_X_MAX, Math.max(PADDING_X_MIN, n.x)).toFixed(4)),
    y: Number(Math.min(PADDING_Y_MAX, Math.max(PADDING_Y_MIN, n.y)).toFixed(4))
  }));
}

// ---------------------------------------------------------
// 点と線分（エッジ）の最短距離を計算する関数
// ---------------------------------------------------------
function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

// ---------------------------------------------------------
// 5. 自動検証（単一レベルチェック）関数
// ---------------------------------------------------------
function validateSingleLevel(scheme, attemptCount = 0) {
  const nodes = scheme.nodes || [];
  const edgesList = scheme.edgesList || scheme.edges || []; 
  // ★ 修正: params から allowTrail を取得（または直接指定に対応）
  const allowTrail = scheme.params ? scheme.params.allowTrail : (scheme.allowTrail ?? true);
  const N = nodes.length;

  if (N === 0) {
    return { valid: false, reason: "ノードデータが存在しません" };
  }

  if (!Array.isArray(edgesList) || edgesList.length === 0) {
    return { valid: false, reason: "エッジデータが存在しません" };
  }

  // 1. 画面端範囲チェック
  for (let n of nodes) {
    if (n.x < 0.04 || n.x > 0.96 || n.y < 0.04 || n.y > 0.96) {
      return { valid: false, reason: `画面外または境界オーバー` };
    }
  }

  let relaxFactor = 0;
  if (attemptCount > 35) {
    relaxFactor = 0.018;
  } else if (attemptCount > 20) {
    relaxFactor = 0.012;
  } else if (attemptCount > 10) {
    relaxFactor = 0.006;
  }

  // 2. ノード間（点と点）の近接チェック
  const baseMinDist = N <= 5 ? 0.15 : (N <= 8 ? 0.12 : 0.09);
  const minDist = Math.max(0.06, baseMinDist - relaxFactor);

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (d < minDist) {
        return { valid: false, reason: `ノード間近接 (${d.toFixed(3)} < ${minDist.toFixed(3)})` };
      }
    }
  }

  // 3. ノードとエッジ（点と線）の近接チェック
  const baseMinNodeToEdge = N <= 5 ? 0.07 : (N <= 8 ? 0.05 : 0.035);
  const minNodeToEdgeDist = Math.max(0.018, baseMinNodeToEdge - relaxFactor);

  for (let edge of edgesList) {
    const u = edge[0];
    const v = edge[1];
    const nodeA = nodes[u];
    const nodeB = nodes[v];

    if (!nodeA || !nodeB) continue;

    for (let i = 0; i < N; i++) {
      if (i === u || i === v) continue;

      const dist = pointToSegmentDistance(nodes[i], nodeA, nodeB);
      if (dist < minNodeToEdgeDist) {
        return { 
          valid: false, 
          reason: `ノード ${i} が エッジ [${u}, ${v}] に近すぎます (距離: ${dist.toFixed(3)} < 閾値: ${minNodeToEdgeDist.toFixed(3)})` 
        };
      }
    }
  }

  // 4. 次数とオイラー性の判定（一筆書き条件）
  const degrees = new Array(N).fill(0);
  for (let edge of edgesList) {
    const u = edge[0];
    const v = edge[1];
    if (u >= N || v >= N) return { valid: false, reason: `存在しないノード番号を参照` };
    degrees[u]++;
    degrees[v]++;
  }

  const oddNodes = degrees.filter(deg => deg % 2 !== 0).length;
  if (degrees.some(d => d === 0)) return { valid: false, reason: `孤立ノード存在` };

  // 奇数ノード数の条件確認
  if (allowTrail ? (oddNodes !== 2 && oddNodes !== 0) : (oddNodes !== 0)) {
    return { valid: false, reason: `一筆書き解法不可 (奇数ノード数: ${oddNodes})` };
  }

  // 5. グラフ連結性チェック (安全な共通関数を使用)
  if (!isConnectedGraph(N, edgesList)) {
    return { valid: false, reason: `グラフ分断` };
  }

  // ★追加: 6. 最終実走判定（クリアパターンの存在を絶対に保証する）
  if (!hasAtLeastOneEulerPath(N, edgesList)) {
    return { valid: false, reason: `クリアパターンが存在しません (一筆書き不可)` };
  }

  return { valid: true };
}

// ---------------------------------------------------------
// 6. LevelSchemeAssembler
// ---------------------------------------------------------
function LevelSchemeAssembler(score, edges, nodes, params) {
  return {
    id: score,
    nodeCount: params.nodeCount,
    totalNodes: nodes.length,
    edges: edges.length,
    layoutId: "L" + score,
    patternId: "P" + score,

    wantBranches: params.wantBranches,
    wantLoops: params.wantLoops,
    wantCross: params.wantCross,
    wantInnerEdges: params.wantInnerEdges,
    allowTrail: params.allowTrail,

    eulerType: params.allowTrail ? "trail" : "circuit",

    degree: edges.reduce((deg, [a, b]) => {
      deg[a] = (deg[a] || 0) + 1;
      deg[b] = (deg[b] || 0) + 1;
      return deg;
    }, {}),

    nodes,
    edgesList: edges
  };
}

// ---------------------------------------------------------
// 7. MasterGenerator（自動リトライ機能付き）
// ---------------------------------------------------------
function MasterGenerator(start, end) {
  resetAllGeneratedData();
  let totalRetries = 0;

  for (let score = start; score <= end; score++) {
    let isValid = false;
    let scheme = null;
    let edges = null;
    let nodes = null;
    let attempts = 0;

    while (!isValid && attempts < 200) {
      attempts++;
      let params = difficultyCurve(score);

      if (attempts > 10) {
        params = { ...params };
        if (params.wantCross > 1) params.wantCross -= 1;
        if (attempts > 30 && params.wantInnerEdges > 1) params.wantInnerEdges -= 1;
      }

      // 1. エッジを先に生成
      edges = EdgePatternGenerator(score, params);
      
      // 2. 第3引数に edges を渡してノード位置を計算
      nodes = NodeLayoutGenerator(score, params, edges);
      
      scheme = LevelSchemeAssembler(score, edges, nodes, params);

      const check = validateSingleLevel(scheme, attempts);
      if (check.valid) {
        isValid = true;
      } else {
        totalRetries++;
      }
    }

    if (!isValid) {
      console.warn(`Level ${score}: 200回リトライ後も完全な生成ができませんでした。警告を出力します。`);
    }

    edgePatterns["P" + score] = edges;
    nodeLayouts["L" + score] = nodes;
    levelSchemes.push(scheme);
  }

  console.log(`生成完了: Level ${start} 〜 ${end} （総自動リトライ修復回数: ${totalRetries} 回）`);
}