# Vehicle Routing Problem

Multiple vehicles. One depot. Customers with demand. Vehicles have
capacity. Plan all the routes.

## Quick start

1. Open **Tools → Vehicle Routing** (`/tools/vrp`).
2. Set the depot: `name, x, y`.
3. Paste your customers — each line `name, x, y, demand`.
4. Adjust **Number of vehicles** and **Vehicle capacity** sliders.
5. Click **Plan routes**.

## Input format

```
# depot (single line)
Warehouse, 0, 0

# customers — name, x, y, demand
A, 4, 5, 2
B, -3, 6, 1
C, 7, 2, 3
```

- Demand defaults to 1 if omitted.
- Up to 200 customers per call.
- Up to 50 vehicles per call.

## How it works

1. **Clarke-Wright savings**: compute "savings" for merging each pair of
   single-stop routes; merge greedily while respecting vehicle capacity.
2. **Truncate to the fleet size**: if savings produces more routes than
   `num_vehicles` allows, keep the top-load routes and mark the rest as
   "unserved".
3. **Per-route 2-opt**: for each surviving route, run 2-opt on the
   interior stops (keeping the depot at start and end).

The result is a near-optimal solution for small-to-medium VRP instances
(up to ~100 customers) and a sensible heuristic for larger ones.

## Reading the output

- **Routes used** — how many vehicles were actually dispatched. Can be
  less than `num_vehicles` if the savings algorithm packed everyone into
  fewer routes.
- **Total distance** — sum of all vehicle distances.
- **Unserved** — customers the algorithm couldn't fit. To reduce this:
  increase capacity, increase fleet size, or split demand.
- **Route map** — each vehicle's path in its own colour. Yellow diamond
  is the depot. Red crosses are unserved customers.
- **Routes list** — full step-by-step for each vehicle: load, distance,
  and customer order.

## Tips

- Capacity × vehicles should comfortably exceed total demand. The
  workspace shows total demand under the **Total demand** KPI for
  convenience.
- If you have soft constraints like "vehicle 2 prefers the north side",
  reflect that by carefully ordering customers — the solver doesn't
  support explicit constraints beyond capacity.
- For production with hard time windows, you'll want a dedicated solver
  (OR-Tools, Optaplanner). This tool is meant for fast iterative planning
  of small fleets.

## API

`POST /api/vrp/solve`

```json
{
  "depot": { "name": "Warehouse", "x": 0, "y": 0 },
  "customers": [
    { "name": "A", "x": 4, "y": 5, "demand": 2 }
  ],
  "num_vehicles": 3,
  "vehicle_capacity": 8
}
```

Returns `{ routes: [...], total_distance, unserved: [...] }`.
