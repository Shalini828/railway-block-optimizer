import csv
import hashlib
import io
import logging
import re
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
import psycopg
import os
from dotenv import load_dotenv

from auth.security import get_current_user, require_permission, CurrentUser
from auth.audit import record_audit
from auth.scoping import get_relevant_corridor_ids
from logic.traffic_intelligence import CANONICAL_TYPES

load_dotenv()

router = APIRouter(
    prefix="/trains",
    tags=["Trains"]
)


from db_config import DB_CONFIG

logger = logging.getLogger("trains")

TIMETABLE_REQUIRED_COLUMNS = {
    "train_number",
    "train_name",
    "train_type",
    "corridor_id",
    "travel_date",
    "arrival_time",
    "departure_time",
    "direction",
    "operational_priority",
}
TIMETABLE_OPTIONAL_COLUMNS = {"train_id"}
TIMETABLE_TYPES = CANONICAL_TYPES - {"SPECIAL"}
TIMETABLE_DIRECTIONS = {"UP", "DOWN"}
MAX_TIMETABLE_CSV_BYTES = 5 * 1024 * 1024
MAX_TIMETABLE_CSV_ROWS = 10_000
MAX_TIMETABLE_CSV_ERRORS = 100

FALLBACK_TRAINS = [
    {
        "train_id": "T01",
        "train_number": "12424",
        "train_name": "New Delhi - Dibrugarh Rajdhani Express",
        "train_type": "RAJDHANI",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "11:15:00",
        "departure_time": "11:20:00",
        "direction": "DOWN",
        "operational_priority": "10",
    },
    {
        "train_id": "T02",
        "train_number": "22436",
        "train_name": "Vande Bharat Express (NDLS-BSB)",
        "train_type": "VANDE_BHARAT",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "14:00:00",
        "departure_time": "14:05:00",
        "direction": "UP",
        "operational_priority": "10",
    },
    {
        "train_id": "T03",
        "train_number": "12560",
        "train_name": "Shiv Ganga Express",
        "train_type": "SUPERFAST",
        "corridor_id": "COR-002",
        "travel_date": "2026-10-19",
        "arrival_time": "19:55:00",
        "departure_time": "20:05:00",
        "direction": "DOWN",
        "operational_priority": "8",
    },
    {
        "train_id": "T04",
        "train_number": "BOXN-902",
        "train_name": "Freight Bulk Rake",
        "train_type": "GOODS",
        "corridor_id": "COR-001",
        "travel_date": "2026-10-19",
        "arrival_time": "02:30:00",
        "departure_time": "03:15:00",
        "direction": "UP",
        "operational_priority": "5",
    },
]


def get_connection():
    try:
        return psycopg.connect(**DB_CONFIG)
    except Exception:
        return None


def _safe_upload_filename(value: str) -> str:
    filename = re.split(r"[\\/]", value.strip())[-1]
    filename = "".join(char for char in filename if char >= " " and char != "\x7f")
    filename = filename[:255]
    if not filename or not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="X-Source-Filename must name a CSV file")
    return filename


def _stable_train_id(identity: tuple) -> str:
    """Build a stable 30-character ID from the documented timetable identity."""
    identity_text = "|".join(str(value) for value in identity)
    return "TRI-" + hashlib.sha256(identity_text.encode("utf-8")).hexdigest()[:26]


def _timetable_error(row: int, field: str, message: str) -> dict:
    return {"row": row, "field": field, "message": message}


