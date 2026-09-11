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
        this.nodeRadius = 12; // 見た目のノード半径
        this.hitRadius = 26;  // ★ タッチ判定半径（スマホ向けに拡大: 12 → 26）
    }

    Renderer.prototype.resize = function () {
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        // キャンバスの表示サイズ（CSS）を取得
        const rect = this.canvas.getBoundingClientRect();
        this.width  = rect.width;
        this.height = rect.height;

        // 内部ピクセルサイズを dpr に合わせて設定
        this.canvas.width  = Math.round(this.width  * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);

        // 描画コンテキストを dpr に合わせる
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

    // ★ 正規化座標（0〜1）をキャンバスサイズに変換
    // キャンバス自体が縦長であれば、Y座標は自動的に縦長に引き伸ばされます
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

        // グレーの線（全エッジ）
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

        // 紫の線（通過したエッジ）
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

        // ★ ドラッグ中の線
        if (s.dragging && s.pointer != null && s.currentNode != null && s.currentNode >= 0) {
            var cur = this.point(p.nodes[s.currentNode]);
            c.beginPath();
            c.moveTo(cur.x, cur.y);
            c.lineTo(s.pointer.x, s.pointer.y);
            c.stroke();
        }

        // ノード描画
        for(var k = 0; k < p.nodes.length; k++){
            var n = p.nodes[k],
                q = this.point(n);

            c.beginPath();
            c.arc(q.x, q.y, this.nodeRadius, 0, Math.PI * 2);
            c.fillStyle = "#ef5b46";
            c.fill();

            // 現在ノード強調リング
            if (s.currentNode === k) {
                c.beginPath();
                c.arc(q.x, q.y, this.nodeRadius + 5, 0, Math.PI * 2);
                c.strokeStyle = "#7657c5";
                c.lineWidth = 3;
                c.stroke();
            }
        }
    };

    // ★ ノード判定（hitRadius を拡大して判定しやすく改修）
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