#!/usr/bin/env python3
"""Unit tests for build_roadtrip_route.py. No network.

    cd scripts && python3 -m unittest test_build_roadtrip_route -v
    python3 -m unittest scripts.test_build_roadtrip_route -v
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_roadtrip_route as brr


TRIP = """title: Big Bend Run
tagline: >-
  Austin to the desert and back.
intro:
  - >-
    We left at lat: first light and drove until the hills ran out. The lon of
    the drive was the point.
route:
  - [30.26715, -97.74306]
  - [30.10000, -97.90000]
stops:
  - title: Austin
    lat: 30.26715
    lon: -97.74306
    date: 2025-03-14
    blurb: Left town before the traffic woke up.
    images: []
  - title: Marfa
    lat: 30.30976
    lon: -104.02076
    date: 2025-03-15
    blurb: Cold night, clear sky.
    images: []
"""


def without_route(text):
    lines = text.split("\n")
    start = lines.index("route:")
    return "\n".join(lines[:start] + lines[start + 3:])


class TestScanStops(unittest.TestCase):
    def test_ignores_coordinates_in_intro_block_scalar(self):
        stops = brr.scan_stops(TRIP)
        self.assertEqual(len(stops), 2)
        self.assertEqual(stops[0].lat, 30.26715)
        self.assertEqual(stops[1].lon, -104.02076)

    def test_refuses_stop_missing_lon(self):
        text = TRIP.replace("    lon: -104.02076\n", "")
        with self.assertRaises(brr.Refused):
            brr.scan_stops(text)

    def test_refuses_two_top_level_stops_keys(self):
        with self.assertRaises(brr.Refused):
            brr.scan_stops(TRIP + "stops:\n  - title: Extra\n")

    def test_refuses_fewer_than_two_stops(self):
        one = TRIP.split("  - title: Marfa")[0]
        with self.assertRaises(brr.Refused):
            brr.scan_stops(one)

    def test_commented_out_coordinate_is_not_counted(self):
        text = TRIP.replace(
            "  - title: Marfa\n", "  # - title: Ghost\n  #   lat: 31.0\n"
            "  #   lon: -104.0\n  - title: Marfa\n")
        stops = brr.scan_stops(text)
        self.assertEqual(len(stops), 2)
        self.assertEqual([s.title for s in stops], ["Austin", "Marfa"])

    def test_refuses_missing_stops_block(self):
        with self.assertRaises(brr.Refused):
            brr.scan_stops("title: T\nroute:\n  - [1.0, 2.0]\n")


class TestBlockReplacement(unittest.TestCase):
    def test_replaces_only_the_route_span(self):
        out = brr.build_text(TRIP, [(31.0, -100.0), (32.0, -101.0)], 500)
        self.assertEqual(without_route(out), without_route(TRIP).replace(
            "title: Big Bend Run", "title: Big Bend Run\nmiles: 500"))

    def test_route_as_last_key_with_trailing_newline(self):
        text = "title: T\nstops:\n  - title: A\n    lat: 30.0\n    lon: -97.0\n" \
               "  - title: B\n    lat: 31.0\n    lon: -98.0\nroute:\n  - [0.0, 0.0]\n"
        out = brr.build_text(text, [(30.5, -97.5)], 10)
        self.assertTrue(out.endswith("  - [30.50000, -97.50000]\n"))
        self.assertEqual(out.count("route:"), 1)

    def test_route_as_last_key_without_trailing_newline(self):
        text = "title: T\nstops:\n  - title: A\n    lat: 30.0\n    lon: -97.0\n" \
               "  - title: B\n    lat: 31.0\n    lon: -98.0\nroute:\n  - [0.0, 0.0]"
        out = brr.build_text(text, [(30.5, -97.5)], 10)
        self.assertFalse(out.endswith("\n"))

    def test_appends_when_no_route_key(self):
        text = without_route(TRIP)
        out = brr.build_text(text, [(30.5, -97.5)], 10)
        self.assertEqual(out.count("\nroute:\n"), 1)
        self.assertIn("  - [30.50000, -97.50000]", out)

    def test_preserves_crlf(self):
        out = brr.build_text(TRIP.replace("\n", "\r\n"),
                             [(30.5, -97.5)], 10)
        self.assertNotIn("\n", out.replace("\r\n", ""))
        self.assertIn("  - [30.50000, -97.50000]\r\n", out)

    def test_trailing_comment_after_last_stop_is_not_swallowed(self):
        text = TRIP + "\n# hand note, keep me\n"
        out = brr.build_text(text, [(30.5, -97.5)], 10)
        self.assertTrue(out.endswith("\n# hand note, keep me\n"))

    def test_miles_is_replaced_not_duplicated(self):
        text = TRIP.replace("route:\n", "miles: 12\nroute:\n")
        out = brr.build_text(text, [(30.5, -97.5)], 1200)
        self.assertEqual(out.count("\nmiles:"), 1)
        self.assertIn("\nmiles: 1200\n", out)


class TestInvariants(unittest.TestCase):
    def test_two_route_keys_fail(self):
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, TRIP + "route:\n  - [1.0, 2.0]\n", 3)

    def test_changed_stop_coordinates_fail(self):
        bad = TRIP.replace("    lat: 30.26715", "    lat: 30.26716")
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, bad, 3)

    def test_line_count_identity_outside_the_span(self):
        bad = TRIP.replace("    blurb: Cold night, clear sky.\n", "")
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, bad, 3)

    def test_two_miles_keys_fail(self):
        bad = "miles: 1\nmiles: 2\n" + TRIP
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, bad, 3)

    def test_holds_on_a_re_run_where_miles_already_exists(self):
        once = brr.build_text(TRIP, [(30.5, -97.5), (31.0, -98.0)], 640)
        twice = brr.build_text(once, [(30.5, -97.5), (31.0, -98.0)], 640)
        brr.check_invariants(once, twice, 2)

    def test_route_last_with_trailing_newline_counts_points_correctly(self):
        text = "title: T\nstops:\n  - title: A\n    lat: 30.0\n    lon: -97.0\n" \
               "  - title: B\n    lat: 31.0\n    lon: -98.0\n"
        out = brr.build_text(text, [(30.5, -97.5), (30.6, -97.6)], 10)
        self.assertTrue(out.endswith("\n"))
        brr.check_invariants(text, out, 2)

    def test_wrong_point_count_fails(self):
        out = brr.build_text(TRIP, [(30.5, -97.5), (31.0, -98.0)], 640)
        with self.assertRaises(brr.Refused):
            brr.check_invariants(TRIP, out, 3)


class TestIdempotency(unittest.TestCase):
    def test_second_construction_is_byte_identical(self):
        once = brr.build_text(TRIP, [(30.5, -97.5), (31.25, -98.125)], 640)
        twice = brr.build_text(once, [(30.5, -97.5), (31.25, -98.125)], 640)
        self.assertEqual(once, twice)


class TestSimplify(unittest.TestCase):
    def test_straight_line_keeps_only_endpoints(self):
        pts = [(0.0, 0.0), (0.0, 1.0), (0.0, 2.0)]
        self.assertEqual(brr.simplify(pts, 0.001), [(0.0, 0.0), (0.0, 2.0)])

    def test_right_angle_keeps_all_three(self):
        pts = [(0.0, 0.0), (0.0, 1.0), (1.0, 1.0)]
        self.assertEqual(brr.simplify(pts, 0.001), pts)

    def test_reduces_a_noisy_line_and_keeps_endpoints(self):
        pts = [(i * 0.01, (i % 2) * 0.0001) for i in range(200)]
        out = brr.simplify(pts, 0.001)
        self.assertLess(len(out), len(pts))
        self.assertEqual(out[0], pts[0])
        self.assertEqual(out[-1], pts[-1])


class TestGeometry(unittest.TestCase):
    def test_flips_lon_lat_to_lat_lon(self):
        payload = {"code": "Ok", "routes": [{
            "distance": 100000.0,
            "geometry": {"coordinates": [[-97.74306, 30.26715],
                                         [-104.02076, 30.30976]]}}]}
        stops = brr.scan_stops(TRIP)
        route, meters = brr.route_from_payload(payload, stops)
        self.assertEqual(route[0], (30.26715, -97.74306))
        self.assertEqual(meters, 100000.0)
        self.assertTrue(all(29 < lat < 32 for lat, _ in route))

    def test_geometry_outside_the_padded_stop_box_refuses(self):
        payload = {"code": "Ok", "routes": [{
            "distance": 100000.0,
            "geometry": {"coordinates": [[-97.74306, 30.26715],
                                         [72.0, -5.0]]}}]}
        with self.assertRaises(brr.Refused):
            brr.route_from_payload(payload, brr.scan_stops(TRIP))


class TestOsrmErrors(unittest.TestCase):
    def test_no_route_names_a_stop(self):
        stops = brr.scan_stops(TRIP)
        with self.assertRaises(brr.Refused) as cm:
            brr.route_from_payload({"code": "NoRoute", "message": "no route"},
                                   stops)
        self.assertIn("Marfa", str(cm.exception))

    def test_invalid_query_suggests_the_swap(self):
        with self.assertRaises(brr.Refused) as cm:
            brr.route_from_payload({"code": "InvalidQuery"},
                                   brr.scan_stops(TRIP))
        self.assertIn("lon,lat", str(cm.exception))

    def test_too_big_suggests_fewer_waypoints(self):
        with self.assertRaises(brr.Refused) as cm:
            brr.route_from_payload({"code": "TooBig"}, brr.scan_stops(TRIP))
        self.assertIn("waypoints", str(cm.exception))

    def test_unknown_code_surfaces_the_server_message(self):
        with self.assertRaises(brr.Refused) as cm:
            brr.route_from_payload({"code": "Teapot", "message": "brewing"},
                                   brr.scan_stops(TRIP))
        self.assertIn("brewing", str(cm.exception))


class TestDateWarning(unittest.TestCase):
    def test_non_monotonic_dates_warn(self):
        stops = brr.scan_stops(TRIP.replace("date: 2025-03-15",
                                            "date: 2025-03-01"))
        self.assertIsNotNone(brr.date_warning(stops))

    def test_monotonic_dates_do_not_warn(self):
        self.assertIsNone(brr.date_warning(brr.scan_stops(TRIP)))


class TestWritePath(unittest.TestCase):
    def test_dry_run_leaves_the_file_byte_identical(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "trip.yaml"
            path.write_text(TRIP)
            brr.write_yaml(path, brr.build_text(TRIP, [(30.5, -97.5)], 10),
                           dry_run=True)
            self.assertEqual(path.read_text(), TRIP)

    def test_write_replaces_the_file_and_leaves_no_temp(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "trip.yaml"
            path.write_text(TRIP)
            new = brr.build_text(TRIP, [(30.5, -97.5)], 10)
            brr.write_yaml(path, new, dry_run=False, prettier=False)
            self.assertEqual(path.read_text(), new)
            self.assertEqual(os.listdir(d), ["trip.yaml"])


if __name__ == "__main__":
    unittest.main()
