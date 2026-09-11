/*
 * Level data schema
 * x/y are normalized 0..1 coordinates.
 * edges are undirected and may be used only once.
 */
window.LEVELS = [
  {
    id: 1,
    nodes: [
      {id:0, x:.20, y:.24},
      {id:1, x:.80, y:.24},
      {id:2, x:.50, y:.52}
    ],
    edges: [[0,1],[1,2],[2,0]],
    solution: [0,1,2,0]
  },

  /*
   * Level 2 FIX:
   * A simple square. Every node has degree 2, so an Euler circuit exists.
   * One valid solution is 0 -> 1 -> 2 -> 3 -> 0.
   */
  {
    id: 2,
    nodes: [
      {id:0, x:.22, y:.22},
      {id:1, x:.78, y:.22},
      {id:2, x:.78, y:.78},
      {id:3, x:.22, y:.78}
    ],
    edges: [[0,1],[1,2],[2,3],[3,0]],
    solution: [0,1,2,3,0]
  },

  {
    id: 3,
    nodes: [
      {id:0, x:.18, y:.18},
      {id:1, x:.50, y:.12},
      {id:2, x:.82, y:.18},
      {id:3, x:.76, y:.50},
      {id:4, x:.82, y:.82},
      {id:5, x:.50, y:.88},
      {id:6, x:.18, y:.82},
      {id:7, x:.24, y:.50}
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,3],[3,6],[6,1],[1,4],[4,7],[7,2],[2,5],[5,0]],
    solution: [0,1,2,3,4,5,6,7,0,3,6,1,4,7,2,5,0]
  }
];
