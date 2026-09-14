// game.js（テストコード完全排除・安定版）

(function(){
    "use strict";

    function Engine(renderer, cb){
        this.r = renderer;
        this.cb = cb || {};
        this.life = 3;
        this.level = null;
        this.startNode = null;
        this.currentNode = null;
        this.used = {};
        this.pathEdges = [];
        this.edgeDirections = [];
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.failures = 0;
        this.transition = false;
    }

    Engine.prototype.state = function(){
        return {
            pathEdges: this.pathEdges,
            edgeDirections: this.edgeDirections,
            currentNode: this.currentNode,
            dragging: this.dragging,
            pointer: this.pointer
        };
    };

    Engine.prototype.load = function(level){
        this.level = level;
        this.life = 3;
        this.startNode = null;
        this.currentNode = null;
        this.used = {};
        this.pathEdges = [];
        this.edgeDirections = [];
        this.dragging = false;
        this.pointer = null;
        this.started = false;
        this.failures = 0;
        this.transition = false;

        // ★ edges が空ならノードだけ描画（元の仕様のまま）
        if (!level.edges || level.edges.length === 0){
            this.r.draw({
                pathEdges: [],
                edgeDirections: [],
                currentNode: null,
                dragging: false,
                pointer: null
            });
            this.ui();
            return;
        }

        // ★ 通常レベル（JSONベース）
        this.r.setProblem(level);
        this.render();
        this.ui();
    };

    Engine.prototype.render = function(){
        // ★ testMode は廃止したのでチェック不要
        this.r.draw(this);
    };

    Engine.prototype.ui = function(){
        if (this.cb.life)  this.cb.life(this.life);
        if (this.cb.level) this.cb.level(this.level.id);
    };

    Engine.prototype.edgeId = function(a, b){
        for (var i = 0; i < this.level.edges.length; i++){
            var e = this.level.edges[i];
            if ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)) return i;
        }
        return -1;
    };

    Engine.prototype.resetAttempt = function(){
        this.currentNode = this.startNode;
        this.used = {};
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

        console.log("pointerDown node:", n);  // ★ 追加

        if (!this.started){
            if (n === null) return;

            this.startNode = n;
            this.currentNode = n;
            this.started = true;
            this.startedAt = performance.now();
        }
        else if (n !== this.currentNode){
            this.fail("別の●から再開することはできません");
            return;
        }

        this.dragging = true;
        this.pointer = pos;
        this.render();
    };

    Engine.prototype.pointerMove = function(pos){
        if (!this.dragging || !this.started) return;

        this.pointer = pos;

        // ★ 1. 現在地から接続可能なノードのマップを作成
        var connectableNodes = null;
        if (this.currentNode !== null && this.currentNode >= 0) {
            connectableNodes = {};
            for (var i = 0; i < this.level.edges.length; i++) {
                // すでに使用済みのエッジはスキップ
                if (this.used[i]) continue;

                var e = this.level.edges[i];
                if (e[0] === this.currentNode) connectableNodes[e[1]] = true;
                if (e[1] === this.currentNode) connectableNodes[e[0]] = true;
            }
        }

        // ★ 2. 接続可能なノード（拡大表示されているノード）のみを対象にヒット判定
        var n = this.r.hitNode(pos.x, pos.y, connectableNodes);

        if (n !== null && n !== this.currentNode){
            var id = this.edgeId(this.currentNode, n);

            // ※ 接続可能ノードのみを判定しているため、基本的にここを通過するのは有効なエッジのみになります
            if (id < 0 || this.used[id]){
                return; // 念のための防護措置（failを呼ばずにスルー）
            }

            this.used[id] = true;
            this.pathEdges.push(id);
            this.edgeDirections.push(this.currentNode);
            this.currentNode = n;

            this.render();

            // 修正後のクリア判定
            if (Object.keys(this.used).length === this.level.edges.length){
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

    // ★★★ 正しいクリア判定 ★★★
    if (Object.keys(this.used).length === this.level.edges.length){
        // ★ currentNode を見る（n は使わない）
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

    // ★ このチェックは削除してOK
    // if (n !== this.currentNode){
    //     this.fail("●の上で指・マウスを離してください");
    //     return;
    // }

    this.render();
    };



    Engine.prototype.pointerCancel = function(){
        if (this.dragging) this.fail("操作がキャンセルされました");
    };

    // ★ 追加：ライフを1消費してリスタートする処理
    Engine.prototype.restart = function(){
        if (this.transition) return;

        this.life--;
        this.ui(); // ライフ描画UIを更新

        if (this.life <= 0){
            this.transition = true;
            if (this.cb.gameOver) this.cb.gameOver();
        } else {
            // ライフが残っていれば現在のレベルを初期状態に戻す
            this.startNode = null;
            this.currentNode = null;
            this.used = {};
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