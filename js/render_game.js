// render_game.js

function renderPreviewGame() {
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!currentNodes || !currentEdges) return;

    // 1. エッジ（線）の描画（一方通行矢印・ダブルエッジ対応）
    currentEdges.forEach(([a, b, opt = {}]) => {
        const na = currentNodes[a];
        const nb = currentNodes[b];
        if (!na || !nb) return;

        const x1 = na.x * canvas.width;
        const y1 = na.y * canvas.height;
        const x2 = nb.x * canvas.width;
        const y2 = nb.y * canvas.height;

        const isDouble = opt.count === 2;
        const isOneWay = opt.dir === 1;

        ctx.strokeStyle = isDouble ? "#3182ce" : "#d1d5dc";
        ctx.lineWidth = isDouble ? 9 : 6;

        // エッジ線の描画
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 一方通行の矢印描画
        if (isOneWay) {
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const angle = Math.atan2(y2 - y1, x2 - x1);

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(angle);
            ctx.fillStyle = "#e53e3e";
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -6);
            ctx.lineTo(-6, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    });

    // 2. ノードの描画（ワープ・通行禁止対応）
    currentNodes.forEach((n, index) => {
        const x = n.x * canvas.width;
        const y = n.y * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);

        if (n.isForbidden) {
            ctx.fillStyle = "#a0aec0"; // 通行禁止（グレー）
        } else if (n.warpId) {
            ctx.fillStyle = "#805ad5"; // ワープ（紫色）
        } else {
            ctx.fillStyle = "#ef5b46"; // 通常（朱色）
        }
        ctx.fill();

        // 通行禁止の「×」マーク
        if (n.isForbidden) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
            ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
            ctx.stroke();
        } else {
            // ノード番号表示
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(index, x, y);
        }
    });

    // レベル表示
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("LEVEL " + currentLevel, canvas.width / 2, 10);
}