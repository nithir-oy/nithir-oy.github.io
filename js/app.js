// app.js（200問・50毎ページ送り・進行度ロック対応版）
function initApp() {
    "use strict";

    var S = {};
    ["title","howto","levels","game","clear","gameover"].forEach(function(n){
        S[n] = document.getElementById("screen-" + n);
    });

    function show(n){
        Object.keys(S).forEach(function(k){
            S[k].classList.toggle("active", k === n);
        });
    }

    function level(id){
        if (!LEVEL_SCHEMES || !LEVEL_SCHEMES[id - 1]) return null;
        return generateLevel(id);
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
        life.innerHTML = "";
        for (var i = 0; i < 3; i++){
            var s = document.createElement("span");
            s.className = "heart" + (i >= n ? " empty" : "");
            s.textContent = "♥";
            life.appendChild(s);
        }
    }

    function flash(t){
        msg.textContent = t;
        msg.classList.add("show");
        setTimeout(function(){
            msg.classList.remove("show");
        }, 450);
    }

    // ★ 50問ごとのページ切り替え ＆ 解放判定対応 grid()
    // ★ storage.js と完全に連携した grid()
    function grid(){
        var g = document.getElementById("level-grid");
        if (!g) return;
        g.innerHTML = "";

        // 表示範囲（1〜50, 51〜100, 101〜150, 151〜200）
        var startLevel = (currentPage - 1) * PER_PAGE + 1;
        var endLevel = Math.min(currentPage * PER_PAGE, TOTAL_LEVELS);

        for (var i = startLevel; i <= endLevel; i++){
            var b = document.createElement("button");
            
            // storage.js の isUnlocked(i) を直接呼び出して判定
            var has = (typeof GameStorage !== "undefined" && typeof GameStorage.isUnlocked === "function")
                ? GameStorage.isUnlocked(i)
                : (i === 1);

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
        level: function(n){ gameLevel.textContent = n; },
        failure: function(){ flash("MISS"); },
        
        // ★ クリア時に少し「間」を空けてから画面遷移するよう変更
        clear: function(r){
            engine.render();

            setTimeout(function(){
                // クリアタイム（秒）を渡し、新記録判定を取得
                var timeSec = Number(r.seconds.toFixed(2));
                var recordResult = GameStorage.clearLevel(r.level, timeSec);

                document.getElementById("clear-level").textContent = r.level;

                // 新記録通知バッジと表示メッセージの生成
                var recordBadge = recordResult.isNewRecord
                    ? '<span class="new-record-badge">NEW RECORD!</span><br>'
                    : '';

                var bestText = (recordResult.bestTime !== null)
                    ? recordResult.bestTime.toFixed(2) + " 秒"
                    : "-";

                document.getElementById("clear-stats").innerHTML =
                    recordBadge +
                    "クリアタイム：" + timeSec.toFixed(2) + " 秒<br>" +
                    "自己ベスト：" + bestText + "<br>" +
                    "失敗回数：" + r.failures + " 回";

                show("clear");
            }, 600);
        },
        
        gameOver: function(){
            document.getElementById("over-level").textContent = current;
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

    document.getElementById("btn-start").onclick = function(){ grid(); show("levels"); };
    document.getElementById("btn-howto").onclick = function(){ show("howto"); };
    document.getElementById("btn-howto-back").onclick = function(){ show("title"); };
    document.getElementById("btn-levels-home").onclick = function(){ show("title"); };
    document.getElementById("btn-game-restart").onclick = function(){ engine.load(engine.level); };
    document.getElementById("btn-game-levels").onclick = function(){ grid(); show("levels"); };
    document.getElementById("btn-next").onclick = function(){
        const nextId = current + 1;
        // クリア後に次のレベルへ進む際のページ切り替え
        currentPage = Math.ceil(nextId / PER_PAGE);
        
        if (level(nextId)){
            start(nextId);
        } else {
            grid();
            show("levels");
        }
    };
    document.getElementById("btn-reset-data").onclick = function() {
    if (confirm("これまでのクリア履歴を消去してLevel 1からやり直しますか？")) {
        localStorage.removeItem("one-line-game-progress-v1");
        currentPage = 1; // 1ページ目に戻す
        grid();          // グリッド再描画
        alert("データを初期化しました。");
        }
    };
    document.getElementById("btn-clear-levels").onclick = function(){ grid(); show("levels"); };
    document.getElementById("btn-over-retry").onclick = function(){ start(current); };
    document.getElementById("btn-over-levels").onclick = function(){ grid(); show("levels"); };

    window.addEventListener("resize", function(){
        if (S.game.classList.contains("active")){
            renderer.resize();
            engine.render();
        }
    });

    new GameInput(canvas, engine);

    drawLife(3);
    grid();
}