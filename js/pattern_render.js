// pattern_render.js

function renderPreview() {
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentNodes || !currentEdges) return;

    // エッジ描画
    currentEdges.forEach(([a, b]) => {
        const na = currentNodes[a];
        const nb = currentNodes[b];
        if (!na || !nb) return;
        ctx.beginPath();
        ctx.moveTo(na.x * canvas.width, na.y * canvas.height);
        ctx.lineTo(nb.x * canvas.width, nb.y * canvas.height);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // ノード描画
    currentNodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x * canvas.width, n.y * canvas.height, 6, 0, Math.PI * 2);
        ctx.fillStyle = n.isForbidden ? "#888" : "#333";
        ctx.fill();
    });
}