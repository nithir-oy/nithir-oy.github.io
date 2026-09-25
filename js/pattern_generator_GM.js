// pattern_generator_GM.js

const edgePatterns = {};
const nodeLayouts = {};
const levelSchemes = [];

// チュートリアル用 固定ステージデータ定義
// チュートリアル用 固定ステージデータ定義（修正版：相対座標 0.0〜1.0 指定）
const TUTORIAL_LEVELS = {
    // Level 5: 一方通行 (Directed)
    5: {
        nodes: [
            { x: 0.5, y: 0.2 },
            { x: 0.2, y: 0.7 },
            { x: 0.8, y: 0.7 }
        ],
        edges: [
            [0, 1],
            [1, 2],
            [2, 0, { dir: 1 }]
        ]
    },

    // Level 12: ダブルエッジ (Double)
    12: {
        nodes: [
            { x: 0.2, y: 0.5 },
            { x: 0.5, y: 0.2 },
            { x: 0.8, y: 0.5 }
        ],
        edges: [
            [0, 1],
            [1, 2, { count: 2 }],
            [2, 0]
        ]
    },

    // Level 18: 通行禁止 (Forbidden)
    18: {
        nodes: [
            { x: 0.2, y: 0.2 }, // 0: 左上
            { x: 0.8, y: 0.2 }, // 1: 右上
            { x: 0.8, y: 0.8 }, // 2: 右下
            { x: 0.2, y: 0.8, isForbidden: true } // 3: 左下(×印)
        ],
        edges: [
            [0, 1],
            [1, 2],
            [2, 0], // ★ 実線（斜め：ノード2からノード0へ戻る線）
            [2, 3], // ★ ×印ノード(3)に繋がるエッジを追加（これで点線になります）
            [3, 0]  // ★ [3, 0] を追加して左側の縦の点線を描画
        ]
    },

    // Level 25: ワープ (Warp)
    25: {
        nodes: [
            { x: 0.2, y: 0.3 },
            { x: 0.5, y: 0.3, warpId: 1, warpTarget: 2 },
            { x: 0.5, y: 0.7, warpId: 1, warpTarget: 1 },
            { x: 0.8, y: 0.7 }
        ],
        edges: [
            [0, 1],
            [2, 3]
        ]
    }
};

function resetAllGeneratedData() {
    Object.keys(edgePatterns).forEach(k => delete edgePatterns[k]);
    Object.keys(nodeLayouts).forEach(k => delete nodeLayouts[k]);
    levelSchemes.length = 0;
}

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

// 1. 難易度曲線の定義
function difficultyCurve(score) {
    let nodeCount, innerCount, extraEdges;

    if (score <= 2) {
        nodeCount = 3;
    } else if (score <= 5) {
        nodeCount = 4;
    } else if (score <= 10) {
        nodeCount = 5;
    } else if (score <= 20) {
        nodeCount = 6;
    } else if (score <= 35) {
        nodeCount = 7;
    } else {
        nodeCount = 8;
    }

    if (nodeCount >= 5 && score >= 10) {
        innerCount = score >= 35 ? randInt(1, 2) : 1;
    } else {
        innerCount = 0;
    }

    extraEdges = Math.min(4, Math.floor(score / 10));

    const allowOneWay    = score >= 6;   
    const allowDouble    = score >= 12;  
    const allowForbidden = score >= 18;  
    const allowWarp      = score >= 25;  
    const forceWarp      = score >= 35;  // Lv35以上はワープ確定発生

    return {
        nodeCount,
        innerCount,
        extraEdges,
        allowOneWay,
        allowDouble,
        allowWarp,
        forceWarp,
        allowForbidden
    };
}

// 2. EdgePatternGenerator
function EdgePatternGenerator(score, params, warpPairs = []) {
    const N = params.nodeCount;
    const IN = Math.min(params.innerCount, Math.max(0, N - 3));
    const OUT = N - IN;

    let edges = [];
    const edgeSet = new Set();

    const forbiddenWarpEdges = new Set();
    warpPairs.forEach(([u, v]) => {
        const a = Math.min(u, v);
        const b = Math.max(u, v);
        forbiddenWarpEdges.add(`${a}-${b}`);
    });

    const addEdge = (a, b, opt = {}) => {
        if (a < 0 || b < 0 || a >= N || b >= N || a === b) return false;
        const u = Math.min(a, b);
        const v = Math.max(a, b);
        const key = `${u}-${v}`;
        
        if (forbiddenWarpEdges.has(key) || edgeSet.has(key)) return false;
        edgeSet.add(key);

        const edgeData = [u, v];
        if (Object.keys(opt).length > 0) edgeData.push(opt);
        edges.push(edgeData);
        return true;
    };

    // 外周接続
    for (let i = 0; i < OUT - 1; i++) addEdge(i, i + 1);
    addEdge(OUT - 1, 0);

    // 内部ノード接続
    if (IN > 0) {
        for (let i = 0; i < IN; i++) {
            const innerId = OUT + i;
            let connected = 0;
            const candidates = shuffleArray(Array.from({ length: OUT }, (_, k) => k));
            
            for (let target of candidates) {
                if (addEdge(innerId, target)) {
                    connected++;
                    if (connected >= 2) break;
                }
            }
        }
    }

    // 追加エッジ
    let extraAdded = 0;
    let attempts = 0;
    while (extraAdded < params.extraEdges && attempts < 20) {
        attempts++;
        const u = randInt(0, N - 1);
        const v = randInt(0, N - 1);
        const w = randInt(0, N - 1);

        if (u !== v && v !== w && u !== w) {
            const a1 = addEdge(u, v);
            const a2 = addEdge(v, w);
            const a3 = addEdge(w, u);
            if (a1 || a2 || a3) extraAdded++;
        }
    }

    applyEdgeGimmicks(edges, params);

    return edges;
}

