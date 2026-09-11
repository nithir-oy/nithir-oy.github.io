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
    }

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

    // input.js (down メソッドの先頭付近)
    Input.prototype.down = function(e){
        // ★ iOS Safari のオーディオミュート解除（画面タッチの瞬間）
        if (window.GameSound && typeof window.GameSound.unlock === "function") {
            window.GameSound.unlock();
        }

        if(this.pid !== null) return;
        e.preventDefault();
        this.pid = e.pointerId;
        try { this.canvas.setPointerCapture(e.pointerId); } catch(_) {}
        this.engine.pointerDown(this.pos(e));
    };

    Input.prototype.move = function(e){
        if(e.pointerId !== this.pid) return;
        e.preventDefault();
        this.engine.pointerMove(this.pos(e));
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