// app.js

function initApp() {
    "use strict";

    var S = {};
    ["title", "howto", "levels", "game", "clear", "gameover"].forEach(function(n){
        S[n] = document.getElementById("screen-" + n);
    });

    function show(n){
        Object.keys(S).forEach(function(k){
            if (S[k]) {
                S[k].classList.toggle("active", k === n);
            }
        });
    }

    function level(id){
        if (typeof LEVEL_SCHEMES === "undefined" || !LEVEL_SCHEMES || !LEVEL_SCHEMES[id - 1]) return null;
        if (typeof generateLevel === "function") {
            return generateLevel(id);
        }
        return null;
    }

    var canvas = document.getElementById("game-canvas"),
        renderer = new GameRenderer(canvas),
        life = document.getElementById("life"),
        gameLevel = document.getElementById("game-level"),
        msg = document.getElementById("game-message"),
        current = 1,
        currentPage = 1,
        TOTAL_LEVELS = 200,
        PER_PAGE = 50;

    function drawLife(n){
        if (!life) return;
        life.innerHTML = "";
        for (var i = 0; i < 3; i++){
            var s = document.createElement("span");
            s.className = "heart" + (i >= n ? " empty" : "");
            s.textContent = "♥";
            life.appendChild(s);
        }
    }

    /**
     * 失敗時や注意喚起のフラッシュメッセージ表示
     * ギミック失敗時の具体理由（reason）に対応
     */
    function flash(t){
        if (!msg) return;
        msg.textContent = t || "MISS";
        msg.classList.add("show");
        
        // 既存のタイマーがあればクリアして連続表示に対応
        if (msg._flashTimer) clearTimeout(msg._flashTimer);
        msg._flashTimer = setTimeout(function(){
            msg.classList.remove("show");
        }, 800); // ギミックの文字が見やすいよう800msに調整
    }

    // ★ 50問ごとのページ切り替え ＆ 解放判定対応 grid()
    var DEBUG_UNLOCK_ALL = false;

    function grid(){
        var g = document.getElementById("level-grid");
        if (!g) return;
        g.innerHTML = "";

        // 表示範囲（1〜50, 51〜100, 101〜150, 151〜200）
        var startLevel = (currentPage - 1) * PER_PAGE + 1;
        var endLevel = Math.min(currentPage * PER_PAGE, TOTAL_LEVELS);

        for (var i = startLevel; i <= endLevel; i++){
            var b = document.createElement("button");
            
            var has = DEBUG_UNLOCK_ALL || (
                (typeof GameStorage !== "undefined" && typeof GameStorage.isUnlocked === "function")
                    ? GameStorage.isUnlocked(i)
                    : (i === 1)
            );

            b.className = "level-button " + (has ? "unlocked" : "locked");
            b.textContent = i;
            b.disabled = !has;

            if (has){
                b.onclick = (function(id){
                    return function(){ start(id); };
                })(i);
            }

            g.appendChild(b);
        }

        // ページ情報の更新
        var totalPages = Math.ceil(TOTAL_LEVELS / PER_PAGE);
        var pageInfo = document.getElementById("page-info");
        if (pageInfo) pageInfo.textContent = currentPage + " / " + totalPages;

        var btnPrev = document.getElementById("btn-page-prev");
        var btnNext = document.getElementById("btn-page-next");
        if (btnPrev) btnPrev.disabled = (currentPage === 1);
        if (btnNext) btnNext.disabled = (currentPage === totalPages);
    }

    function start(id){
        const lv = level(id);
        if (!lv) {
            alert("Level " + id + " のデータがまだ存在しません。");
            return;
        }

        current = id;
        show("game");

        renderer.resize();
        engine.load(lv);
    }

    var engine = new GameEngine(renderer, {
        life: drawLife,
        level: function(n){ if (gameLevel) gameLevel.textContent = n; },
        
        // ★ ギミック失敗時のメッセージ（reason）を表示に反映
        failure: function(reason){ 
            flash(reason || "MISS"); 
        },
        
        // ★ クリア演出
        clear: function(r){
            engine.render();

            setTimeout(function(){
                var timeSec = Number(r.seconds.toFixed(2));
                var recordResult = (typeof GameStorage !== "undefined" && GameStorage.clearLevel)
                    ? GameStorage.clearLevel(r.level, timeSec)
                    : { isNewRecord: false, bestTime: timeSec };

                var clearLevelEl = document.getElementById("clear-level");
                if (clearLevelEl) clearLevelEl.textContent = r.level;

                var recordBadge = recordResult.isNewRecord
                    ? '<span class="new-record-badge">NEW RECORD!</span><br>'
                    : '';

                var bestText = (recordResult.bestTime !== null && recordResult.bestTime !== undefined)
                    ? recordResult.bestTime.toFixed(2) + " 秒"
                    : "-";

                var clearStatsEl = document.getElementById("clear-stats");
                if (clearStatsEl) {
                    clearStatsEl.innerHTML =
                        recordBadge +
                        "クリアタイム：" + timeSec.toFixed(2) + " 秒<br>" +
                        "自己ベスト：" + bestText + "<br>" +
                        "失敗回数：" + r.failures + " 回";
                }

                show("clear");
            }, 600);
        },
        
        gameOver: function(){
            var overLevelEl = document.getElementById("over-level");
            if (overLevelEl) overLevelEl.textContent = current;
            show("gameover");
        }
    });

    // ページコントロールボタンのイベント設定
    var btnPrev = document.getElementById("btn-page-prev");
    var btnNext = document.getElementById("btn-page-next");
    if (btnPrev) {
        btnPrev.onclick = function(){
            if (currentPage > 1) {
                currentPage--;
                grid();
            }
        };
    }
    if (btnNext) {
        btnNext.onclick = function(){
            var totalPages = Math.ceil(TOTAL_LEVELS / PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                grid();
            }
        };
    }

    // 安全にイベントを設定するヘルパー
    function bindClick(id, handler) {
        var el = document.getElementById(id);
        if (el) el.onclick = handler;
    }

    bindClick("btn-start", function(){ grid(); show("levels"); });
    bindClick("btn-howto", function(){ show("howto"); });
    bindClick("btn-howto-back", function(){ show("title"); });
    bindClick("btn-levels-home", function(){ show("title"); });
    bindClick("btn-game-restart", function(){ engine.restart(); });
    bindClick("btn-game-levels", function(){ grid(); show("levels"); });
    
    bindClick("btn-next", function(){
        const nextId = current + 1;
        currentPage = Math.ceil(nextId / PER_PAGE);
        
        if (level(nextId)){
            start(nextId);
        } else {
            grid();
            show("levels");
        }
    });

    bindClick("btn-reset-data", function() {
        if (confirm("これまでのクリア履歴を消去してLevel 1からやり直しますか？")) {
            localStorage.removeItem("one-line-game-progress-v1");
            currentPage = 1;
            grid();
            alert("データを初期化しました。");
        }
    });

    bindClick("btn-clear-levels", function(){ grid(); show("levels"); });
    bindClick("btn-over-retry", function(){ start(current); });
    bindClick("btn-over-levels", function(){ grid(); show("levels"); });

    window.addEventListener("resize", function(){
        if (S.game && S.game.classList.contains("active")){
            renderer.resize();
            engine.render();
        }
    });

    // GameInput の初期化
    if (typeof GameInput !== "undefined") {
        new GameInput(canvas, engine, renderer);
    }

    drawLife(3);
    grid();
}