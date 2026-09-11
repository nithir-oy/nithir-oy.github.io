// input.js
(function(){
    "use strict";
    
    function Input(canvas, engine){
        this.canvas = canvas;
        this.engine = engine;
        this.pid = null;
        
        canvas.addEventListener("pointerdown", this.down.bind(this));
        canvas.addEventListener("pointermove", this.move.bind(this));
        canvas.addEventListener("pointerup", this.up.bind(this));
        canvas.addEventListener("pointercancel", this.cancel.bind(this));

        // ★ エンジン側からの「ノード接続成功」通知を受け取って振動させるフック
        if (this.engine) {
            const originalOnConnect = this.engine.onNodeConnect;
            this.engine.onNodeConnect = () => {
                if (originalOnConnect) originalOnConnect.apply(this.engine, arguments);
                this.vibrate();
            };
        }
    }

    // ★ 座標計算（タッチ操作時のみ Y 軸を上にオフセット）
    Input.prototype.pos = function(e){
        var r = this.canvas.getBoundingClientRect();
        var x = e.clientX - r.left;
        var y = e.clientY - r.top;

        // タッチ操作（指）の場合のみ、指の35px上をターゲットにする
        if (e.pointerType === "touch") {
            y -= 35;
        }

        return { x: x, y: y };
    };

    // ★ 触覚フィードバック（振動）
    Input.prototype.vibrate = function(){
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            try {
                window.navigator.vibrate(12); // 12ms の短い振動
            } catch (_) {}
        }
    };

    Input.prototype.down = function(e){
        if(this.pid !== null) return;
        e.preventDefault();
        this.pid = e.pointerId;
        try { this.canvas.setPointerCapture(e.pointerId); } catch(_) {}
        
        // 押し込み時にも接続チェックが走るため、成功すれば振動します
        var prevNode = this.engine.state ? this.engine.state.currentNode : null;
        this.engine.pointerDown(this.pos(e));
        
        // タッチ開始でノードを掴めたら振動
        if (this.engine.state && this.engine.state.currentNode !== null && this.engine.state.currentNode !== prevNode) {
            this.vibrate();
        }
    };

    Input.prototype.move = function(e){
        if(e.pointerId !== this.pid) return;
        e.preventDefault();
        
        var prevNode = this.engine.state ? this.engine.state.currentNode : null;
        this.engine.pointerMove(this.pos(e));
        
        // ドラッグ中に新しいノードへ接続できたら振動
        if (this.engine.state && this.engine.state.currentNode !== null && this.engine.state.currentNode !== prevNode) {
            this.vibrate();
        }
    };

    Input.prototype.up = function(e){
        if(e.pointerId !== this.pid) return;
        e.preventDefault();
        this.engine.pointerUp(this.pos(e));
        this.pid = null;
    };

    Input.prototype.cancel = function(e){
        if(e.pointerId !== this.pid) return;
        this.engine.pointerCancel();
        this.pid = null;
    };

    window.GameInput = Input;
})();