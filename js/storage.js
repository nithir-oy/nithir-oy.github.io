// storage.js
(function(){
  "use strict";
  var KEY = "one-line-game-progress-v1";

  function read(){
    try {
      var x = JSON.parse(localStorage.getItem(KEY) || "null");
      return (x && typeof x === "object") ? {
        unlocked: Math.max(1, Number(x.unlocked) || 1),
        cleared: Array.isArray(x.cleared) ? x.cleared : [],
        bestTimes: (x.bestTimes && typeof x.bestTimes === "object") ? x.bestTimes : {}
      } : { unlocked: 1, cleared: [], bestTimes: {} };
    } catch(e) {
      return { unlocked: 1, cleared: [], bestTimes: {} };
    }
  }

  function write(x){
    try { localStorage.setItem(KEY, JSON.stringify(x)); } catch(e){}
  }

  window.GameStorage = {
    getProgress: read,
    isUnlocked: function(n){ return n <= read().unlocked; },
    isCleared: function(n){ return read().cleared.indexOf(n) >= 0; },
    getBestTime: function(n){ return read().bestTimes[n] || null; },
    
    // クリア処理（新記録判定を行い、結果をオブジェクトで返す）
    clearLevel: function(n, time){
      var x = read();
      var isNewRecord = false;

      if (x.cleared.indexOf(n) < 0) x.cleared.push(n);
      if (n + 1 > x.unlocked) x.unlocked = n + 1;

      // タイム更新判定（過去記録がない、または今回のタイムが早い場合）
      var currentBest = x.bestTimes[n];
      if (currentBest === undefined || time < currentBest) {
        x.bestTimes[n] = time;
        isNewRecord = true;
      }

      write(x);
      return {
        isNewRecord: isNewRecord,
        bestTime: x.bestTimes[n]
      };
    }
  };
})();