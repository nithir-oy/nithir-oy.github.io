// renderer.js
(function(){
    "use strict";

    function Renderer(canvas){
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = 1;
        this.height = 1;
        this.dpr = 1;
        this.problem = null;
        this.nodeRadius = 11; // 通常のノードサイズ
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

    Renderer.prototype.draw = function(s){
        var c = this.ctx, p = this.problem;
        if(!p) return;

        c.clearRect(0, 0, this.width, this.height);
        c.lineCap = "round";
        c.lineJoin = "round";

        // 1. グレーの線（全エッジ）
        c.lineWidth = 7;
        c.strokeStyle = "#d1d5dc";
        for(var i = 0; i < p.edges.length; i++){
            var e = p.edges[i],
                a = this.point(p.nodes[e[0]]),
                b = this.point(p.nodes[e[1]]);
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
        }

        // 2. 紫の線（通過済みエッジ）
        c.lineWidth = 8;
        c.strokeStyle = "#7657c5";
        for(var j = 0; j < s.pathEdges.length; j++){
            var pe = p.edges[s.pathEdges[j]],
                pa = this.point(p.nodes[pe[0]]),
                pb = this.point(p.nodes[pe[1]]),
                from = s.edgeDirections[j] === pe[0] ? pa : pb,
                to   = s.edgeDirections[j] === pe[0] ? pb : pa;

            c.beginPath();
            c.moveTo(from.x, from.y);
            c.lineTo(to.x, to.y);
            c.stroke();
        }

        // 3. ドラッグ中の補助線
        if (s.dragging && s.pointer != null && s.currentNode != null && s.currentNode >= 0) {
            var cur = this.point(p.nodes[s.currentNode]);
            c.beginPath();
            c.moveTo(cur.x, cur.y);
            c.lineTo(s.pointer.x, s.pointer.y);
            c.stroke();
        }

        // ★ 接続可能ノードの算出（現在地に隣接していて、未通過のエッジでつながるノード）
        var connectableNodes = new Set();
        if (s.currentNode !== null && s.currentNode >= 0) {
            for (var eIdx = 0; eIdx < p.edges.length; eIdx++) {
                // すでに通過済みのエッジはスキップ
                if (s.pathEdges && s.pathEdges.indexOf(eIdx) !== -1) continue;

                var edge = p.edges[eIdx];
                if (edge[0] === s.currentNode) {
                    connectableNodes.add(edge[1]);
                } else if (edge[1] === s.currentNode) {
                    connectableNodes.add(edge[0]);
                }
            }
        }

        // ★ ドラッグ指位置で「吸い込まれそうなターゲットノード」を検出
        var hoverTargetNode = null;
        if (s.dragging && s.pointer != null) {
            hoverTargetNode = this.hitNode(s.pointer.x, s.pointer.y);
        }

        // 4. ノード描画
        for(var k = 0; k < p.nodes.length; k++){
            var n = p.nodes[k],
                q = this.point(n);

            // 条件判定: 「現在地」「接続可能（隣接）」「指が接近中」のいずれかなら拡大
            var isCurrent = (s.currentNode === k);
            var isConnectable = connectableNodes.has(k);
            var isHovered = (hoverTargetNode === k && isConnectable);

            var radius = (isCurrent || isConnectable || isHovered) ? 18 : this.nodeRadius;

            c.beginPath();
            c.arc(q.x, q.y, radius, 0, Math.PI * 2);

            // 色分け: 接続可能ノードは少しネオンブルー寄りに
            if (isHovered) {
                c.fillStyle = "#00f0ff"; // 指が近づいて吸着しそうなノード（水色）
            } else if (isConnectable) {
                c.fillStyle = "#ff7b00"; // 接続可能な隣接ノード（オレンジ強調）
            } else {
                c.fillStyle = "#ef5b46"; // 通常ノード（赤）
            }
            c.fill();

            // 現在地ノードの強調リング
            if (isCurrent) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 5, 0, Math.PI * 2);
                c.strokeStyle = "#7657c5";
                c.lineWidth = 3;
                c.stroke();
            }
        }
    };

    Renderer.prototype.hitNode = function(x, y){
        var p = this.problem, b = null, bd = Infinity;
        if (!p) return null;

        for (var i = 0; i < p.nodes.length; i++){
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