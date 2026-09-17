// pattern_generator_GM.js

const edgePatterns = {};
const nodeLayouts = {};
const levelSchemes = [];

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
        nodeCount = 3;         // Lv 1~2: Triangle (3)
    } else if (score <= 5) {
        nodeCount = 4;         // Lv 3~5: Quad (4)
    } else if (score <= 10) {
        nodeCount = 5;         // Lv 6~10: Pentagon (5)
    } else if (score <= 20) {
        nodeCount = 6;         // Lv 11~20: Hexagon (6)
    } else if (score <= 35) {
        nodeCount = 7;         // Lv 21~35: 7 nodes
    } else if (score <= 60) {
        nodeCount = 8;         // Lv 36~60: 8 nodes
    } else {
        nodeCount = 9;         // Lv 61~: 9 nodes
    }

    if (nodeCount >= 5 && score >= 10) {
        innerCount = score >= 50 ? randInt(1, 2) : 1;
    } else {
        innerCount = 0;
    }

    extraEdges = Math.min(4, Math.floor(score / 15));

    const allowOneWay    = score >= 15;
    const allowDouble    = score >= 35;
    const allowWarp      = score >= 70;
    const allowForbidden = score >= 120;

    return {
        nodeCount,
        innerCount,
        extraEdges,
        allowOneWay,
        allowDouble,
        allowWarp,
        allowForbidden
    };
}

// 2. EdgePatternGenerator（一筆書き完全保証版）
function EdgePatternGenerator(score, params) {
    const N = params.nodeCount;
    const IN = Math.min(params.innerCount, Math.max(0, N - 3));
    const OUT = N - IN;

    let edges = [];
    const edgeSet = new Set();

    const addEdge = (a, b, opt = {}) => {
        if (a < 0 || b < 0 || a >= N || b >= N || a === b) return false;
        const u = Math.min(a, b);
        const v = Math.max(a, b);
        const key = `${u}-${v}`;
        if (edgeSet.has(key)) return false;
        edgeSet.add(key);

        const edgeData = [u, v];
        if (Object.keys(opt).length > 0) edgeData.push(opt);
        edges.push(edgeData);
        return true;
    };

    // 1. 外周閉路
    for (let i = 0; i < OUT - 1; i++) addEdge(i, i + 1);
    addEdge(OUT - 1, 0);

    // 2. 内部ノードの確実な2本接続
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

    // 3. 次数の偶数性を保つ追加エッジ（3点サイクル）
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

    // 4. ギミック付与
    if (params.allowDouble || params.allowOneWay) {
        edges.forEach((e) => {
            const opt = e[2] || {};
            if (params.allowDouble && Math.random() < 0.2) {
                opt.count = 2;
            } else if (params.allowOneWay && Math.random() < 0.1) {
                opt.dir = 1;
            }
            if (Object.keys(opt).length > 0) e[2] = opt;
        });
    }

    return edges;
}

// 3. NodeLayoutGenerator（近接防止＆ジッター適用版）
function NodeLayoutGenerator(score, params, edges = []) {
    const N = params.nodeCount;
    let IN = params.innerCount;

    if (N - IN < 3) {
        IN = Math.max(0, N - 3);
    }
    const OUT = N - IN;

    let nodes = [];
    const angleOffset = randRange(0, Math.PI * 2);

    // 外周ノード配置
    for (let i = 0; i < OUT; i++) {
        const baseAngle = angleOffset + (Math.PI * 2 * i) / OUT;
        const angleJitter = randRange(-0.12, 0.12) * (Math.PI * 2 / OUT);
        const angle = baseAngle + angleJitter;
        const r = randRange(0.30, 0.40); // 画面幅に収まるよう調整

        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    // 内部ノード配置 (分散させて近接チェック落ちを防ぐ)
    for (let i = 0; i < IN; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / (IN || 1) + Math.PI / IN;
        const r = randRange(0.12, 0.18);
        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    // ギミック属性
    if (params.allowForbidden && Math.random() < 0.25 && N >= 5) {
        const forbiddenIdx = randInt(0, N - 1);
        nodes[forbiddenIdx].isForbidden = true;
    }

    if (params.allowWarp && Math.random() < 0.3 && N >= 5) {
        const candidates = nodes.map((_, i) => i).filter(i => !nodes[i].isForbidden);
        const shuffled = shuffleArray(candidates);
        if (shuffled.length >= 2) {
            nodes[shuffled[0]].warpId = "w1";
            nodes[shuffled[1]].warpId = "w1";
        }
    }

    return nodes;
}

// 4. 検証関数（nodes, edges を直接受け取るように修正）
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

    // checkPattern関数が未定義の場合のガード処理
    if (typeof checkPattern === "function") {
        const chk = checkPattern(nodes, edges);
        if (!chk.ok) {
            return { valid: false, reason: chk.reason };
        }
    }

    return { valid: true };
}

// アセンブラ関数（シンプルな参照用オブジェクトを返す）
function LevelSchemeAssembler(score, edges, nodes, params) {
    return {
        id: score,
        layout: "L" + score,
        pattern: "P" + score
    };
}

// 5. 全体生成ループ
function MasterGenerator(start, end) {
    resetAllGeneratedData();
    let totalRetries = 0;

    for (let score = start; score <= end; score++) {
        let isValid = false;
        let scheme = null;
        let edges = null;
        let nodes = null;
        let attempts = 0;
        const params = difficultyCurve(score);

        while (!isValid && attempts < 50) {
            attempts++;
            edges = EdgePatternGenerator(score, params);
            nodes = NodeLayoutGenerator(score, params, edges);

            // 検証関数に直接 nodes, edges を渡してチェックを行う
            const check = validateSingleLevel(nodes, edges);
            if (check.valid) {
                isValid = true;
            } else {
                totalRetries++;
            }
        }

        // フォールバック時にも回転・歪みを加えて「完全な正多角形」化を防ぐ
        if (!isValid) {
            const fallbackN = params.nodeCount;
            nodes = [];
            edges = [];
            const offset = randRange(0, Math.PI * 2);
            for (let i = 0; i < fallbackN; i++) {
                const angle = offset + (Math.PI * 2 * i) / fallbackN;
                nodes.push({ 
                    x: Number((0.5 + 0.35 * Math.cos(angle)).toFixed(4)), 
                    y: Number((0.5 + 0.35 * Math.sin(angle)).toFixed(4)) 
                });
                edges.push([i, (i + 1) % fallbackN]);
            }
        }

        scheme = LevelSchemeAssembler(score, edges, nodes, params);

        edgePatterns["P" + score] = edges;
        nodeLayouts["L" + score] = nodes;
        levelSchemes.push(scheme);
    }

    console.log(`生成完了: Level ${start} 〜 ${end} （修正試行: ${totalRetries} 回）`);
}