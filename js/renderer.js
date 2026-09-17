// renderer.js

(function(){
    "use strict";

    // 色覚バリアフリーに対応したワープノード用カラー＆記号パレット（最大4ペア想定）
    var WARP_PALETTE = [
        { color: "#007AFF", symbol: "★" }, // ペア0: 青 + ★
        { color: "#FF9500", symbol: "♥" }, // ペア1: オレンジ/黄 + ♥
        { color: "#FF2D55", symbol: "◆" }, // ペア2: 赤 + ◆
        { color: "#5856D6", symbol: "♠" }  // ペア3: 紫 + ♠
    ];

    function Renderer(canvas){
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = 1;
        this.height = 1;
        this.dpr = 1;
        this.problem = null;
        this.nodeRadius = 11; // 通常のノード半径
        this.hitRadius = 26;  // 当たり判定半径
    }

    Renderer.prototype.resize = function () {
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.canvas.getBoundingClientRect();
        this.width  = rect.width;
        this.height = rect.height;

        this.canvas.width  = Math.round(this.width  * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    };

    window.addEventListener("resize", () => {
        if (typeof renderer !== "undefined" && renderer.resize) {
            renderer.resize();
        }
    });

    Renderer.prototype.setProblem = function(p){
        this.problem = p;
        this.resize();
    };

    Renderer.prototype.point = function(n){
        return {
            x: n.x * this.width,
            y: n.y * this.height
        };
    };

    /**
     * 矢印（▲）の描画用ヘルパー関数
     */
    Renderer.prototype.drawArrow = function(ctx, from, to, color) {
        var midX = (from.x + to.x) / 2;
        var midY = (from.y + to.y) / 2;
        var angle = Math.atan2(to.y - from.y, to.x - from.x);
        var arrowSize = 9;

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(arrowSize, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 1.5);
        ctx.lineTo(-arrowSize, arrowSize / 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    Renderer.prototype.draw = function(s){
        var c = this.ctx, p = this.problem;
        if(!p) return;

        var usedCount = s.usedCount || {};

        c.clearRect(0, 0, this.width, this.height);
        c.lineCap = "round";
        c.lineJoin = "round";

        // 1. エッジ（線）の描画
        for(var i = 0; i < p.edges.length; i++){
            var e = p.edges[i],
                a = this.point(p.nodes[e[0]]),
                b = this.point(p.nodes[e[1]]);

            var edgeType = e.type || e[2] || "normal";
            var maxPasses = (edgeType === "double") ? 2 : 1;
            var currentPasses = usedCount[i] || 0;
            var remainingPasses = Math.max(0, maxPasses - currentPasses);

            // 線の基本色設定
            var strokeColor = "#d1d5dc"; // 未通過（通常グレー）
            if (remainingPasses === 0) {
                strokeColor = "#7657c5"; // 通過完了（紫）
            } else if (currentPasses > 0) {
                strokeColor = "#a894e0"; // ダブルエッジの1通過目（薄紫）
            }

            // A: ダブルエッジ（未通過 = 2重線描画）
            if (edgeType === "double" && remainingPasses === 2) {
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var len = Math.hypot(dx, dy) || 1;
                var offsetX = (-dy / len) * 3.5;
                var offsetY = (dx / len) * 3.5;

                c.lineWidth = 3.5;
                c.strokeStyle = strokeColor;

                // 1本目の線
                c.beginPath();
                c.moveTo(a.x + offsetX, a.y + offsetY);
                c.lineTo(b.x + offsetX, b.y + offsetY);
                c.stroke();

                // 2本目の線
                c.beginPath();
                c.moveTo(a.x - offsetX, a.y - offsetY);
                c.lineTo(b.x - offsetX, b.y - offsetY);
                c.stroke();
            } 
            // B: 通常線・1度通ったダブルエッジ・通過完了線（1重線描画）
            else {
                c.lineWidth = (remainingPasses === 0) ? 8 : 7;
                c.strokeStyle = strokeColor;
                c.beginPath();
                c.moveTo(a.x, a.y);
                c.lineTo(b.x, b.y);
                c.stroke();
            }

            // C: 一方通行エッジ（矢印描画）
            if (edgeType === "directed") {
                var dir = (e.direction !== undefined) ? e.direction : (e[3] !== undefined ? e[3] : 1);
                var arrowFrom = (dir === 1) ? a : b;
                var arrowTo   = (dir === 1) ? b : a;
                var arrowColor = (remainingPasses === 0) ? "#ffffff" : "#4a5568";

                this.drawArrow(c, arrowFrom, arrowTo, arrowColor);
            }
        }

        // 2. ドラッグ中の線描画
        if (s.dragging && s.pointer != null && s.currentNode != null && s.currentNode >= 0) {
            var cur = this.point(p.nodes[s.currentNode]);
            c.lineWidth = 8;
            c.strokeStyle = "#7657c5";
            c.beginPath();
            c.moveTo(cur.x, cur.y);
            c.lineTo(s.pointer.x, s.pointer.y);
            c.stroke();
        }

        // 3. 接続可能ノードの算出
        var connectableNodes = {};
        if (s.currentNode !== null && s.currentNode >= 0) {
            for (var eIdx = 0; eIdx < p.edges.length; eIdx++) {
                var edgeInfo = p.edges[eIdx];
                var u = edgeInfo[0], v = edgeInfo[1];
                var eType = edgeInfo.type || edgeInfo[2] || "normal";
                var maxP = (eType === "double") ? 2 : 1;
                var curP = usedCount[eIdx] || 0;

                if (curP >= maxP) continue;

                // 通行禁止ノードは除外
                var uNode = p.nodes[u], vNode = p.nodes[v];
                if ((uNode && uNode.type === "blocked") || (vNode && vNode.type === "blocked")) continue;

                // 一方通行の逆走は除外
                var dirVal = (edgeInfo.direction !== undefined) ? edgeInfo.direction : (edgeInfo[3] !== undefined ? edgeInfo[3] : 1);
                if (eType === "directed") {
                    if (dirVal === 1 && u !== s.currentNode) continue;
                    if (dirVal === -1 && v !== s.currentNode) continue;
                }

                if (u === s.currentNode) connectableNodes[v] = true;
                if (v === s.currentNode) connectableNodes[u] = true;
            }
        }

        // 4. ドラッグ中の指（s.pointer）のホバー検出
        var hoverTargetNode = null;
        if (s.dragging && s.pointer != null) {
            hoverTargetNode = this.hitNode(s.pointer.x, s.pointer.y, connectableNodes);
        }

        // 5. ノード描画
        for(var k = 0; k < p.nodes.length; k++){
            var n = p.nodes[k],
                q = this.point(n);

            var nType = n.type || "normal";
            var isCurrent = (s.currentNode === k);
            var isConnectable = !!connectableNodes[k];
            var isHovered = (hoverTargetNode === k && isConnectable);

            // A. 通行禁止ノード（グレーアウト ＋ ×）
            if (nType === "blocked") {
                c.beginPath();
                c.arc(q.x, q.y, this.nodeRadius, 0, Math.PI * 2);
                c.fillStyle = "#a0aec0";
                c.fill();

                // × 印描画
                c.strokeStyle = "#ffffff";
                c.lineWidth = 3;
                var crossSize = 5;
                c.beginPath();
                c.moveTo(q.x - crossSize, q.y - crossSize);
                c.lineTo(q.x + crossSize, q.y + crossSize);
                c.moveTo(q.x + crossSize, q.y - crossSize);
                c.lineTo(q.x - crossSize, q.y + crossSize);
                c.stroke();
                continue;
            }

            // B. ワープノード（ユニバーサルデザイン：色 ＋ 記号）
            if (nType === "warp") {
                var pairId = n.warpPairId || 0;
                var palette = WARP_PALETTE[pairId % WARP_PALETTE.length];

                // ベースのリング描画
                c.beginPath();
                c.arc(q.x, q.y, isCurrent ? 18 : 14, 0, Math.PI * 2);
                c.fillStyle = palette.color;
                c.fill();

                c.beginPath();
                c.arc(q.x, q.y, (isCurrent ? 18 : 14) + 4, 0, Math.PI * 2);
                c.strokeStyle = palette.color;
                c.lineWidth = 2;
                c.stroke();

                // 記号（★, ♥, ◆, ♠）の描画
                c.fillStyle = "#ffffff";
                c.font = "bold 11px sans-serif";
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillText(palette.symbol, q.x, q.y);

                if (isCurrent) {
                    c.beginPath();
                    c.arc(q.x, q.y, 23, 0, Math.PI * 2);
                    c.strokeStyle = "#7657c5";
                    c.lineWidth = 3;
                    c.stroke();
                }
                continue;
            }

            // C. 通常ノード
            var radius = this.nodeRadius;
            var color = "#ef5b46"; // 通常（赤）

            if (isCurrent) {
                radius = 18;
                color = "#ef5b46";
            } else if (isHovered) {
                radius = 20;
                color = "#00f0ff"; // 指が吸い込まれる直前（水色）
            } else if (isConnectable) {
                radius = 16;
                color = "#ff7b00"; // 次に進めるノード（オレンジ）
            }

            c.beginPath();
            c.arc(q.x, q.y, radius, 0, Math.PI * 2);
            c.fillStyle = color;
            c.fill();

            // ホバー時のネオンリング
            if (isHovered) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 6, 0, Math.PI * 2);
                c.strokeStyle = "#00f0ff";
                c.lineWidth = 3;
                c.stroke();
            }

            // 現在地強調リング
            if (isCurrent) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 5, 0, Math.PI * 2);
                c.strokeStyle = "#7657c5";
                c.lineWidth = 3;
                c.stroke();
            }
        }
    };

    Renderer.prototype.hitNode = function(x, y, connectableNodes){
        var p = this.problem, b = null, bd = Infinity;
        if (!p) return null;

        for (var i = 0; i < p.nodes.length; i++){
            if (connectableNodes && !connectableNodes[i]) {
                continue;
            }

            var q = this.point(p.nodes[i]),
                d = Math.hypot(q.x - x, q.y - y);

            if (d <= this.hitRadius && d < bd){
                b = i;
                bd = d;
            }
        }
        return b;
    };

    window.GameRenderer = Renderer;
})();