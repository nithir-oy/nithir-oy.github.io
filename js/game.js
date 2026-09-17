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
        this.usedCount = {};
        this.pathEdges = [];
        this.edgeDirections = [];
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.failures = 0;
        this.transition = false;
        this.totalRequiredPasses = 0;
    }

    Engine.prototype.getEdgeMeta = function(e) {
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

        this.totalRequiredPasses = 0;
        if (level.edges) {
            for (var i = 0; i < level.edges.length; i++) {
                var meta = this.getEdgeMeta(level.edges[i]);
                this.totalRequiredPasses += meta.maxPasses;
            }
        }

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

    Engine.prototype.findEdge = function(a, b){
        if (!this.level || !this.level.edges) return null;

        for (var i = 0; i < this.level.edges.length; i++){
            var e = this.level.edges[i];
            var u = e[0], v = e[1];
            var meta = this.getEdgeMeta(e);

            if ((u === a && v === b) || (u === b && v === a)) {
                var isValidDir = true;
                if (meta.isDirected) {
                    if (meta.dir === 1 && (u !== a || v !== b)) isValidDir = false;
                    if (meta.dir === -1 && (u !== b || v !== a)) isValidDir = false;
                }
                return { index: i, edge: e, meta: meta, isValidDirection: isValidDir };
            }
        }
        return null;
    };

    Engine.prototype.getNodeType = function(nodeId) {
        if (!this.level || !this.level.nodes || !this.level.nodes[nodeId]) {
            return {};
        }
        return this.level.nodes[nodeId];
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
        // ★ ライフが0（ゲームオーバー）の場合は表示時間を長く設定（1000ms）
        var delay = (self.life <= 0) ? 1000 : 800;

        setTimeout(function(){
            if (self.life <= 0){
                self.transition = true;
                if (self.cb.gameOver) self.cb.gameOver();
            } else {
                self.resetAttempt();
            }
        }, delay);
    };

    Engine.prototype.pointerDown = function(pos){
        if (this.transition || this.life <= 0) return;

        var n = this.r.hitNode(pos.x, pos.y);

        if (!this.started){
            if (n === null) return;

            var nObj = this.getNodeType(n);
            if (nObj.isForbidden || nObj.type === "blocked") return;

            this.startNode = n;
            this.currentNode = n;
            this.started = true;
            this.startedAt = performance.now();

            if ((nObj.warpId || nObj.type === "warp") && nObj.warpTarget !== undefined) {
                this.currentNode = nObj.warpTarget;
            }
        }
        else if (n !== this.currentNode){
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

        var connectableNodes = null;
        if (this.currentNode !== null && this.currentNode >= 0) {
            connectableNodes = {};
            for (var i = 0; i < this.level.edges.length; i++) {
                var eInfo = this.level.edges[i];
                var u = eInfo[0], v = eInfo[1];
                var meta = this.getEdgeMeta(eInfo);
                var currentPass = this.usedCount[i] || 0;

                if (currentPass >= meta.maxPasses) continue;

                if (this.getNodeType(u).isForbidden || this.getNodeType(v).isForbidden) continue;

                if (meta.isDirected) {
                    if (meta.dir === 1 && u !== this.currentNode) continue;
                    if (meta.dir === -1 && v !== this.currentNode) continue;
                }

                if (u === this.currentNode) connectableNodes[v] = true;
                if (v === this.currentNode) connectableNodes[u] = true;
            }
        }

        var n = this.r.hitNode(pos.x, pos.y, connectableNodes);

        if (n !== null && n !== this.currentNode){
            var edgeData = this.findEdge(this.currentNode, n);

            if (!edgeData || !edgeData.isValidDirection) return;

            var currentPasses = this.usedCount[edgeData.index] || 0;
            if (currentPasses >= edgeData.meta.maxPasses) return;

            // 移動処理
            this.usedCount[edgeData.index] = currentPasses + 1;
            this.pathEdges.push(edgeData.index);
            this.edgeDirections.push(this.currentNode);
            this.currentNode = n;

            // ワープ判定
            var targetNodeObj = this.getNodeType(n);
            if ((targetNodeObj.warpId || targetNodeObj.type === "warp") && targetNodeObj.warpTarget !== undefined) {
                this.currentNode = targetNodeObj.warpTarget;
            }

            this.render();

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

        if (n !== null && n !== this.currentNode) {
            var edgeData = this.findEdge(this.currentNode, n);
            var targetNodeObj = this.getNodeType(n);

            if (targetNodeObj.isForbidden || targetNodeObj.type === "blocked") {
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
            var currentPasses = this.usedCount[edgeData.index] || 0;
            if (currentPasses >= edgeData.meta.maxPasses) {
                this.fail("すでに規定回数通過した線です");
                return;
            }
        }

        this.render();
    };

    Engine.prototype.pointerCancel = function(){
        if (this.dragging) this.fail("操作がキャンセルされました");
    };

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