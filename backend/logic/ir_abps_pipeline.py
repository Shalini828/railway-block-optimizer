"""Pure validation and compatibility rules for IR-ABPS demand planning."""

from __future__ import annotations

import re
from typing import Any


SUPPORTED_DEPARTMENTS = {"TMS", "SMMS", "TDMS"}


class InfeasibleOptimizationError(RuntimeError):
    """A plan cannot be produced safely from the available inputs."""

    def __init__(self, message: str, *, stage: str = "OPTIMIZATION", details: Any = None):
        super().__init__(message)
        self.stage = stage
        self.details = details


def chainage_interval(value: str | None) -> tuple[int, int] | None:
    """Parse railway chainage points such as ``KM 412/10 - 414/05``."""
    if not value:
        return None
    points = re.findall(r"(?i)(\d+)\s*/\s*(\d{1,3})", str(value))
    if not points:
        return None
    metres = [int(km) * 1000 + int(offset) for km, offset in points]
    if len(metres) == 1:
        return metres[0], metres[0]
    return min(metres), max(metres)


def track_scope(description: str | None) -> tuple[str | None, tuple[int, int] | None]:
    text = str(description or "")
    line_match = re.search(r"(?:^|\|)\s*Line:\s*([^|]+)", text, re.IGNORECASE)
    chainage_match = re.search(r"(?:^|\|)\s*Chainage:\s*([^|]+)", text, re.IGNORECASE)
    line = line_match.group(1).strip().casefold() if line_match else None
    interval = chainage_interval(chainage_match.group(1)) if chainage_match else None
    return line, interval


