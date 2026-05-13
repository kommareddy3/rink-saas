# Travelling Salesman Problem

Given N locations, find the shortest route that visits each exactly once.
Solved with nearest-neighbor (for a fast starting solution) followed by
2-opt local search.

## Quick start

1. Open **Tools → TSP** (`/tools/tsp`).
2. Edit the locations textarea. Each line is `name, x, y` — name is
   optional, coordinates are required.
3. Toggle **Return to start** if you want a closed loop (most logistics
   cases) vs an open path.
4. Click **Find shortest route**.

## Input format

```
name, x, y
Warehouse, 0, 0
StopA, 10, 5
StopB, 7, 12
```

- Lines starting with `#` are treated as comments.
- Tab- or comma-separated.
- Up to 200 locations per call.

Coordinates can be:
- **Latitude / longitude** — RINK uses straight-line distance, which is a
  reasonable approximation over small areas.
- **Cartesian** (e.g. floor-plan coordinates).
- **Projected** coordinates (UTM, etc.).

For large geographic distances you should pre-project lat/lon to a metric
CRS for accurate distances.

## How it works

1. **Nearest neighbour**: start at point 0, always move to the closest
   unvisited point. Fast but typically 25-30% longer than optimal.
2. **2-opt local search**: repeatedly check whether reversing any segment
   of the route would shorten it; accept improvements. Continues until no
   improvement is found.

For 50–100 locations this completes in well under a second.

## Reading the output

- **Total distance** — sum of straight-line distances along the route.
- **Improvement** — how much shorter the 2-opt result is vs the
  nearest-neighbor start. Bigger numbers mean a worse starting solution
  that 2-opt rescued.
- **Route map** — purple polyline shows the order; hover any point for
  its coordinates and step number.
- **Route order list** — left column shows the sequence.

## Limits and caveats

- **Symmetric distances only**: A→B is assumed to cost the same as B→A.
  If you have one-way streets or asymmetric travel times, you'd need a
  different solver.
- **No time windows**: every stop is reachable at any time.
- **No pickup/delivery constraints**.
- For >150 points, 2-opt's `O(n²)` inner loop starts getting slow. Use
  more sophisticated solvers for production-scale problems.

## API

`POST /api/tsp/solve`

```json
{
  "points": [
    { "name": "Warehouse", "x": 0, "y": 0 },
    { "name": "StopA", "x": 10, "y": 5 }
  ],
  "return_to_start": true
}
```

Returns the optimized route, total distance, leg-by-leg breakdown, and
the starting nearest-neighbor distance so you can see how much 2-opt
improved.
