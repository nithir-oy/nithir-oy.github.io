// game.js

(function(){
    "use strict";

    function Engine(renderer, cb){
        this.r = renderer;
        this.cb = cb || {};
        this.life = 3;
        this.level = null;
        this.startNode = null;
        this.currentNode = null;
        this.usedCount = {};       // エッジごとの通過回数 { edgeIndex: count }
        this.pathEdges = [];       // 通過したエッジのインデックス配列
        this.edgeDirections = [];  // 通過時の始点ノード配列
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.failures = 0;
        this.transition = false;
        this.totalRequiredPasses = 0; // レベル全体の必要通過回数総和
    }

    Engine.prototype.state = function(){
        return {
            pathEdges: this.pathEdges,
            edgeDirections: this.edgeDirections,
            currentNode: this.currentNode,
            dragging: this.dragging,
            pointer: this.pointer,
            usedCount: this.usedCount
        };
    };

    Engine.prototype.load = function(level){
        this.level = level;
        this.life = 3;
        this.startNode = null;
        this.currentNode = null;
        this.usedCount = {};
        this.pathEdges = [];
        this.edgeDirections = [];
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.failures = 0;
        this.transition = false;

        // クリア条件に必要な総通過回数を計算（ダブルエッジは2、通常・一方通行は1）
        this.totalRequiredPasses = 0;
        if (level.edges) {
            for (var i = 0; i < level.edges.length; i++) {
                var e = level.edges[i];
                var req = (e.type === "double" || e[2] === "double") ? 2 : 1;
                this.totalRequiredPasses += req;
            }
        }

        // edges が空ならノードだけ描画
        if (!level.edges || level.edges.length === 0){
            this.r.draw({
                pathEdges: [],
                edgeDirections: [],
                currentNode: null,
                dragging: false,
                pointer: null,
                usedCount: {}
            });
            this.ui();
            return;
        }

        // 通常レベル（JSONベース）
        this.r.setProblem(level);
        this.render();
        this.ui();
    };

    Engine.prototype.render = function(){
        this.r.draw(this);
    };

    Engine.prototype.ui = function(){
        if (this.cb.life)  this.cb.life(this.life);
        if (this.cb.level) this.cb.level(this.level.id);
    };

    /**
     * ノード a, b 間に存在するエッジ情報と方向を取得
     * 返り値: { index, edge, isValidDirection }
     */
    Engine.prototype.findEdge = function(a, b){
        if (!this.level || !this.level.edges) return null;

        for (var i = 0; i < this.level.edges.length; i++){
            var e = this.level.edges[i];
            var u = e[0], v = e[1];
            var type = e.type || e[2] || "normal";
            var dir = (e.direction !== undefined) ? e.direction : (e[3] !== undefined ? e[3] : 1);

            if ((u === a && v === b) || (u === b && v === a)) {
                var isValidDir = true;
                if (type === "directed") {
                    if (dir === 1 && (u !== a || v !== b)) isValidDir = false;
                    if (dir === -1 && (u !== b || v !== a)) isValidDir = false;
                }
                return { index: i, edge: e, type: type, isValidDirection: isValidDir };
            }
        }
        return null;
    };

    /**
     * ノードの属性を取得
     */
    Engine.prototype.getNodeType = function(nodeId) {
        if (!this.level || !this.level.nodes || !this.level.nodes[nodeId]) {
            return { type: "normal" };
        }
        var n = this.level.nodes[nodeId];
        if (typeof n === "object") return n;
        return { type: "normal" };
    };

    Engine.prototype.resetAttempt = function(){
        this.currentNode = this.startNode;
        this.usedCount = {};
        this.pathEdges = [];
        this.edgeDirections = [];
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.render();
    };

    Engine.prototype.fail = function(reason){
        if (this.transition) return;

        this.failures++;
        this.life--;
        this.started = false;
        this.dragging = false;
        this.pointer = null;

        this.ui();
        this.render();

        if (this.cb.failure) this.cb.failure(reason, this.life);

        var self = this;
        setTimeout(function(){
            if (self.life <= 0){
                self.transition = true;
                if (self.cb.gameOver) self.cb.gameOver();
            } else {
                self.resetAttempt();
            }
        }, 400);
    };

    Engine.prototype.pointerDown = function(pos){
        if (this.transition || this.life <= 0) return;

        var n = this.r.hitNode(pos.x, pos.y);

        if (!this.started){
            if (n === null) return;

            // 通行禁止ノードからのスタートは不可
            var nObj = this.getNodeType(n);
            if (nObj.type === "blocked") return;

            this.startNode = n;
            this.currentNode = n;
            this.started = true;
            this.startedAt = performance.now();

            // スタートノードがワープノードの場合、即時ワープ
            if (nObj.type === "warp" && nObj.warpTarget !== undefined) {
                this.currentNode = nObj.warpTarget;
            }
        }
        else if (n !== this.currentNode){
            // 着地前のタップミス（スタート済みで別ノードを直押し）
            this.fail("別のノードから再開することはできません");
            return;
        }

        this.dragging = true;
        this.pointer = pos;
        this.render();
    };

    Engine.prototype.pointerMove = function(pos){
        if (!this.dragging || !this.started) return;

        this.pointer = pos;

        // 1. 現在地から接続可能（通過残数が残っている）なノードのマップを作成
        var connectableNodes = null;
        if (this.currentNode !== null && this.currentNode >= 0) {
            connectableNodes = {};
            for (var i = 0; i < this.level.edges.length; i++) {
                var eInfo = this.level.edges[i];
                var u = eInfo[0], v = eInfo[1];
                var type = eInfo.type || eInfo[2] || "normal";
                var maxPass = (type === "double") ? 2 : 1;
                var currentPass = this.usedCount[i] || 0;

                if (currentPass >= maxPass) continue; // 回数上限に達したエッジはスキップ

                // 通行禁止ノードへの接続は除外（ドラッグ移動させない）
                if (this.getNodeType(u).type === "blocked" || this.getNodeType(v).type === "blocked") continue;

                // 一方通行の逆走チェック
                var dir = (eInfo.direction !== undefined) ? eInfo.direction : (eInfo[3] !== undefined ? eInfo[3] : 1);
                if (type === "directed") {
                    if (dir === 1 && u !== this.currentNode) continue;
                    if (dir === -1 && v !== this.currentNode) continue;
                }

                if (u === this.currentNode) connectableNodes[v] = true;
                if (v === this.currentNode) connectableNodes[u] = true;
            }
        }

        // 2. 接続可能なノードのみを対象にヒット判定
        var n = this.r.hitNode(pos.x, pos.y, connectableNodes);

        if (n !== null && n !== this.currentNode){
            var edgeData = this.findEdge(this.currentNode, n);

            if (!edgeData || !edgeData.isValidDirection) return;

            var maxPasses = (edgeData.type === "double") ? 2 : 1;
            var currentPasses = this.usedCount[edgeData.index] || 0;

            if (currentPasses >= maxPasses) return;

            // --- 移動処理 ---
            this.usedCount[edgeData.index] = currentPasses + 1;
            this.pathEdges.push(edgeData.index);
            this.edgeDirections.push(this.currentNode);
            this.currentNode = n;

            // ワープノード着地時の即時位置書き換え
            var targetNodeObj = this.getNodeType(n);
            if (targetNodeObj.type === "warp" && targetNodeObj.warpTarget !== undefined) {
                this.currentNode = targetNodeObj.warpTarget;
            }

            this.render();

            // ドラッグ中のクリア判定（途中で全通過を達成した場合）
            if (this.isCleared()){
                this.dragging = false;
                this.pointer = null;
                this.transition = true;

                var sec = (performance.now() - this.startedAt) / 1000;
                if (this.cb.clear){
                    this.cb.clear({
                        level: this.level.id,
                        seconds: sec,
                        failures: this.failures
                    });
                }
                return;
            }
        }

        this.render();
    };

    Engine.prototype.pointerUp = function(pos){
        if (!this.dragging) return;

        var n = this.r.hitNode(pos.x, pos.y);
        this.dragging = false;
        this.pointer = null;

        // クリア済み判定
        if (this.isCleared()){
            this.transition = true;
            var sec = (performance.now() - this.startedAt) / 1000;
            if (this.cb.clear){
                this.cb.clear({
                    level: this.level.id,
                    seconds: sec,
                    failures: this.failures
                });
            }
            return;
        }

        // ★ 着地ミス判定 ★
        // クリアしていない状態で、ノード以外に離された、あるいは不正なノードに着地した場合
        if (n !== null && n !== this.currentNode) {
            var edgeData = this.findEdge(this.currentNode, n);
            var targetNodeObj = this.getNodeType(n);

            if (targetNodeObj.type === "blocked") {
                this.fail("通行禁止ノードへは移動できません");
                return;
            }
            if (!edgeData) {
                this.fail("線でつながっていないノードへは移動できません");
                return;
            }
            if (!edgeData.isValidDirection) {
                this.fail("一方通行の線を逆走することはできません");
                return;
            }
            var maxPasses = (edgeData.type === "double") ? 2 : 1;
            var currentPasses = this.usedCount[edgeData.index] || 0;
            if (currentPasses >= maxPasses) {
                this.fail("すでに規定回数通過した線です");
                return;
            }
        }

        this.render();
    };

    Engine.prototype.pointerCancel = function(){
        if (this.dragging) this.fail("操作がキャンセルされました");
    };

    /**
     * 全エッジの必要通過回数を満たしているかチェック
     */
    Engine.prototype.isCleared = function(){
        var totalPassed = 0;
        for (var idx in this.usedCount) {
            if (this.usedCount.hasOwnProperty(idx)) {
                totalPassed += this.usedCount[idx];
            }
        }
        return totalPassed === this.totalRequiredPasses;
    };

    Engine.prototype.restart = function(){
        if (this.transition) return;

        this.life--;
        this.ui();

        if (this.life <= 0){
            this.transition = true;
            if (this.cb.gameOver) this.cb.gameOver();
        } else {
            this.startNode = null;
            this.currentNode = null;
            this.usedCount = {};
            this.pathEdges = [];
            this.edgeDirections = [];
            this.dragging = false;
            this.pointer = null;
            this.started = false;
            this.render();
        }
    };

    window.GameEngine = Engine;

})();