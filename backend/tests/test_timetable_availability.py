import unittest
from datetime import date

import psycopg
from db_config import DB_CONFIG
from logic.ir_abps_pipeline import (
    REGULAR_TIMETABLE_COUNT_SQL,
    SPECIAL_TIMETABLE_COUNT_SQL,
    count_timetable_records,
    require_timetable_availability,
)
from logic.traffic_intelligence import SPECIAL_TRAIN_TRAFFIC_SQL


class TimetableAvailabilityTests(unittest.TestCase):
    def test_counts_regular_and_scheduled_specials_for_corridor_and_date(self):
        class Cursor:
            def __init__(self):
                self.results = iter([(2,), (1,)])
                self.calls = []

            def execute(self, sql, params):
                self.calls.append((sql, params))

            def fetchone(self):
                return next(self.results)

        cursor = Cursor()
        service_date = date(2026, 8, 28)
        counts = count_timetable_records(cursor, "C01", service_date)

        self.assertEqual(counts, (2, 1))
        self.assertEqual([params for _, params in cursor.calls], [("C01", service_date)] * 2)
        self.assertEqual(cursor.calls[0][0], REGULAR_TIMETABLE_COUNT_SQL)
        self.assertEqual(cursor.calls[1][0], SPECIAL_TIMETABLE_COUNT_SQL)
        self.assertIn("status = 'SCHEDULED'", SPECIAL_TIMETABLE_COUNT_SQL)
        self.assertNotIn("active", SPECIAL_TIMETABLE_COUNT_SQL.lower())
        require_timetable_availability(*counts, "C01", service_date)

    def test_zero_rows_for_corridor_and_date_remain_unverified(self):
        class EmptyCursor:
            def __init__(self):
                self.calls = []

            def execute(self, sql, params):
                self.calls.append((sql, params))

            def fetchone(self):
                return (0,)

        cursor = EmptyCursor()
        service_date = date(2026, 8, 28)
        counts = count_timetable_records(cursor, "C03", service_date)
        self.assertEqual(counts, (0, 0))
        self.assertEqual([params for _, params in cursor.calls], [("C03", service_date)] * 2)
        with self.assertRaisesRegex(RuntimeError, "No train timetable rows"):
            require_timetable_availability(*counts, "C03", service_date)

    def test_timetable_queries_prepare_and_execute_on_the_live_schema(self):
        try:
            connection = psycopg.connect(**DB_CONFIG)
        except psycopg.OperationalError as exc:
            self.skipTest(f"live PostgreSQL schema is unavailable: {exc.__class__.__name__}")

        with connection:
            with connection.cursor() as cursor:
                for query in (
                    REGULAR_TIMETABLE_COUNT_SQL,
                    SPECIAL_TIMETABLE_COUNT_SQL,
                    SPECIAL_TRAIN_TRAFFIC_SQL,
                ):
                    cursor.execute("EXPLAIN " + query, ("C01", date(2026, 8, 28)))
                    self.assertTrue(cursor.fetchall())

                regular, special = count_timetable_records(
                    cursor, "C01", date(2026, 8, 28)
                )
                self.assertGreaterEqual(regular, 0)
                self.assertGreaterEqual(special, 0)

    def test_live_c03_lookup_on_2026_08_28_fails_closed_without_timetable_rows(self):
        try:
            connection = psycopg.connect(**DB_CONFIG)
        except psycopg.OperationalError as exc:
            self.skipTest(f"live PostgreSQL schema is unavailable: {exc.__class__.__name__}")

        with connection:
            with connection.cursor() as cursor:
                regular, special = count_timetable_records(
                    cursor, "C03", date(2026, 8, 28)
                )
        self.assertEqual((regular, special), (0, 0))
        with self.assertRaisesRegex(RuntimeError, "No train timetable rows"):
            require_timetable_availability(
                regular, special, "C03", date(2026, 8, 28)
            )


if __name__ == "__main__":
    unittest.main()
