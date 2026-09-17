#!/usr/bin/env python3
"""Unit tests for build_roadtrip_route.py. No network.

    cd scripts && python3 -m unittest test_build_roadtrip_route -v
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_roadtrip_route as brr


TRIP = """title: Big Bend Run
intro:
  - >-
    We left at lat: first light and drove until the hills ran out.
route:
  - [30.26715, -97.74306]
  - [30.10000, -97.90000]
stops:
  - title: Austin
    lat: 30.26715
    lon: -97.74306
    date: 2025-03-14
    blurb: Left town before the traffic woke up.
  - title: Marfa
    lat: 30.30976
    lon: -104.02076
    via:
      - [30.1, -101.0]
    date: 2025-03-15
    blurb: Cold night, clear sky.
"""

ROUTE = [(30.26715, -97.74306), (30.1, -101.0), (30.30976, -104.02076)]


class TestScan(unittest.TestCase):
    def test_reads_stops_and_via_but_not_the_intro(self):
        stops = brr.scan_stops(TRIP)
        self.assertEqual([s.title for s in stops], ["Austin", "Marfa"])
        self.assertEqual(stops[1].via, [(30.1, -101.0)])
        self.assertIn("-97.74306,30.26715;-101.0,30.1;-104.02076,30.30976",
                      brr.osrm_url("https://x", stops))

    def test_refuses_a_stop_missing_lon(self):
        with self.assertRaises(brr.Refused):
            brr.scan_stops(TRIP.replace("    lon: -104.02076\n", ""))


class TestWrite(unittest.TestCase):
    def test_rewrites_only_route_and_miles_and_is_idempotent(self):
        once = brr.build_text(TRIP, ROUTE, 400)
        twice = brr.build_text(once, ROUTE, 400)
        brr.check_invariants(TRIP, once, len(ROUTE))
        self.assertEqual(once, twice)
        self.assertIn("miles: 400\n", once)
        self.assertIn("  - [30.10000, -101.00000]\n", once)
        self.assertNotIn("[30.10000, -97.90000]", once)

    def test_appends_route_when_the_key_is_absent(self):
        text = "\n".join(l for l in TRIP.split("\n")
                         if not l.startswith(("route:", "  - [")))
        out = brr.build_text(text, ROUTE, 400)
        self.assertEqual(len(brr.top_level_block(brr.split_lines(out), "route")),
                         len(ROUTE) + 1)

    def test_refuses_when_a_stop_line_changed(self):
        broken = brr.build_text(TRIP, ROUTE, 400).replace("30.30976", "30.3")
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, broken, len(ROUTE))


class TestGeometry(unittest.TestCase):
    def test_flips_osrm_lon_lat_and_refuses_points_far_from_the_stops(self):
        stops = brr.scan_stops(TRIP)
        payload = {"code": "Ok", "routes": [{"distance": 1000.0, "geometry": {
            "coordinates": [[-97.74306, 30.26715], [-104.02076, 30.30976]]}}]}
        route, meters = brr.route_from_payload(payload, stops)
        self.assertEqual(route[0], (30.26715, -97.74306))
        self.assertEqual(meters, 1000.0)
        payload["routes"][0]["geometry"]["coordinates"][1] = [30.3, -104.0]
        with self.assertRaises(brr.Refused):
            brr.route_from_payload(payload, stops)

    def test_simplify_drops_collinear_points_only(self):
        line = [(0, 0), (1, 0.00001), (2, 0)]
        self.assertEqual(brr.simplify(line, 0.001), [(0, 0), (2, 0)])
        corner = [(0, 0), (1, 0), (1, 1)]
        self.assertEqual(brr.simplify(corner, 0.001), corner)

    def test_osrm_errors_refuse_with_the_server_message(self):
        with self.assertRaises(brr.Refused) as ctx:
            brr.route_from_payload({"code": "NoRoute", "message": "nope"},
                                   brr.scan_stops(TRIP))
        self.assertIn("nope", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
