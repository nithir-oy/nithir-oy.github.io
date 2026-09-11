function renderPreviewGame() {
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  // 背景（白）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // エッジ（#d1d5dc、太さ7px）
  ctx.strokeStyle = "#d1d5dc";
  ctx.lineWidth = 7;
  currentEdges.forEach(([a, b]) => {
    const na = currentNodes[a];
    const nb = currentNodes[b];
    ctx.beginPath();
    ctx.moveTo(na.x * canvas.width, na.y * canvas.height);
    ctx.lineTo(nb.x * canvas.width, nb.y * canvas.height);
    ctx.stroke();
  });

  // ノード（#ef5b46、半径11px、枠線なし）
  currentNodes.forEach((n, index) => {
    const x = n.x * canvas.width;
    const y = n.y * canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#ef5b46";
    ctx.fill();

    // ノード番号（中央）
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(index, x, y);
  });

  // レベル表示（上部中央）
  const levelText = "LEVEL " + currentLevel;
  ctx.fillStyle = "#333";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(levelText, canvas.width / 2, 10);
}
