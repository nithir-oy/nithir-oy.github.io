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

// 1. 難易度曲線の定義（1〜50レベル用にギミック解放条件を調整）
function difficultyCurve(score) {
    let nodeCount, innerCount, extraEdges;

    if (score <= 2) {
        nodeCount = 3;         // Lv 1~2: 三角形
    } else if (score <= 5) {
        nodeCount = 4;         // Lv 3~5: 四角形
    } else if (score <= 10) {
        nodeCount = 5;         // Lv 6~10: 五角形
    } else if (score <= 20) {
        nodeCount = 6;         // Lv 11~20: 六角形
    } else if (score <= 35) {
        nodeCount = 7;         // Lv 21~35: 7ノード
    } else {
        nodeCount = 8;         // Lv 36~50: 8ノード
    }

    if (nodeCount >= 5 && score >= 10) {
        innerCount = score >= 35 ? randInt(1, 2) : 1;
    } else {
        innerCount = 0;
    }

    extraEdges = Math.min(4, Math.floor(score / 10));

    // ★ ギミックの解放レベルを 1〜50 に合わせて調整
    const allowOneWay    = score >= 6;   // Level 6〜
    const allowDouble    = score >= 12;  // Level 12〜
    const allowForbidden = score >= 18;  // Level 18〜
    const allowWarp      = score >= 25;  // Level 25〜

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

// 2. EdgePatternGenerator
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

    // 外周閉路
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

    // ★ エッジギミック付与（付与確率を上げて確実に発生させる）
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

    return edges;
}

// 3. NodeLayoutGenerator
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
        const r = randRange(0.30, 0.40);

        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    // 内部ノード配置
    for (let i = 0; i < IN; i++) {
        const angle = angleOffset + (Math.PI * 2 * i) / (IN || 1) + Math.PI / IN;
        const r = randRange(0.12, 0.18);
        nodes.push({
            x: Number((0.5 + r * Math.cos(angle)).toFixed(4)),
            y: Number((0.5 + r * Math.sin(angle)).toFixed(4))
        });
    }

    // ★ ノードギミック付与（出現条件を緩めて付与率アップ）
    if (params.allowForbidden && Math.random() < 0.5) {
        const forbiddenIdx = randInt(0, N - 1);
        nodes[forbiddenIdx].isForbidden = true;
    }

    if (params.allowWarp && Math.random() < 0.5) {
        const candidates = nodes.map((_, i) => i).filter(i => !nodes[i].isForbidden);
        const shuffled = shuffleArray(candidates);
        if (shuffled.length >= 2) {
            nodes[shuffled[0]].warpId = "w1";
            nodes[shuffled[1]].warpId = "w1";
        }
    }

    return nodes;
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

            const check = validateSingleLevel(nodes, edges);
            if (check.valid) {
                isValid = true;
            } else {
                totalRetries++;
            }
        }

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