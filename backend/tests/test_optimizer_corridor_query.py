import re
import unittest
from pathlib import Path

import psycopg
from db_config import DB_CONFIG

ROOT = Path(__file__).resolve().parents[2]


def table_columns(schema: str, table_name: str) -> set[str]:
    match = re.search(
        rf"CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?{re.escape(table_name)}\s*\((.*?)\n\s*\);",
        schema,
        re.IGNORECASE | re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"{table_name} is missing from the supported schema")
    return {
        column.lower()
        for column in re.findall(r"^\s{4}([a-z_][a-z0-9_]*)\s+", match.group(1), re.MULTILINE | re.IGNORECASE)
        if column.upper() not in {"CONSTRAINT", "PRIMARY", "UNIQUE", "CHECK", "FOREIGN"}
    }


class OptimizerCorridorQueryTests(unittest.TestCase):
    def test_ingestion_query_uses_supported_corridor_section_relationship(self):
        schema = "\n".join(
            [
                (ROOT / "railway_block_schema.sql").read_text(encoding="utf-8"),
                (ROOT / "backend/database/migrations/001_backend_foundation_v2.sql").read_text(encoding="utf-8"),
            ]
        )
        source = (ROOT / "backend/logic/block_optimizer.py").read_text(encoding="utf-8")
        query_match = re.search(
            r"cursor\.execute\(\s*\"\"\"(.*?)\"\"\"",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(query_match, "optimizer request ingestion query was not found")
        query = query_match.group(1)

        request_columns = table_columns(schema, "block_requests")
        section_columns = table_columns(schema, "corridor_sections")
        self.assertIn("corridor_id", request_columns)
        self.assertNotIn("section_id", request_columns)
        self.assertIn("corridor_id", section_columns)
        self.assertIn("section_id", section_columns)
        self.assertNotRegex(query, r"\bbr\.section_id\b")
        self.assertRegex(query, r"\bcs\.section_id\b")
        self.assertRegex(query, r"LEFT JOIN\s+LATERAL\s*\(")
        self.assertRegex(query, r"section\.corridor_id\s*=\s*br\.corridor_id")
        self.assertRegex(query, r"a\.location_km\s+BETWEEN\s+section\.from_km\s+AND\s+section\.to_km")
        self.assertRegex(query, r"COUNT\(\*\)\s+AS\s+match_count")

    def test_ingestion_query_prepares_against_live_database_schema(self):
        source = (ROOT / "backend/logic/block_optimizer.py").read_text(encoding="utf-8")
        query = re.search(r"cursor\.execute\(\s*\"\"\"(.*?)\"\"\"", source, re.DOTALL).group(1)
        try:
            with psycopg.connect(**DB_CONFIG) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("EXPLAIN " + query, ("PENDING", "APPROVED"))
                    self.assertTrue(cursor.fetchall())
        except psycopg.OperationalError as exc:
            self.skipTest(f"live PostgreSQL schema is unavailable: {exc.__class__.__name__}")


if __name__ == "__main__":
    unittest.main()
