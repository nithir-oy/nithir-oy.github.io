// generator.js

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

// ★ JSONベースのレベル生成
window.generateLevel = function (id) {
    if (!LEVEL_SCHEMES) {
        console.error("LEVEL_SCHEMES がロードされていません。");
        return null;
    }

    const scheme = LEVEL_SCHEMES[id - 1];
    if (!scheme) {
        console.error(`id: ${id} に対応する scheme が見つかりません。`);
        return null;
    }

    const rawLayout  = NODE_LAYOUTS[scheme.layout];
    const rawPattern = EDGE_PATTERNS[scheme.pattern];

    if (!rawLayout || !rawPattern) {
        console.error("layoutまたはpatternが存在しません:", { rawLayout, rawPattern });
        return null;
    }

    // ノード属性のコピー（isForbidden, warpId なども残す）
    const nodes = rawLayout.map((pt) => ({ ...pt }));

    // ワープノード（warpId）同士のペア検出＆転送先インデックス（warpTarget）の事前バインド
    const warpGroups = {};
    nodes.forEach((n, idx) => {
        if (n.warpId) {
            if (!warpGroups[n.warpId]) warpGroups[n.warpId] = [];
            warpGroups[n.warpId].push(idx);
        }
    });

    Object.keys(warpGroups).forEach(warpId => {
        const group = warpGroups[warpId];
        if (group.length === 2) {
            nodes[group[0]].warpTarget = group[1];
            nodes[group[1]].warpTarget = group[0];
        }
    });

    const edges = rawPattern;

    return { id, nodes, edges };
};