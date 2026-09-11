// level_checker.js - 強化版チェックツール

function validateAllLevels(levelSchemes, minNodeDistance = 0.15) {
  const errors = [];
  const warnings = [];

  console.log(`--- 全 ${levelSchemes.length} レベルの自動検証を開始 ---`);

  levelSchemes.forEach((level) => {
    const { id, nodes, edgesList, allowTrail } = level;
    const N = nodes.length;

    // 1. 座標の範囲（マージン）チェック
    nodes.forEach((n, idx) => {
      if (n.x < 0.05 || n.x > 0.95 || n.y < 0.05 || n.y > 0.95) {
        errors.push(`Level ${id}: ノード ${idx} が画面外または境界線上にあります (${n.x}, ${n.y})`);
      }
    });

    // 2. ノード間距離の検証（近接チェック）
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < minNodeDistance) {
          // ノード数が多い後半レベルは警告レベルに調整
          if (N > 10 && dist >= 0.10) {
            warnings.push(`Level ${id}: ノード ${i} と ${j} の距離がやや近いです (距離: ${dist.toFixed(3)})`);
          } else {
            errors.push(`Level ${id}: ノード ${i} と ${j} の距離が近すぎます (距離: ${dist.toFixed(3)})`);
          }
        }
      }
    }

    // 3. 次数計算とオイラー性の判定（一筆書きチェック）
    const degrees = new Array(N).fill(0);
    edgesList.forEach(([u, v]) => {
      if (u >= N || v >= N) {
        errors.push(`Level ${id}: 存在しないノード番号を参照しています ([${u}, ${v}])`);
      }
      degrees[u]++;
      degrees[v]++;
    });

    const oddNodes = degrees.filter(deg => deg % 2 !== 0).length;
    const zeroNodes = degrees.filter(deg => deg === 0).length;

    if (zeroNodes > 0) {
      errors.push(`Level ${id}: エッジが1つも接続されていない孤立ノードが ${zeroNodes} 個存在します`);
    }

    if (allowTrail) {
      if (oddNodes !== 2 && oddNodes !== 0) {
        errors.push(`Level ${id}: 一筆書き（Trail）の解法が存在しません（奇数ノード数: ${oddNodes}）`);
      }
    } else {
      if (oddNodes !== 0) {
        errors.push(`Level ${id}: 一筆書き（Circuit）の解法が存在しません（奇数ノード数: ${oddNodes}）`);
      }
    }

    // 4. グラフの連結性チェック (BFS)
    const visited = new Array(N).fill(false);
    const queue = [0];
    visited[0] = true;
    let visitedCount = 1;

    while (queue.length > 0) {
      const curr = queue.shift();
      edgesList.forEach(([u, v]) => {
        let next = -1;
        if (u === curr) next = v;
        if (v === curr) next = u;

        if (next !== -1 && !visited[next]) {
          visited[next] = true;
          visitedCount++;
          queue.push(next);
        }
      });
    }

    if (visitedCount < N) {
      errors.push(`Level ${id}: グラフが分断されています (到達可能ノード: ${visitedCount}/${N})`);
    }
  });

  // 結果出力
  console.log(`--- 検証完了 ---`);
  console.log(`エラー: ${errors.length} 件 / 警告: ${warnings.length} 件`);

  if (errors.length > 0) {
    console.error("【要修正エラー項目】");
    errors.forEach(e => console.error(" - " + e));
  } else {
    console.log("全レベルが正常に一筆書き可能かつクリアなレイアウトです！");
  }

  return { isValid: errors.length === 0, errors, warnings };
}