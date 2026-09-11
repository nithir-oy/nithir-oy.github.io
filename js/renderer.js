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

        // 3. ドラッグ中の線
        if (s.dragging && s.pointer != null && s.currentNode != null && s.currentNode >= 0) {
            var cur = this.point(p.nodes[s.currentNode]);
            c.beginPath();
            c.moveTo(cur.x, cur.y);
            c.lineTo(s.pointer.x, s.pointer.y);
            c.stroke();
        }

        // ★ 1. 接続可能ノードの算出（現在地から未通過エッジでつながる隣接ノード）
        var connectableNodes = {};
        if (s.currentNode !== null && s.currentNode >= 0) {
            for (var eIdx = 0; eIdx < p.edges.length; eIdx++) {
                if (s.pathEdges && s.pathEdges.indexOf(eIdx) !== -1) continue;

                var edge = p.edges[eIdx];
                if (edge[0] === s.currentNode) {
                    connectableNodes[edge[1]] = true;
                } else if (edge[1] === s.currentNode) {
                    connectableNodes[edge[0]] = true;
                }
            }
        }

        // ★ 2. ドラッグ中の指（s.pointer）がどのノードの判定範囲に入っているか検出
        var hoverTargetNode = null;
        if (s.dragging && s.pointer != null) {
            hoverTargetNode = this.hitNode(s.pointer.x, s.pointer.y);
        }

        // 4. ノード描画
        for(var k = 0; k < p.nodes.length; k++){
            var n = p.nodes[k],
                q = this.point(n);

            var isCurrent = (s.currentNode === k);
            var isConnectable = !!connectableNodes[k];
            var isHovered = (hoverTargetNode === k && isConnectable);

            // ★ 判定条件に応じてサイズと色を切り替え
            var radius = this.nodeRadius;
            var color = "#ef5b46"; // 通常（赤）

            if (isCurrent) {
                radius = 18;
                color = "#ef5b46";
            } else if (isHovered) {
                // 指が接近して「吸い込まれる直前」のノード（水色 ＋ 拡大）
                radius = 20;
                color = "#00f0ff";
            } else if (isConnectable) {
                // 次に接続可能な隣接ノード（オレンジ ＋ 拡大）
                radius = 16;
                color = "#ff7b00";
            }

            c.beginPath();
            c.arc(q.x, q.y, radius, 0, Math.PI * 2);
            c.fillStyle = color;
            c.fill();

            // 吸い込み直前（isHovered）の時はネオンリングを描画
            if (isHovered) {
                c.beginPath();
                c.arc(q.x, q.y, radius + 6, 0, Math.PI * 2);
                c.strokeStyle = "#00f0ff";
                c.lineWidth = 3;
                c.stroke();
            }

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

    // ★ 引数に connectableNodes（接続可能ノードのマップ/オブジェクト）を追加
    Renderer.prototype.hitNode = function(x, y, connectableNodes){
        var p = this.problem, b = null, bd = Infinity;
        if (!p) return null;

        for (var i = 0; i < p.nodes.length; i++){
            // ★ 接続可能リストが渡されている場合、対象外のノードは判定すらスキップする
            if (connectableNodes && !connectableNodes[i]) {
                continue;
            }

            var q = this.point(p.nodes[i]),
                d = Math.hypot(q.x - x, q.y - y);

            if (d <= this.hitRadius && d < bd){
                b = i;   // ノード番号を返す
                bd = d;
            }
        }
        return b;
    };

    window.GameRenderer = Renderer;
})();