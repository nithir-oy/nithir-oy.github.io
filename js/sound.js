// sound.js
(function(){
  "use strict";

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;

  function initCtx() {
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  }

  window.GameSound = {
    // 接続成功音（ポコッという軽いポップ音）
    playConnect: function() {
      initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // 周波数を一瞬で上げて「ポッ」と鳴らす
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  };
})();