"""Route optimization: TSP (/tsp/solve) and VRP (/vrp/solve)."""
from .helpers import tsp_points, vrp_payload


# --- TSP --------------------------------------------------------------------

def test_tsp_closed_loop(make_client):
    client, _main, headers = make_client(user="tspuser000000001")
    body = {"points": tsp_points(12), "return_to_start": True}
    r = client.post("/tsp/solve", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert len(d["route"]) == 13                 # 12 stops + return to start
    assert d["route"][0] == d["route"][-1]
    assert d["total_distance"] > 0
    assert d["improved_from"] >= d["total_distance"] - 1e-6  # 2-opt never worsens
    assert d["iterations"] >= 1
    assert len(d["legs"]) == 12


def test_tsp_open_path(make_client):
    client, _main, headers = make_client(user="tspuser000000002")
    body = {"points": tsp_points(10), "return_to_start": False}
    r = client.post("/tsp/solve", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert len(d["route"]) == 10                  # no return leg
    assert d["route"][0] != d["route"][-1] or len(set(d["route"])) == 10


def test_tsp_edge_two_points(make_client):
    client, _main, headers = make_client(user="tspuser000000003")
    body = {"points": tsp_points(2), "return_to_start": True}
    r = client.post("/tsp/solve", headers=headers, json=body)
    assert r.status_code == 200
    assert r.json()["total_distance"] > 0


def test_tsp_rejects_single_point(make_client):
    client, _main, headers = make_client(user="tspuser000000004")
    body = {"points": tsp_points(1)}
    r = client.post("/tsp/solve", headers=headers, json=body)
    assert r.status_code == 422  # min_length=2


def test_tsp_rejects_too_many_points(make_client):
    client, _main, headers = make_client(user="tspuser000000005")
    body = {"points": tsp_points(201)}
    r = client.post("/tsp/solve", headers=headers, json=body)
    assert r.status_code == 422  # max_length=200


# --- VRP --------------------------------------------------------------------

def test_vrp_happy_path(make_client):
    client, _main, headers = make_client(user="vrpuser000000001")
    body = vrp_payload(n_customers=9, capacity=15, num_vehicles=3, demand=3)
    r = client.post("/vrp/solve", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert d["vehicle_capacity"] == 15
    assert d["unserved"] == []                      # enough capacity for everyone
    assert len(d["routes"]) >= 1
    assert all(route["load"] <= 15 + 1e-9 for route in d["routes"])
    assert d["total_distance"] > 0
    # Count distinct customer stops (depot index 0 may bookend each route).
    served_customers = {
        idx
        for route in d["routes"]
        for idx in route["sequence"]
        if idx != 0
    }
    assert len(served_customers) + len(d["unserved"]) == 9


def test_vrp_demand_exceeds_capacity(make_client):
    client, _main, headers = make_client(user="vrpuser000000002")
    body = vrp_payload(n_customers=5, capacity=10, demand=20)  # 20 > 10
    r = client.post("/vrp/solve", headers=headers, json=body)
    assert r.status_code == 400


def test_vrp_rejects_zero_capacity(make_client):
    client, _main, headers = make_client(user="vrpuser000000003")
    body = vrp_payload(n_customers=5, capacity=10)
    body["vehicle_capacity"] = 0
    r = client.post("/vrp/solve", headers=headers, json=body)
    assert r.status_code == 422  # vehicle_capacity gt=0


def test_vrp_rejects_zero_vehicles(make_client):
    client, _main, headers = make_client(user="vrpuser000000004")
    body = vrp_payload(n_customers=5, capacity=10)
    body["num_vehicles"] = 0
    r = client.post("/vrp/solve", headers=headers, json=body)
    assert r.status_code == 422  # num_vehicles ge=1


def test_vrp_edge_single_customer(make_client):
    client, _main, headers = make_client(user="vrpuser000000005")
    body = vrp_payload(n_customers=1, capacity=10, demand=4)
    r = client.post("/vrp/solve", headers=headers, json=body)
    assert r.status_code == 200
    assert r.json()["unserved"] == []
