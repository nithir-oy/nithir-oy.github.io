// generator.js（テストコード完全削除版）

// グローバル変数
var NODE_LAYOUTS = null;
var EDGE_PATTERNS = null;
var LEVEL_SCHEMES = null;

// ★ JSON読み込み
window.loadTemplates = async function () {
    NODE_LAYOUTS = await (await fetch("data/node-layouts.json")).json();
    EDGE_PATTERNS = await (await fetch("data/edge-patterns.json")).json();
    LEVEL_SCHEMES = await (await fetch("data/level-schemes.json")).json();
};

// ★ JSONベースのレベル生成（これだけ使う）
window.generateLevel = function (id) {
    const scheme = LEVEL_SCHEMES[id - 1];
    if (!scheme) return null;

    const rawLayout  = NODE_LAYOUTS[scheme.layout];   // L1 → [{x,y},...]
    const rawPattern = EDGE_PATTERNS[scheme.pattern]; // P1 → [[from,to],...]

    if (!rawLayout || !rawPattern) return null;

    const nodes = rawLayout.map((pt, index) => ({
        x: pt.x,
        y: pt.y
        }));


    const edges = rawPattern;

    return { id, nodes, edges };
};


// ★ テスト生成コードはすべて削除済み
// generateTestLevel
// getNodeCount
// generateNodes
// generateEdges
// → 完全に不要なので削除