def _parse_timetable_csv(content: bytes, filename: str) -> tuple[list[dict], str]:
    file_hash = hashlib.sha256(content).hexdigest()
    if len(content) > MAX_TIMETABLE_CSV_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "TIMETABLE_FILE_TOO_LARGE", "message": "CSV uploads are limited to 5 MiB."},
        )
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_TIMETABLE_CSV", "message": "CSV must use UTF-8 encoding.", "errors": [_timetable_error(1, "__file__", "Could not decode UTF-8 CSV.")]},
        ) from exc

    errors = []
    parsed_rows = []
    identities = {}
    train_ids = {}
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    try:
        headers = next(reader, None)
        if not headers:
            errors.append(_timetable_error(1, "__header__", "CSV header row is missing."))
        else:
            headers = [header.strip() for header in headers]
            duplicate_headers = sorted({header for header in headers if headers.count(header) > 1})
            if duplicate_headers:
                errors.append(_timetable_error(1, "__header__", f"Duplicate header(s): {', '.join(duplicate_headers)}."))
            missing = sorted(TIMETABLE_REQUIRED_COLUMNS - set(headers))
            unexpected = sorted(set(headers) - TIMETABLE_REQUIRED_COLUMNS - TIMETABLE_OPTIONAL_COLUMNS)
            if missing:
                errors.append(_timetable_error(1, "__header__", f"Missing required column(s): {', '.join(missing)}."))
            if unexpected:
                errors.append(_timetable_error(1, "__header__", f"Unsupported column(s): {', '.join(unexpected)}."))

            if not errors:
                for row_number, values in enumerate(reader, start=2):
                    if row_number > MAX_TIMETABLE_CSV_ROWS + 1:
                        errors.append(_timetable_error(row_number, "__file__", f"CSV exceeds the {MAX_TIMETABLE_CSV_ROWS:,}-row limit."))
                        break
                    if len(values) != len(headers):
                        errors.append(_timetable_error(row_number, "__row__", f"Expected {len(headers)} column values; received {len(values)}."))
                        continue

                    raw = {key: value.strip() for key, value in zip(headers, values)}
                    values_by_field = {}
                    for field in ("train_number", "train_name", "train_type", "corridor_id", "direction"):
                        value = raw.get(field, "")
                        if not value:
                            errors.append(_timetable_error(row_number, field, "This field is required."))
                        values_by_field[field] = value

                    train_number = values_by_field.get("train_number", "")
                    train_name = values_by_field.get("train_name", "")
                    train_type = values_by_field.get("train_type", "").upper()
                    corridor_id = values_by_field.get("corridor_id", "")
                    direction = values_by_field.get("direction", "").upper()
                    if len(train_number) > 20:
                        errors.append(_timetable_error(row_number, "train_number", "Maximum length is 20 characters."))
                    if len(train_name) > 150:
                        errors.append(_timetable_error(row_number, "train_name", "Maximum length is 150 characters."))
                    if len(train_type) > 30:
                        errors.append(_timetable_error(row_number, "train_type", "Maximum length is 30 characters."))
                    if train_type and train_type not in TIMETABLE_TYPES:
                        errors.append(_timetable_error(row_number, "train_type", f"Use one of {', '.join(sorted(TIMETABLE_TYPES))}; special services belong in Special Trains."))
                    if len(corridor_id) > 20:
                        errors.append(_timetable_error(row_number, "corridor_id", "Maximum length is 20 characters."))
                    if direction and direction not in TIMETABLE_DIRECTIONS:
                        errors.append(_timetable_error(row_number, "direction", "Use UP or DOWN."))

                    raw_date = raw.get("travel_date", "")
                    try:
                        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
                            raise ValueError("Expected YYYY-MM-DD.")
                        travel_date = date.fromisoformat(raw_date)
                    except ValueError:
                        travel_date = None
                        errors.append(_timetable_error(row_number, "travel_date", "Use a valid ISO date in YYYY-MM-DD format."))

                    parsed_times = {}
                    for field in ("arrival_time", "departure_time"):
                        raw_time = raw.get(field, "")
                        fmt = "%H:%M" if re.fullmatch(r"\d{2}:\d{2}", raw_time) else "%H:%M:%S"
                        try:
                            if not re.fullmatch(r"\d{2}:\d{2}(?::\d{2})?", raw_time):
                                raise ValueError("Expected HH:MM or HH:MM:SS.")
                            parsed_times[field] = datetime.strptime(raw_time, fmt).time()
                        except ValueError:
                            parsed_times[field] = None
                            errors.append(_timetable_error(row_number, field, "Use a valid 24-hour time in HH:MM or HH:MM:SS format (Asia/Kolkata local time)."))

                    raw_priority = raw.get("operational_priority", "")
                    try:
                        if not re.fullmatch(r"[1-5]", raw_priority):
                            raise ValueError("Expected an integer from 1 to 5.")
                        priority = int(raw_priority)
                    except ValueError:
                        priority = None
                        errors.append(_timetable_error(row_number, "operational_priority", "Use an integer from 1 to 5."))

                    supplied_id = raw.get("train_id", "").strip()
                    if supplied_id and len(supplied_id) > 30:
                        errors.append(_timetable_error(row_number, "train_id", "Maximum length is 30 characters."))
                    identity = None
                    if travel_date is not None and parsed_times.get("departure_time") is not None and train_number and corridor_id and direction:
                        identity = (train_number, corridor_id, travel_date, direction, parsed_times["departure_time"])
                    train_id = supplied_id or (_stable_train_id(identity) if identity else "")
                    if identity is not None:
                        if identity in identities:
                            errors.append(_timetable_error(row_number, "train_number", f"Duplicate service identity; first present on row {identities[identity]}."))
                        else:
                            identities[identity] = row_number
                    if train_id:
                        if train_id in train_ids:
                            errors.append(_timetable_error(row_number, "train_id", f"Duplicate train_id; first present on row {train_ids[train_id]}."))
                        else:
                            train_ids[train_id] = row_number

                    parsed_rows.append({
                        "row_number": row_number,
                        "train_id": train_id,
                        "train_number": train_number,
                        "train_name": train_name,
                        "train_type": train_type,
                        "corridor_id": corridor_id,
                        "travel_date": travel_date,
                        "arrival_time": parsed_times.get("arrival_time"),
                        "departure_time": parsed_times.get("departure_time"),
                        "direction": direction,
                        "operational_priority": priority,
                        "identity": identity,
                    })
                    if len(errors) >= MAX_TIMETABLE_CSV_ERRORS:
                        errors.append(_timetable_error(row_number, "__file__", f"Validation stopped after {MAX_TIMETABLE_CSV_ERRORS} errors."))
                        break
    except csv.Error as exc:
        errors.append(_timetable_error(getattr(reader, "line_num", 1) + 1, "__row__", f"Malformed CSV: {exc}."))

    if not parsed_rows and not errors:
        errors.append(_timetable_error(2, "__file__", "CSV contains no timetable rows."))
    if errors:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_TIMETABLE_CSV",
                "message": "No rows were imported. Correct every reported issue and resubmit the complete file.",
                "source_filename": filename,
                "sha256": file_hash,
                "errors": errors[:MAX_TIMETABLE_CSV_ERRORS],
            },
        )
    return parsed_rows, file_hash


