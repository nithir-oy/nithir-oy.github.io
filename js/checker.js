// checker.js 

function checkPattern(nodes, edges) {
    if (!nodes || nodes.length === 0) return { ok: false, reason: "no nodes" };
    if (!edges || edges.length === 0) return { ok: false, reason: "no edges" };

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

    // エッジの分解と構造化（通行禁止ノードに繋がるエッジかどうかの判定も追加）
    const expandedEdges = [];
    edges.forEach((e, idx) => {
        const u = e[0];
        const v = e[1];
        const isBlockedEdge = forbidden.has(u) || forbidden.has(v);

        const opt = e[2] || {};
        expandedEdges.push({
            id: idx,
            u: u,
            v: v,
            dir: opt.dir || 0,     // 0: 双方向, 1: u -> v
            maxCount: opt.count || 1,
            isBlockedEdge: isBlockedEdge // ★ 通行禁止エッジフラグ
        });
    });

    // ★ 必須エッジ数には「通行禁止ノードに繋がるエッジ」を含めない
    const totalRequiredEdges = expandedEdges.reduce((sum, e) => {
        return e.isBlockedEdge ? sum : sum + e.maxCount;
    }, 0);

    let totalSteps = 0;
    const MAX_STEPS = 50000;

    for (let startNode = 0; startNode < N; startNode++) {
        if (forbidden.has(startNode)) continue;
        if (paths.length >= maxPaths) break;

        const edgeUsage = new Array(expandedEdges.length).fill(0);

        function dfs(currNode, currentPath, usedEdgeTotal, lastWasWarp = false) {
            totalSteps++;
            if (totalSteps > MAX_STEPS || paths.length >= maxPaths) return;

            // 通行対象のエッジを全て通過完了
            if (usedEdgeTotal === totalRequiredEdges) {
                paths.push([...currentPath]);
                return;
            }

            // 1. エッジ移動
            for (let i = 0; i < expandedEdges.length; i++) {
                const e = expandedEdges[i];

                // ★ 通行禁止エッジは探索対象から外す
                if (e.isBlockedEdge) continue;

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

                        dfs(nextNode, currentPath, usedEdgeTotal + 1, false);

                        currentPath.pop();
                        edgeUsage[i]--;
                    }
                }
            }

            // 2. ワープ移動（エッジ不消費）
            if (!lastWasWarp) {
                const currNodeObj = nodes[currNode];
                if (currNodeObj && currNodeObj.warpId !== undefined) {
                    const partners = warpMap.get(currNodeObj.warpId) || [];
                    for (let partner of partners) {
                        if (partner !== currNode && !forbidden.has(partner)) {
                            currentPath.push(partner);
                            dfs(partner, currentPath, usedEdgeTotal, true);
                            currentPath.pop();
                        }
                    }
                }
            }
        }

        dfs(startNode, [startNode], 0, false);
    }

    return paths;
}