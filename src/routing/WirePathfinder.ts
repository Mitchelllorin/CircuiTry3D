export type GridPoint = { x: number; y: number };
export type GridCell = { occupied: boolean };

function heuristic(a: GridPoint, b: GridPoint): number {
  // Manhattan distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node: GridPoint, grid: GridCell[][]): GridPoint[] {
  const directions: GridPoint[] = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 }, // right
    { x: 0, y: 1 }, // down
    { x: -1, y: 0 }, // left
  ];

  const neighbors: GridPoint[] = [];
  for (const dir of directions) {
    const nx = node.x + dir.x;
    const ny = node.y + dir.y;
    if (grid[ny]?.[nx] && !grid[ny][nx].occupied) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

function reconstructPath(cameFrom: Map<string, GridPoint>, current: GridPoint): GridPoint[] {
  const path: GridPoint[] = [current];
  const key = (node: GridPoint) => `${node.x},${node.y}`;

  while (cameFrom.has(key(current))) {
    const prev = cameFrom.get(key(current));
    if (!prev) break;
    current = prev;
    path.unshift(current);
  }

  return path;
}

/**
 * A* pathfinding on a grid.
 * - `grid[y][x].occupied === true` blocks a cell
 * - Returns a list of points from start->goal inclusive, or null if no path.
 */
export function aStar(start: GridPoint, goal: GridPoint, grid: GridCell[][]): GridPoint[] | null {
  const openSet: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const key = (node: GridPoint) => `${node.x},${node.y}`;

  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, goal));

  while (openSet.length > 0) {
    openSet.sort(
      (a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity),
    );

    const current = openSet.shift();
    if (!current) break;

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, current);
    }

    for (const neighbor of getNeighbors(current, grid)) {
      const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
      const neighborKey = key(neighbor);

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));

        if (!openSet.some((n) => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null;
}