function applyEdgeGimmicks(edges, params) {
    if (params.allowDouble || params.allowOneWay) {
        edges.forEach((e) => {
            const opt = e[2] || {};
            if (params.allowDouble && Math.random() < 0.35) {
                opt.count = 2;
            } else if (params.allowOneWay && Math.random() < 0.30) {
                opt.dir = 1;
            }
            if (Object.keys(opt).length > 0) e[2] = opt;
        });
    }
}

// 3. NodeLayoutGenerator
function NodeLayoutGenerator(score, params, warpPairs = [], edges = []) {
    const N = params.nodeCount;
    let IN = params.innerCount;

    if (N - IN < 3) {
        IN = Math.max(0, N - 3);
    }
    const OUT = N - IN;

    let nodes = [];
    const angleOffset = randRange(0, Math.PI * 2);

    for (let i = 0; i < OUT; i++) {
        const baseAngle = angleOffset + (Math.PI * 2 * i) / OUT;
        const angleJitter = randRange(-0.12, 0.12) * (Math.PI * 2 / OUT);
        const angle = baseAngle + angleJitter;
        const r = randRange(0.30, 0.40);

        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    for (let i = 0; i < IN; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / (IN || 1) + Math.PI / IN;
        const r = randRange(0.12, 0.18);
        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    // ★ edges を第4引数として渡す
    applyNodeGimmicks(nodes, params, warpPairs, edges);

    return nodes;
}

function applyNodeGimmicks(nodes, params, warpPairs = [], edges = []) {
    const N = nodes.length;

    // ★ 確率を 0.7 (70%) に引き上げて出現頻度を向上
    if (params.allowForbidden && Math.random() < 0.7) {
        const warpNodeIndices = new Set(warpPairs.flat());
        const candidates = [];
        for (let i = 0; i < N; i++) {
            if (!warpNodeIndices.has(i)) candidates.push(i);
        }
        if (candidates.length > 0) {
            const forbiddenIdx = candidates[randInt(0, candidates.length - 1)];
            nodes[forbiddenIdx].isForbidden = true;

            // ★ 通行禁止ノードに繋がるエッジがなければ、近くのノードと接続エッジ（点線用）を自動生成する
            if (edges && edges.length > 0) {
                const hasEdge = edges.some(e => e[0] === forbiddenIdx || e[1] === forbiddenIdx);
                if (!hasEdge) {
                    const targetIdx = (forbiddenIdx + 1) % N;
                    const u = Math.min(forbiddenIdx, targetIdx);
                    const v = Math.max(forbiddenIdx, targetIdx);
                    edges.push([u, v]);
                }
            }
        }
    }

    warpPairs.forEach(([u, v]) => {
        if (nodes[u] && nodes[v]) {
            nodes[u].warpId = "w1";
            nodes[v].warpId = "w1";
        }
    });
}

// 接続禁止ノード（isForbidden）のエッジを除去するクリーンアップ関数
// function cleanForbiddenEdges(nodes, edges) {
//     const forbiddenSet = new Set();
//     nodes.forEach((n, idx) => {
//         if (n && n.isForbidden) forbiddenSet.add(idx);
//     });

//     if (forbiddenSet.size === 0) return edges;

//     return edges.filter(e => !forbiddenSet.has(e[0]) && !forbiddenSet.has(e[1]));
// }

function generateWarpPairs(params) {
    const N = params.nodeCount;
    const warpPairs = [];
    const shouldGenerate = params.forceWarp || (params.allowWarp && Math.random() < 0.5);

    if (shouldGenerate && N >= 3) { // ワープは最低3ノード以上で有効
        const candidates = shuffleArray(Array.from({ length: N }, (_, i) => i));
        warpPairs.push([candidates[0], candidates[1]]);
    }
    return warpPairs;
}

// 4. 検証関数
function validateSingleLevel(nodes, edges) {
    if (!nodes || nodes.length === 0) return { valid: false, reason: "ノードなし" };
    if (!edges || edges.length === 0) return { valid: false, reason: "エッジなし" };

    for (let n of nodes) {
        if (n.x < 0.05 || n.x > 0.95 || n.y < 0.05 || n.y > 0.95) {
            return { valid: false, reason: "画面外ノード" };
        }
    }

    const minDist = 0.08;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < minDist) {
                return { valid: false, reason: "ノード距離が近すぎます" };
            }
        }
    }

    if (typeof checkPattern === "function") {
        const chk = checkPattern(nodes, edges);
        if (!chk.ok) {
            return { valid: false, reason: chk.reason };
        }
    }

    return { valid: true };
}

