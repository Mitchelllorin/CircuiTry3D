// src/logic/WirePathfinder.js
export function aStar(start, goal, grid) {
  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const key = (node) => `${node.x},${node.y}`;
  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, goal));

  while (openSet.length > 0) {
    openSet.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));
    const current = openSet.shift();
    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, current);
    }

    for (const neighbor of getNeighbors(current, grid)) {
      const tentativeG = gScore.get(key(current)) + 1;
      const neighborKey = key(neighbor);
      if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));
        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null; // No valid path
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
}

function getNeighbors(node, grid) {
  const directions = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 },  // right
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }  // left
  ];
  const neighbors = [];

  for (const dir of directions) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;
    if (grid[ny] && grid[ny][nx] && !grid[ny][nx].occupied) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(`${current.x},${current.y}`)) {
    current = cameFrom.get(`${current.x},${current.y}`);
    path.unshift(current);
  }
  return path;
}