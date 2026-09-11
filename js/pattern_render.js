function renderPreview() {
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ノード描画
  currentNodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x * canvas.width, n.y * canvas.height, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();
  });

  // エッジ描画
  currentEdges.forEach(([a, b]) => {
    const na = currentNodes[a];
    const nb = currentNodes[b];
    ctx.beginPath();
    ctx.moveTo(na.x * canvas.width, na.y * canvas.height);
    ctx.lineTo(nb.x * canvas.width, nb.y * canvas.height);
    ctx.strokeStyle = "#000";
    ctx.stroke();
  });
}