def validate_optimizer_requests(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Validate every PENDING row and return explicit exclusions by request ID."""
    valid: list[dict[str, Any]] = []
    excluded: list[dict[str, str]] = []
    seen: set[str] = set()

    for row in rows:
        request_id = str(row.get("request_id") or "").strip()
        reasons: list[str] = []
        if not request_id:
            reasons.append("missing request_id")
        elif request_id in seen:
            reasons.append("duplicate request_id in ingestion result")
        else:
            seen.add(request_id)

        if str(row.get("request_status") or "").strip().upper() != "PENDING":
            reasons.append("request_status is not PENDING")
        for field in ("task_id", "team_id", "corridor_id", "section_id", "requested_date", "requested_start", "requested_end", "block_type", "department", "asset_id"):
            if row.get(field) is None or str(row.get(field)).strip() == "":
                reasons.append(f"missing {field}")
        if str(row.get("department") or "").strip().upper() not in SUPPORTED_DEPARTMENTS:
            reasons.append("unsupported department")
        duration = row.get("requested_duration_min")
        if not isinstance(duration, (int, float)) or duration <= 0:
            reasons.append("requested duration must be positive")
        elif duration > 240:
            reasons.append("requested duration exceeds the configured 240-minute block limit")
        try:
            requested_start = _time_minutes(row.get("requested_start"))
            requested_end = _time_minutes(row.get("requested_end"))
            if requested_end <= requested_start:
                requested_end += 1440
            window_duration = requested_end - requested_start
            if window_duration <= 0:
                reasons.append("requested window must have positive duration")
            elif isinstance(duration, (int, float)) and abs(window_duration - duration) > 1:
                reasons.append("requested window duration does not match requested_duration_min")
        except (TypeError, ValueError, IndexError):
            reasons.append("requested start or end time is invalid")
        if row.get("section_id") and row.get("section_exists") is False:
            reasons.append("section does not exist")
        if row.get("corridor_exists") is False:
            reasons.append("corridor does not exist")
        if row.get("asset_exists") is False:
            reasons.append("asset does not exist")
        line, interval = track_scope(row.get("description"))
        if not line:
            reasons.append("missing track line in maintenance description")
        if interval is None:
            reasons.append("missing parseable chainage in maintenance description")

        if reasons:
            excluded.append({"request_id": request_id or "<missing>", "reason": "; ".join(dict.fromkeys(reasons))})
        else:
            valid.append(row)

    return valid, excluded


def require_timetable_availability(
    regular_train_count: int,
    special_train_count: int,
    corridor_id: str,
    service_date: Any,
) -> None:
    """Raise when the persisted timetable has no record for this route/date."""
    if int(regular_train_count or 0) + int(special_train_count or 0) <= 0:
        raise InfeasibleOptimizationError(
            f"No train timetable rows are available for corridor {corridor_id} on {service_date}; "
            "a conflict-free maintenance window cannot be verified.",
            stage="CORRIDOR_MATCHING",
            details={"corridor_id": corridor_id, "service_date": str(service_date)},
        )


def _time_minutes(value: Any) -> int:
    if hasattr(value, "hour") and hasattr(value, "minute"):
        return int(value.hour) * 60 + int(value.minute)
    parts = str(value).split(":")
    return int(parts[0]) * 60 + int(parts[1])


def group_compatible_requests(
    requests: list[dict[str, Any]],
    max_gap_minutes: int = 15,
    max_block_minutes: int = 240,
) -> list[dict[str, Any]]:
    """Cluster only requests with matching possession and overlapping track scope.

    Two or more tasks may share a block only when they share corridor, date,
    block type, track line, overlapping chainage, and compatible time windows.
    """
    groups: list[dict[str, Any]] = []
    ordered = sorted(
        requests,
        key=lambda row: (str(row.get("corridor_id")), str(row.get("requested_date")), _time_minutes(row.get("requested_start")), str(row.get("request_id"))),
    )
    for row in ordered:
        line, interval = track_scope(row.get("description"))
        start = _time_minutes(row["requested_start"])
        end = _time_minutes(row["requested_end"])
        if end <= start:
            end += 1440
        department = str(row.get("department") or "").strip().upper()
        placed = False

        for group in groups:
            if (
                group["corridor_id"] != row.get("corridor_id")
                or group["requested_date"] != row.get("requested_date")
                or group["block_type"] != str(row.get("block_type") or "").strip().casefold()
                or not line
                or line != group["line"]
                or interval is None
            ):
                continue

            current_start, current_end = group["chainage_interval"]
            chainage_overlap = max(current_start, interval[0]) <= min(current_end, interval[1])
            if not chainage_overlap:
                continue

            gap = max(0, start - group["end_minutes"], group["start_minutes"] - end)
            combined_start = min(group["start_minutes"], start)
            combined_end = max(group["end_minutes"], end)
            if gap > max_gap_minutes or combined_end - combined_start > max_block_minutes:
                continue

            team_conflict = False
            for existing in group["requests"]:
                if str(existing.get("team_id")) != str(row.get("team_id")):
                    continue
                existing_start = _time_minutes(existing["requested_start"])
                existing_end = _time_minutes(existing["requested_end"])
                if existing_end <= existing_start:
                    existing_end += 1440
                if max(start, existing_start) < min(end, existing_end):
                    team_conflict = True
                    break
            if team_conflict:
                continue

            group["requests"].append(row)
            group["departments"].add(department)
            group["start_minutes"] = combined_start
            group["end_minutes"] = combined_end
            group["chainage_interval"] = (max(current_start, interval[0]), min(current_end, interval[1]))
            placed = True
            break

        if not placed:
            groups.append({
                "corridor_id": row.get("corridor_id"),
                "requested_date": row.get("requested_date"),
                "block_type": str(row.get("block_type") or "").strip().casefold(),
                "line": line,
                "chainage_interval": interval,
                "start_minutes": start,
                "end_minutes": end,
                "requests": [row],
                "departments": {department},
            })

    for index, group in enumerate(groups, start=1):
        group["cluster_id"] = f"CL-{group['corridor_id']}-{group['requested_date']}-{index:03d}"
        group["departments"] = sorted(group["departments"])
        group["request_ids"] = [str(row["request_id"]) for row in group["requests"]]
        group["cross_department"] = len(group["departments"]) > 1
        group["reasons"] = [
            "Same corridor and date",
            "Same block type and track line",
            "Overlapping chainage",
            f"Compatible requested windows (maximum gap {max_gap_minutes} minutes)",
        ]
    return groups


def validate_request_coverage(expected_ids: list[str], assigned_ids: list[str]) -> dict[str, list[str]]:
    expected = [str(value) for value in expected_ids]
    assigned = [str(value) for value in assigned_ids]
    return {
        "missing": sorted(set(expected) - set(assigned)),
        "unexpected": sorted(set(assigned) - set(expected)),
        "duplicates": sorted({value for value in assigned if assigned.count(value) > 1}),
    }


def maintenance_windows_conflict(candidate: dict[str, Any], scheduled: dict[str, Any]) -> bool:
    """Check incompatible possession windows on the same track and chainage."""
    if (
        candidate.get("corridor") != scheduled.get("corridor")
        or candidate.get("date") != scheduled.get("date")
        or candidate.get("line") != scheduled.get("line")
    ):
        return False
    first_interval = candidate.get("chainage_interval")
    second_interval = scheduled.get("chainage_interval")
    if not first_interval or not second_interval:
        return True
    chainage_overlaps = max(first_interval[0], second_interval[0]) <= min(first_interval[1], second_interval[1])
    time_overlaps = max(candidate["start_minutes"], scheduled["start_minutes"]) < min(candidate["end_minutes"], scheduled["end_minutes"])
    return chainage_overlaps and time_overlaps


def select_conflict_free_candidate(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Return highest-scoring verified, conflict-free candidate or None."""
    safe = [
        candidate for candidate in candidates
        if candidate.get("conflict_check_status") == "VERIFIED"
        and int(candidate.get("conflict_count", len(candidate.get("conflicts", []))) or 0) == 0
    ]
    if not safe:
        return None
    return max(
        safe,
        key=lambda candidate: (
            float(candidate.get("score", 0)),
            -int(candidate.get("conflict_count", 0) or 0),
            str(candidate.get("start", "")),
        ),
    )
