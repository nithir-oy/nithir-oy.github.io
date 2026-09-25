// renderer.js

(function(){
    "use strict";

    var WARP_PALETTE = [
        { color: "#007AFF", symbol: "★" },
        { color: "#FF9500", symbol: "♥" },
        { color: "#FF2D55", symbol: "◆" },
        { color: "#5856D6", symbol: "♠" }
    ];

    function Renderer(canvas){
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = 1;
        this.height = 1;
        this.dpr = 1;
        this.problem = null;
        this.nodeRadius = 11;
        this.hitRadius = 26;

        // ★ ワープエフェクト用の状態保持
        this.warpEffect = null;
        this.animFrameId = null;
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
     * ワープ演出（波紋 × ネオンフラッシュ）の起動
     */
    Renderer.prototype.triggerWarpEffect = function(nodeId, getStateFn) {
        var self = this;
        this.warpEffect = {
            nodeId: nodeId,
            startTime: performance.now(),
            duration: 500 // アニメーション時間 (ms)
        };

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }

        function animate() {
            if (!self.warpEffect) return;
            var elapsed = performance.now() - self.warpEffect.startTime;

            // 現在のゲーム状態を取得して再描画
            var state = (typeof getStateFn === "function") ? getStateFn() : {};
            self.draw(state);

            if (elapsed < self.warpEffect.duration) {
                self.animFrameId = requestAnimationFrame(animate);
            } else {
                self.warpEffect = null;
                self.animFrameId = null;
                self.draw(state);
            }
        }

        this.animFrameId = requestAnimationFrame(animate);
    };

    /**
     * エッジ情報からギミック属性を解析するヘルパー
     */
    Renderer.prototype.getEdgeMeta = function(e) {
        var opt = e[2] || {};
        var isDouble = (opt.count === 2 || e.type === "double");
        var isDirected = (opt.dir !== undefined || e.type === "directed");
        var dir = (opt.dir !== undefined) ? opt.dir : ((e.direction !== undefined) ? e.direction : 1);

        return {
            isDouble: isDouble,
            isDirected: isDirected,
            maxPasses: isDouble ? 2 : 1,
            dir: dir
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
        
        ctx.beginPath();
        ctx.moveTo(arrowSize, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 1.5);
        ctx.lineTo(-arrowSize, arrowSize / 1.5);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = "#ef5b46";
        ctx.lineWidth = 3.5;
        ctx.stroke();

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
                nodeA = p.nodes[e[0]],
                nodeB = p.nodes[e[1]],
                a = this.point(nodeA),
                b = this.point(nodeB);

            // ★ 通行禁止ノードに繋がるエッジかどうかを判定
            var isBlockedEdge = (nodeA && (nodeA.isForbidden || nodeA.type === "blocked")) ||
                                (nodeB && (nodeB.isForbidden || nodeB.type === "blocked"));

            var meta = this.getEdgeMeta(e);
            var currentPasses = usedCount[i] || 0;
            var remainingPasses = Math.max(0, meta.maxPasses - currentPasses);

            var strokeColor = "#d1d5dc"; // 0回通過（未通過）

            if (isBlockedEdge) {
                strokeColor = "rgba(160, 174, 192, 0.6)"; // 通行禁止エッジは少し暗めのグレー
            } else if (remainingPasses === 0) {
                strokeColor = "#7657c5"; // 全通過完了
            } else if (currentPasses === 1) {
                strokeColor = "#00d4ff"; // ダブルエッジ1回目通過
            }

            // ★ 点線スタイルの適用切り替え
            if (isBlockedEdge) {
                c.setLineDash([6, 6]);
            } else {
                c.setLineDash([]);
            }

            if (meta.isDouble && remainingPasses === 2) {
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var len = Math.hypot(dx, dy) || 1;
                var offsetX = (-dy / len) * 3.5;
                var offsetY = (dx / len) * 3.5;

                c.lineWidth = 3.5;
                c.strokeStyle = strokeColor;

                c.beginPath();
                c.moveTo(a.x + offsetX, a.y + offsetY);
                c.lineTo(b.x + offsetX, b.y + offsetY);
                c.stroke();

                c.beginPath();
                c.moveTo(a.x - offsetX, a.y - offsetY);
                c.lineTo(b.x - offsetX, b.y - offsetY);
                c.stroke();
            } 
            else {
                c.lineWidth = (remainingPasses === 0) ? 8 : 7;
                c.strokeStyle = strokeColor;
                c.beginPath();
                c.moveTo(a.x, a.y);
                c.lineTo(b.x, b.y);
                c.stroke();
            }

            // ★ 描画が終わったらセットした Dash を解除しておく
            c.setLineDash([]);

            if (meta.isDirected) {
                var arrowFrom = (meta.dir === 1) ? a : b;
                var arrowTo   = (meta.dir === 1) ? b : a;
                var arrowColor = (remainingPasses === 0) ? "#ffffff" : "#ffd700";

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
                var metaInfo = this.getEdgeMeta(edgeInfo);
                var curP = usedCount[eIdx] || 0;

                if (curP >= metaInfo.maxPasses) continue;

                var uNode = p.nodes[u], vNode = p.nodes[v];
                if ((uNode && uNode.isForbidden) || (vNode && vNode.isForbidden)) continue;

                if (metaInfo.isDirected) {
                    if (metaInfo.dir === 1 && u !== s.currentNode) continue;
                    if (metaInfo.dir === -1 && v !== s.currentNode) continue;
                }

                if (u === s.currentNode) connectableNodes[v] = true;
                if (v === s.currentNode) connectableNodes[u] = true;
            }
        }

        // 4. ドラッグ中のホバー検出
        var hoverTargetNode = null;
        var hoverForbiddenNode = null; // ★ 通行禁止ノードへの接近判定用
        if (s.dragging && s.pointer != null) {
            hoverTargetNode = this.hitNode(s.pointer.x, s.pointer.y, connectableNodes);
            
            // ★ 指が近づいている通行禁止ノードがあるかを検出
            hoverForbiddenNode = this.hitForbiddenNode(s.pointer.x, s.pointer.y);
        }

        // 5. ノード描画
        for(var k = 0; k < p.nodes.length; k++){
            var n = p.nodes[k],
                q = this.point(n);

            var isCurrent = (s.currentNode === k);
            var isConnectable = !!connectableNodes[k];
            var isHovered = (hoverTargetNode === k && isConnectable);

            // A. 通行禁止ノード
            if (n.isForbidden || n.type === "blocked") {
                var isForbiddenHovered = (hoverForbiddenNode === k);
                var fRadius = this.nodeRadius; // 通常時の半径 (11)
                var fColor = "#a0aec0";        // 通常時のグレー

                if (isForbiddenHovered) {
                    // ★ 接続可能ノードのホバー時（20）と同じサイズまで拡大
                    fRadius = 20;

                    // ★ 赤色の点滅（フラッシュ）アニメーション
                    // 時間経過に合わせて透明度を揺らす (0.35〜1.0)
                    var alpha = 0.675 + 0.325 * Math.sin(performance.now() / 80);
                    fColor = "rgba(255, 45, 85, " + alpha + ")"; // 赤色アラート
                }

                // ノード本体の描画
                c.beginPath();
                c.arc(q.x, q.y, fRadius, 0, Math.PI * 2);
                c.fillStyle = fColor;
                c.fill();

                // 接近時に赤い警告リング（外枠）を描画（接続可能ノードの fRadius + 6 と同様の演出）
                if (isForbiddenHovered) {
                    c.beginPath();
                    c.arc(q.x, q.y, fRadius + 6, 0, Math.PI * 2);
                    c.strokeStyle = fColor;
                    c.lineWidth = 3;
                    c.stroke();
                }

                // ×印の描画（ノードの拡大に合わせて×印も少し大きく拡大）
                c.strokeStyle = "#ffffff";
                c.lineWidth = isForbiddenHovered ? 4 : 3;
                var crossSize = isForbiddenHovered ? 8 : 5;

                c.beginPath();
                c.moveTo(q.x - crossSize, q.y - crossSize);
                c.lineTo(q.x + crossSize, q.y + crossSize);
                c.moveTo(q.x + crossSize, q.y - crossSize);
                c.lineTo(q.x - crossSize, q.y + crossSize);
                c.stroke();

                continue;
            }

            // B. ワープノード
            if (n.warpId || n.type === "warp") {
                var palette = WARP_PALETTE[0];

                c.beginPath();
                c.arc(q.x, q.y, isCurrent ? 18 : 14, 0, Math.PI * 2);
                c.fillStyle = palette.color;
                c.fill();

                c.beginPath();
                c.arc(q.x, q.y, (isCurrent ? 18 : 14) + 4, 0, Math.PI * 2);
                c.strokeStyle = palette.color;
                c.lineWidth = 2;
                c.stroke();

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
            var color = "#ef5b46";

            if (isCurrent) {
                radius = 18;
                color = "#ef5b46";
            } else if (isHovered) {
                radius = 20;
                color = "#00f0ff";
            } else if (isConnectable) {
                radius = 16;
                color = "#ff7b00";
            }

            c.beginPath();
            c.arc(q.x, q.y, radius, 0, Math.PI * 2);
            c.fillStyle = color;
            c.fill();

            if (isHovered) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 6, 0, Math.PI * 2);
                c.strokeStyle = "#00f0ff";
                c.lineWidth = 3;
                c.stroke();
            }

            if (isCurrent) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 5, 0, Math.PI * 2);
                c.strokeStyle = "#7657c5";
                c.lineWidth = 3;
                c.stroke();
            }
        }

        // ★ 6. ワープ演出（波紋 × ネオンフラッシュ）描画処理
        if (this.warpEffect) {
            var targetNode = p.nodes[this.warpEffect.nodeId];
            if (targetNode) {
                var wPos = this.point(targetNode);
                var elapsed = performance.now() - this.warpEffect.startTime;
                var progress = Math.min(1, elapsed / this.warpEffect.duration); // 0.0 -> 1.0

                c.save();

                // ① 波紋（Expand Ring）
                var minRadius = 18;
                var maxRadius = 55;
                var currentRingRadius = minRadius + (maxRadius - minRadius) * progress;
                var ringAlpha = (1 - progress) * 0.8;

                c.beginPath();
                c.arc(wPos.x, wPos.y, currentRingRadius, 0, Math.PI * 2);
                c.strokeStyle = "#00f0ff";
                c.lineWidth = 3.5 * (1 - progress) + 0.5;
                c.globalAlpha = ringAlpha;
                c.stroke();

                // ② ネオンフラッシュ（中心の眩しい発光グロー）
                var flashAlpha = Math.pow(1 - progress, 2); // フワッと滑らかに減衰
                c.beginPath();
                c.arc(wPos.x, wPos.y, 28, 0, Math.PI * 2);
                c.fillStyle = "#ffffff";
                c.globalAlpha = flashAlpha * 0.9;
                c.shadowColor = "#00f0ff";
                c.shadowBlur = 25;
                c.fill();

                c.restore();
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

    /**
     * 通行禁止ノード専用の当たり判定ヘルパー
     */
    Renderer.prototype.hitForbiddenNode = function(x, y) {
        var p = this.problem, b = null, bd = Infinity;
        if (!p) return null;

        // ★ 接近アラート用の広い判定半径（標準のhitRadius 26 の約1.8倍）
        var warningRadius = 60;

        for (var i = 0; i < p.nodes.length; i++) {
            var n = p.nodes[i];
            // 通行禁止ノードのみを対象にする
            if (!n || (!n.isForbidden && n.type !== "blocked")) continue;

            var q = this.point(n),
                d = Math.hypot(q.x - x, q.y - y);

            if (d <= this.hitRadius && d < bd) {
                b = i;
                bd = d;
            }
        }
        return b;
    };

    window.GameRenderer = Renderer;
})();