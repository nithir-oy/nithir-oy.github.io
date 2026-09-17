// checker.js 

function checkPattern(nodes, edges) {
    if (!nodes || nodes.length === 0) return { ok: false, reason: "no nodes" };
    if (!edges || edges.length === 0) return { ok: false, reason: "no edges" };

    const N = nodes.length;

    // 通行禁止ノードの特定
    const forbiddenSet = new Set();
    nodes.forEach((n, idx) => {
        if (n && n.isForbidden) forbiddenSet.add(idx);
    });

    // 通行禁止ノードに接続するエッジのチェック
    for (const e of edges) {
        if (forbiddenSet.has(e[0]) || forbiddenSet.has(e[1])) {
            return { ok: false, reason: `Forbidden node is connected to edge: [${e[0]}, ${e[1]}]` };
        }
    }

    // DFSによる実走判定（一筆書き経路の存在チェック）
    const trails = findAllEulerPaths(nodes, edges, 1);
    if (!trails || trails.length === 0) {
        return { ok: false, reason: "一筆書き解法が存在しません（ギミック条件違反など）" };
    }

    return {
        ok: true,
        type: "valid_path",
        trailNodes: trails[0]
    };
}

function findAllEulerPaths(nodes, edges, maxPaths = 10) {
    if (!nodes || !edges) return [];
    const N = nodes.length;
    const paths = [];

    const forbidden = new Set();
    nodes.forEach((n, i) => { if (n && n.isForbidden) forbidden.add(i); });

    // ワープペアの作成
    const warpMap = new Map();
    nodes.forEach((n, idx) => {
        if (n && n.warpId !== undefined && n.warpId !== null) {
            if (!warpMap.has(n.warpId)) warpMap.set(n.warpId, []);
            warpMap.get(n.warpId).push(idx);
        }
    });

    // エッジの分解と構造化
    const expandedEdges = edges.map((e, idx) => {
        const opt = e[2] || {};
        return {
            id: idx,
            u: e[0],
            v: e[1],
            dir: opt.dir || 0,     // 0: 双方向, 1: u -> v
            maxCount: opt.count || 1
        };
    });

    const totalRequiredEdges = expandedEdges.reduce((sum, e) => sum + e.maxCount, 0);

    let totalSteps = 0;
    const MAX_STEPS = 50000;

    for (let startNode = 0; startNode < N; startNode++) {
        if (forbidden.has(startNode)) continue;
        if (paths.length >= maxPaths) break;

        const edgeUsage = new Array(expandedEdges.length).fill(0);

        function dfs(currNode, currentPath, usedEdgeTotal) {
            totalSteps++;
            if (totalSteps > MAX_STEPS || paths.length >= maxPaths) return;

            // 全てのエッジを通過完了
            if (usedEdgeTotal === totalRequiredEdges) {
                paths.push([...currentPath]);
                return;
            }

            // エッジ移動
            for (let i = 0; i < expandedEdges.length; i++) {
                const e = expandedEdges[i];
                if (edgeUsage[i] < e.maxCount) {
                    let nextNode = -1;

                    if (e.dir === 1) {
                        if (currNode === e.u) nextNode = e.v;
                    } else {
                        if (currNode === e.u) nextNode = e.v;
                        else if (currNode === e.v) nextNode = e.u;
                    }

                    if (nextNode !== -1 && !forbidden.has(nextNode)) {
                        edgeUsage[i]++;
                        currentPath.push(nextNode);

                        dfs(nextNode, currentPath, usedEdgeTotal + 1);

                        currentPath.pop();
                        edgeUsage[i]--;
                    }
                }
            }

            // ワープ移動（エッジ不消費）
            const currNodeObj = nodes[currNode];
            if (currNodeObj && currNodeObj.warpId !== undefined) {
                const partners = warpMap.get(currNodeObj.warpId) || [];
                for (let partner of partners) {
                    if (partner !== currNode && !forbidden.has(partner)) {
                        const lastNode = currentPath.length >= 2 ? currentPath[currentPath.length - 2] : -1;
                        if (lastNode !== partner) {
                            currentPath.push(partner);
                            dfs(partner, currentPath, usedEdgeTotal);
                            currentPath.pop();
                        }
                    }
                }
            }
        }

        dfs(startNode, [startNode], 0);
    }

    return paths;
}