function LevelSchemeAssembler(score, edges, nodes, params) {
    return {
        id: score,
        layout: "L" + score,
        pattern: "P" + score
    };
}

// ★ フォールバック専用：確実に checkPattern.ok を満たす保証レイアウト生成
function generateGuaranteedFallback(score, params) {
    const N = params.nodeCount;
    let nodes = [];
    let edges = [];

    const offset = randRange(0, Math.PI * 2);
    for (let i = 0; i < N; i++) {
        const angle = offset + (Math.PI * 2 * i) / N;
        nodes.push({ 
            x: Number((0.5 + 0.35 * Math.cos(angle)).toFixed(4)), 
            y: Number((0.5 + 0.35 * Math.sin(angle)).toFixed(4)) 
        });
    }

    const warpPairs = generateWarpPairs(params);

    if (warpPairs.length > 0) {
        // ワープがある場合：ワープ(u, v)を跨いで外周を一巡する開パス（Open Path）を構築
        const [u, v] = warpPairs[0];
        
        // 0 -> 1 -> 2 ... -> N-1 のパスから、(u, v)間の直結を除外
        for (let i = 0; i < N - 1; i++) {
            edges.push([i, i + 1]);
        }
        
        nodes[u].warpId = "w1";
        nodes[v].warpId = "w1";
    } else {
        // ワープがない場合：標準の閉路
        for (let i = 0; i < N; i++) {
            edges.push([i, (i + 1) % N]);
        }
    }

    applyEdgeGimmicks(edges, params);

    // checker で最終確認（万が一失敗したらギミックを削った安全版へ）
    const chk = typeof checkPattern === "function" ? checkPattern(nodes, edges) : { ok: true };
    if (!chk.ok) {
        // ギミックなしの安全多角形に差し戻し
        edges = [];
        for (let i = 0; i < N; i++) edges.push([i, (i + 1) % N]);
        nodes.forEach(n => { delete n.warpId; delete n.isForbidden; });
    }

    return { nodes, edges };
}

// 5. 全体生成ループ (MasterGenerator)
function MasterGenerator(start, end) {
    resetAllGeneratedData();
    let totalRetries = 0;

    for (let score = start; score <= end; score++) {
        let edges = null;
        let nodes = null;
        const params = difficultyCurve(score);

        // ★★★ チュートリアルレベルの差し替え判定 ★★★
        if (TUTORIAL_LEVELS[score]) {
            console.log(`Lv${score}: 固定チュートリアルステージを生成します。`);
            nodes = TUTORIAL_LEVELS[score].nodes;
            edges = TUTORIAL_LEVELS[score].edges;
        } 
        else {
            // 通常のランダム生成処理
            let isValid = false;
            let attempts = 0;

            while (!isValid && attempts < 50) {
                attempts++;
                const warpPairs = generateWarpPairs(params);
                
                // MasterGenerator のループ内
                edges = EdgePatternGenerator(score, params, warpPairs);
                nodes = NodeLayoutGenerator(score, params, warpPairs, edges); // ★ edges を渡す

                // isForbiddenノードからエッジを削除して checker.js 違反を防ぐ
                // edges = cleanForbiddenEdges(nodes, edges);

                const check = validateSingleLevel(nodes, edges);
                if (check.valid) {
                    isValid = true;
                } else {
                    totalRetries++;
                }
            }

            // 50回試行失敗時の保証付きフォールバック処理
            if (!isValid) {
                console.warn(`Lv${score}: 条件を満たすランダム配置に失敗。保証フォールバックを実行します。`);
                const fallbackData = generateGuaranteedFallback(score, params);
                nodes = fallbackData.nodes;
                edges = fallbackData.edges;
            }
        }

        const scheme = LevelSchemeAssembler(score, edges, nodes, params);

        edgePatterns["P" + score] = edges;
        nodeLayouts["L" + score] = nodes;
        levelSchemes.push(scheme);
    }

    console.log(`生成完了: Level ${start} 〜 ${end} （試行リトライ: ${totalRetries} 回）`);
}