async def _read_timetable_body(request: Request) -> bytes:
    chunks = []
    total_bytes = 0
    async for chunk in request.stream():
        total_bytes += len(chunk)
        if total_bytes > MAX_TIMETABLE_CSV_BYTES:
            raise HTTPException(
                status_code=413,
                detail={"code": "TIMETABLE_FILE_TOO_LARGE", "message": "CSV uploads are limited to 5 MiB."},
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _timetable_record_values(row: dict) -> tuple:
    return (
        row["train_id"], row["train_number"], row["train_name"], row["train_type"],
        row["corridor_id"], row["travel_date"], row["arrival_time"], row["departure_time"],
        row["direction"], row["operational_priority"],
    )


@router.post(
    "/import",
    dependencies=[Depends(require_permission("trains.edit"))],
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"text/csv": {"schema": {"type": "string", "format": "binary"}}},
        }
    },
)
async def import_trains_csv(
    request: Request,
    source_filename: str = Header(..., alias="X-Source-Filename"),
    source_reference: str = Header(..., alias="X-Source-Reference"),
    user: CurrentUser = Depends(get_current_user),
):
    """Import a complete operator-supplied CSV; times are Asia/Kolkata local wall-clock times.

    The source must assign the correct operating date for overnight services; this endpoint
    does not shift dates. Use X-Source-Filename and X-Source-Reference headers with a text/csv
    request body.
    """
    filename = _safe_upload_filename(source_filename)
    reference = source_reference.strip()
    if not reference or len(reference) > 250 or any(ord(char) < 32 for char in reference):
        raise HTTPException(status_code=400, detail="X-Source-Reference must contain a non-empty official source reference of at most 250 characters")
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "text/csv":
        raise HTTPException(status_code=415, detail="Upload the CSV body with Content-Type: text/csv")
    content = await _read_timetable_body(request)
    rows, file_hash = _parse_timetable_csv(content, filename)

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Timetable database is unavailable; no rows were imported")

    inserted_rows = []
    unchanged_count = 0
    try:
        with conn.cursor() as cursor:
            # Serialize regular-train import checks and writes without adding a schema object.
            cursor.execute("LOCK TABLE trains IN SHARE ROW EXCLUSIVE MODE")
            corridor_ids = sorted({row["corridor_id"] for row in rows})
            cursor.execute("SELECT corridor_id FROM corridors WHERE corridor_id = ANY(%s)", (corridor_ids,))
            known_corridors = {record[0] for record in cursor.fetchall()}
            corridor_errors = [
                _timetable_error(row["row_number"], "corridor_id", f"Unknown corridor_id {row['corridor_id']!r}; use an existing canonical corridor ID.")
                for row in rows if row["corridor_id"] not in known_corridors
            ]
            if corridor_errors:
                raise HTTPException(status_code=422, detail={
                    "code": "INVALID_TIMETABLE_CSV",
                    "message": "No rows were imported. Correct every reported corridor ID and resubmit the complete file.",
                    "source_filename": filename,
                    "sha256": file_hash,
                    "errors": corridor_errors[:MAX_TIMETABLE_CSV_ERRORS],
                })

            to_insert = []
            existing_conflicts = []
            for row in rows:
                cursor.execute("""
                    SELECT train_id, train_number, train_name, train_type, corridor_id,
                           travel_date, arrival_time, departure_time, direction, operational_priority
                    FROM trains
                    WHERE train_id = %s
                       OR (train_number = %s AND corridor_id = %s AND travel_date = %s
                           AND direction = %s AND departure_time = %s)
                    FOR UPDATE
                """, (
                    row["train_id"], row["train_number"], row["corridor_id"], row["travel_date"],
                    row["direction"], row["departure_time"],
                ))
                existing_rows = cursor.fetchall()
                incoming = _timetable_record_values(row)
                if not existing_rows:
                    to_insert.append(row)
                    continue
                if len(existing_rows) == 1 and tuple(existing_rows[0]) == incoming:
                    unchanged_count += 1
                    continue
                existing_conflicts.append(_timetable_error(
                    row["row_number"],
                    "train_id",
                    "This train_id or service identity already exists with different schedule data; no existing schedule was changed.",
                ))

            if existing_conflicts:
                raise HTTPException(status_code=409, detail={
                    "code": "TIMETABLE_IDENTITY_CONFLICT",
                    "message": "No rows were imported. Review the conflicting existing service identities before retrying.",
                    "source_filename": filename,
                    "sha256": file_hash,
                    "errors": existing_conflicts[:MAX_TIMETABLE_CSV_ERRORS],
                })

            for row in to_insert:
                cursor.execute("""
                    INSERT INTO trains (
                        train_id, train_number, train_name, train_type, corridor_id, travel_date,
                        arrival_time, departure_time, direction, operational_priority
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, _timetable_record_values(row))
                inserted_rows.append(row)

        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        logger.error(
            "Regular timetable CSV import failed filename=%s sha256=%s row_count=%d actor_role=%s error_type=%s",
            filename, file_hash, len(rows), user.role_id, type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Timetable import failed and the complete batch was rolled back") from exc
    finally:
        conn.close()

    imported_at = datetime.now(timezone.utc).isoformat()
    summary = {
        "status": "success",
        "source_filename": filename,
        "source_reference": reference,
        "imported_at": imported_at,
        "time_zone": "Asia/Kolkata",
        "operating_date_rule": "Use the source-provided Asia/Kolkata operating date; overnight dates are never shifted automatically.",
        "sha256": file_hash,
        "total_rows": len(rows),
        "inserted": len(inserted_rows),
        "unchanged": unchanged_count,
        "rejected": 0,
        "inserted_train_ids": [row["train_id"] for row in inserted_rows],
    }
    logger.info(
        "Regular timetable CSV import committed filename=%s imported_at=%s sha256=%s row_count=%d inserted=%d unchanged=%d actor_role=%s",
        filename, imported_at, file_hash, len(rows), len(inserted_rows), unchanged_count, user.role_id,
    )
    record_audit(
        actor_role=user.role_id,
        actor_name=user.name,
        method="POST",
        path="/trains/import",
        action="IMPORT_REGULAR_TRAIN_TIMETABLE",
        target_type="train_timetable_import",
        target_id=file_hash,
        outcome="SUCCESS",
        detail={
            "source_filename": filename,
            "source_reference": reference,
            "imported_at": imported_at,
            "sha256": file_hash,
            "total_rows": len(rows),
            "inserted": len(inserted_rows),
            "unchanged": unchanged_count,
            "rejected": 0,
        },
    )
    return summary


@router.get("", dependencies=[Depends(require_permission("trains.view"))])
@router.get("/", dependencies=[Depends(require_permission("trains.view"))])
def get_trains(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    if not conn:
        demo_trains = [{**t, "is_demo": True, "data_source": "SYNTHETIC_DEMO"} for t in FALLBACK_TRAINS]
        return {
            "status": "success",
            "is_demo": True,
            "data_source": "SYNTHETIC_DEMO",
            "train_count": len(demo_trains),
            "trains": demo_trains,
            "scope": user.scope,
            "department": user.dept,
        }

    try:
        cursor = conn.cursor()

        if user.scope != "network":
            relevant_corridors = get_relevant_corridor_ids(cursor, user.dept)
            if not relevant_corridors:
                cursor.close()
                conn.close()
                return {
                    "status": "success",
                    "is_demo": False,
                    "data_source": "POSTGRESQL",
                    "train_count": 0,
                    "trains": [],
                    "scope": user.scope,
                    "department": user.dept,
                }

            cursor.execute("""
                SELECT
                    train_id,
                    train_number,
                    train_name,
                    train_type,
                    corridor_id,
                    travel_date,
                    arrival_time,
                    departure_time,
                    direction,
                    operational_priority
                FROM trains
                WHERE corridor_id = ANY(%s)
                ORDER BY travel_date, departure_time
            """, (relevant_corridors,))
        else:
            cursor.execute("""
                SELECT
                    train_id,
                    train_number,
                    train_name,
                    train_type,
                    corridor_id,
                    travel_date,
                    arrival_time,
                    departure_time,
                    direction,
                    operational_priority
                FROM trains
                ORDER BY travel_date, departure_time
            """)

        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        cursor.close()
        trains = []
        for row in rows:
            train = {}
            for column, value in zip(columns, row):
                train[column] = str(value) if value is not None else None
            train["is_demo"] = False
            train["data_source"] = "POSTGRESQL"
            trains.append(train)

        return {
            "status": "success",
            "is_demo": False,
            "data_source": "POSTGRESQL",
            "train_count": len(trains),
            "trains": trains
        }
    except Exception as exc:
        print("Trains API info: Database query error, returning fallback trains:", repr(exc))
        demo_trains = [{**t, "is_demo": True, "data_source": "SYNTHETIC_DEMO"} for t in FALLBACK_TRAINS]
        return {
            "status": "success",
            "is_demo": True,
            "data_source": "SYNTHETIC_DEMO",
            "train_count": len(demo_trains),
            "trains": demo_trains,
            "scope": user.scope,
            "department": user.dept,
        }
    finally:
        if conn:
            conn.close()
