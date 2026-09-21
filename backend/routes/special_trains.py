from typing import Optional, List, Dict, Any
from datetime import datetime, date, time, timedelta

import psycopg
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field

from db_config import DB_CONFIG
from auth.security import get_current_user, require_permission, CurrentUser
from auth.scoping import get_relevant_corridor_ids
from auth.audit import record_audit
from logic.traffic_intelligence import (
    windows_overlap,
    time_to_minutes,
    minutes_to_time_str,
    load_traffic_for_day,
)

router = APIRouter(
    prefix="/special-trains",
    tags=["Special Trains"],
)

VALID_SPECIAL_TYPES = {
    "FESTIVAL",
    "HOLIDAY",
    "EVENT",
    "MILITARY",
    "RELIEF",
    "SEASONAL",
    "OTHER",
}

VALID_DIRECTIONS = {"UP", "DOWN"}


class SpecialTrainCreateSchema(BaseModel):
    train_number: str = Field(..., min_length=1, max_length=30)
    train_name: str = Field(..., min_length=1, max_length=150)
    special_type: str
    corridor_id: str
    service_date: Optional[str] = None
    service_date_from: Optional[str] = None
    service_date_to: Optional[str] = None
    arrival_time: str
    departure_time: str
    direction: str = "UP"
    operational_priority: int = Field(4, ge=1, le=5)
    expected_passengers: int = Field(0, ge=0)
    reason: Optional[str] = None
    origin_station: Optional[str] = None
    destination_station: Optional[str] = None
    active: bool = True


class SpecialTrainUpdateSchema(BaseModel):
    train_number: Optional[str] = None
    train_name: Optional[str] = None
    special_type: Optional[str] = None
    corridor_id: Optional[str] = None
    service_date: Optional[str] = None
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    direction: Optional[str] = None
    operational_priority: Optional[int] = Field(None, ge=1, le=5)
    expected_passengers: Optional[int] = Field(None, ge=0)
    reason: Optional[str] = None
    origin_station: Optional[str] = None
    destination_station: Optional[str] = None
    active: Optional[bool] = None


class ActiveToggleSchema(BaseModel):
    active: bool


def _parse_time(value):
    if isinstance(value, time):
        return value

    value = str(value).strip()

    if len(value) == 5:
        value += ":00"

    return datetime.strptime(value[:8], "%H:%M:%S").time()


def _parse_date(value):
    if isinstance(value, date):
        return value

    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _generate_special_id(cur):
    cur.execute("""
        SELECT special_id
        FROM special_train_services
        WHERE special_id LIKE 'SP-AUTO-%'
        ORDER BY special_id DESC
        LIMIT 1
    """)

    row = cur.fetchone()

    if not row:
        return "SP-AUTO-001"

    try:
        number = int(row[0].split("-")[-1]) + 1
    except Exception:
        number = 1

    return f"SP-AUTO-{number:03d}"


def _format_special(row):
    """
    Convert current DB schema into the response schema
    expected by the existing frontend.
    """

    (
        special_id,
        train_number,
        train_name,
        event_name,
        event_type,
        corridor_id,
        service_date,
        departure_time,
        arrival_time,
        direction,
        operational_priority,
        status_value,
    ) = row

    return {
        "special_train_id": special_id,
        "train_number": train_number,
        "train_name": train_name,

        # Frontend-compatible aliases
        "special_type": event_type or "OTHER",
        "corridor_id": corridor_id,
        "service_date": str(service_date),

        "arrival_time": str(arrival_time) if arrival_time else None,
        "departure_time": str(departure_time) if departure_time else None,

        "direction": direction,
        "operational_priority": operational_priority,

        # These aren't stored in current DB schema
        "expected_passengers": 0,
        "reason": event_name,
        "active": status_value == "SCHEDULED",

        "origin_station": None,
        "destination_station": None,
        "created_by": None,
        "created_at": None,
        "updated_at": None,
    }


# ============================================================
# GET ALL SPECIAL TRAINS
# ============================================================

@router.get(
    "/",
    dependencies=[Depends(require_permission("special_trains.view"))],
)
def get_special_trains(
    corridor_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    active: Optional[bool] = Query(None),
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            allowed_corridors = None

            if user.scope != "network":
                allowed_corridors = get_relevant_corridor_ids(
                    cur,
                    user.dept,
                )

                if not allowed_corridors:
                    return {
                        "status": "success",
                        "total_count": 0,
                        "special_trains": [],
                    }

            query = """
                SELECT
                    special_id,
                    train_number,
                    train_name,
                    event_name,
                    event_type,
                    corridor_id,
                    service_date,
                    departure_time,
                    arrival_time,
                    direction,
                    operational_priority,
                    status
                FROM special_train_services
                WHERE 1=1
            """

            params = []

            if allowed_corridors is not None:
                query += " AND corridor_id = ANY(%s)"
                params.append(allowed_corridors)

            if corridor_id:
                query += " AND corridor_id = %s"
                params.append(corridor_id)

            if from_date:
                query += " AND service_date >= %s"
                params.append(_parse_date(from_date))

            if to_date:
                query += " AND service_date <= %s"
                params.append(_parse_date(to_date))

            if active is not None:
                if active:
                    query += " AND status = 'SCHEDULED'"
                else:
                    query += " AND status <> 'SCHEDULED'"

            query += """
                ORDER BY service_date ASC,
                         departure_time ASC
            """

            cur.execute(query, params)

            rows = cur.fetchall()

            items = [
                _format_special(row)
                for row in rows
            ]

            return {
                "status": "success",
                "total_count": len(items),
                "special_trains": items,
            }


# ============================================================
# GET ONE SPECIAL TRAIN
# ============================================================

@router.get(
    "/{special_train_id}",
    dependencies=[Depends(require_permission("special_trains.view"))],
)
def get_special_train(
    special_train_id: str,
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    special_id,
                    train_number,
                    train_name,
                    event_name,
                    event_type,
                    corridor_id,
                    service_date,
                    departure_time,
                    arrival_time,
                    direction,
                    operational_priority,
                    status
                FROM special_train_services
                WHERE special_id = %s
            """, (special_train_id,))

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Special train {special_train_id} not found",
                )

            if user.scope != "network":
                allowed = get_relevant_corridor_ids(
                    cur,
                    user.dept,
                )

                if row[5] not in allowed:
                    raise HTTPException(
                        status_code=403,
                        detail="Corridor outside department scope",
                    )

            return {
                "status": "success",
                "special_train": _format_special(row),
            }


# ============================================================
# CREATE SPECIAL TRAIN
# ============================================================

@router.post(
    "/",
    dependencies=[Depends(require_permission("special_trains.manage"))],
    status_code=status.HTTP_201_CREATED,
)
def create_special_train(
    payload: SpecialTrainCreateSchema,
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            # Validate corridor
            cur.execute(
                "SELECT corridor_id FROM corridors WHERE corridor_id = %s",
                (payload.corridor_id,),
            )

            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail=f"Corridor '{payload.corridor_id}' does not exist",
                )

            event_type = payload.special_type.strip().upper()

            if event_type not in VALID_SPECIAL_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid special_type '{payload.special_type}'",
                )

            direction = payload.direction.strip().upper()

            if direction not in VALID_DIRECTIONS:
                raise HTTPException(
                    status_code=400,
                    detail="Direction must be UP or DOWN",
                )

            try:
                arrival = _parse_time(payload.arrival_time)
                departure = _parse_time(payload.departure_time)
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time format. Use HH:MM or HH:MM:SS",
                )

            # Dates
            dates = []

            if payload.service_date_from and payload.service_date_to:

                start = _parse_date(payload.service_date_from)
                end = _parse_date(payload.service_date_to)

                if end < start:
                    raise HTTPException(
                        status_code=400,
                        detail="service_date_to cannot be before service_date_from",
                    )

                current = start

                while current <= end:
                    dates.append(current)
                    current += timedelta(days=1)

            elif payload.service_date:

                dates.append(
                    _parse_date(payload.service_date)
                )

            else:
                raise HTTPException(
                    status_code=400,
                    detail="Provide service_date or service_date_from/service_date_to",
                )

            created_ids = []

            for service_date in dates:

                # Duplicate check
                cur.execute("""
                    SELECT special_id
                    FROM special_train_services
                    WHERE train_number = %s
                      AND corridor_id = %s
                      AND service_date = %s
                """, (
                    payload.train_number.strip(),
                    payload.corridor_id,
                    service_date,
                ))

                if cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Train {payload.train_number} already exists "
                            f"on {service_date}"
                        ),
                    )

                special_id = _generate_special_id(cur)

                status_value = (
                    "SCHEDULED"
                    if payload.active
                    else "INACTIVE"
                )

                cur.execute("""
                    INSERT INTO special_train_services (
                        special_id,
                        train_number,
                        train_name,
                        event_name,
                        event_type,
                        corridor_id,
                        service_date,
                        departure_time,
                        arrival_time,
                        direction,
                        operational_priority,
                        status
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s
                    )
                """, (
                    special_id,
                    payload.train_number.strip(),
                    payload.train_name.strip(),
                    payload.reason,
                    event_type,
                    payload.corridor_id,
                    service_date,
                    departure,
                    arrival,
                    direction,
                    payload.operational_priority * 20,
                    status_value,
                ))

                created_ids.append(special_id)

                record_audit(
                    actor_role=user.role_id,
                    actor_name=user.name,
                    method="POST",
                    path="/special-trains",
                    action="CREATE_SPECIAL_TRAIN",
                    target_type="special_train",
                    target_id=special_id,
                    outcome="SUCCESS",
                    detail={
                        "train_number": payload.train_number,
                        "corridor_id": payload.corridor_id,
                        "service_date": str(service_date),
                        "event_type": event_type,
                    },
                )

            conn.commit()

            return {
                "status": "success",
                "message": (
                    f"Successfully created "
                    f"{len(created_ids)} special train service(s)"
                ),
                "created_count": len(created_ids),
                "created_ids": created_ids,
            }


# ============================================================
# UPDATE
# ============================================================

@router.put(
    "/{special_train_id}",
    dependencies=[Depends(require_permission("special_trains.manage"))],
)
def update_special_train(
    special_train_id: str,
    payload: SpecialTrainUpdateSchema,
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT special_id
                FROM special_train_services
                WHERE special_id = %s
            """, (special_train_id,))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"Special train {special_train_id} not found",
                )

            updates = []
            params = []

            if payload.train_number is not None:
                updates.append("train_number = %s")
                params.append(payload.train_number.strip())

            if payload.train_name is not None:
                updates.append("train_name = %s")
                params.append(payload.train_name.strip())

            if payload.special_type is not None:

                value = payload.special_type.strip().upper()

                if value not in VALID_SPECIAL_TYPES:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid special_type",
                    )

                updates.append("event_type = %s")
                params.append(value)

            if payload.corridor_id is not None:

                cur.execute(
                    "SELECT corridor_id FROM corridors WHERE corridor_id = %s",
                    (payload.corridor_id,),
                )

                if not cur.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Corridor does not exist",
                    )

                updates.append("corridor_id = %s")
                params.append(payload.corridor_id)

            if payload.service_date is not None:
                updates.append("service_date = %s")
                params.append(_parse_date(payload.service_date))

            if payload.arrival_time is not None:
                updates.append("arrival_time = %s")
                params.append(_parse_time(payload.arrival_time))

            if payload.departure_time is not None:
                updates.append("departure_time = %s")
                params.append(_parse_time(payload.departure_time))

            if payload.direction is not None:

                direction = payload.direction.strip().upper()

                if direction not in VALID_DIRECTIONS:
                    raise HTTPException(
                        status_code=400,
                        detail="Direction must be UP or DOWN",
                    )

                updates.append("direction = %s")
                params.append(direction)

            if payload.operational_priority is not None:
                updates.append("operational_priority = %s")
                params.append(payload.operational_priority)

            if payload.reason is not None:
                updates.append("event_name = %s")
                params.append(payload.reason)

            if payload.active is not None:
                updates.append("status = %s")
                params.append(
                    "SCHEDULED"
                    if payload.active
                    else "INACTIVE"
                )

            if not updates:
                return {
                    "status": "success",
                    "message": "No changes provided",
                }

            updates.append("updated_at = CURRENT_TIMESTAMP")

            params.append(special_train_id)

            query = f"""
                UPDATE special_train_services
                SET {", ".join(updates)}
                WHERE special_id = %s
            """

            cur.execute(query, params)

            conn.commit()

            record_audit(
                actor_role=user.role_id,
                actor_name=user.name,
                method="PUT",
                path=f"/special-trains/{special_train_id}",
                action="UPDATE_SPECIAL_TRAIN",
                target_type="special_train",
                target_id=special_train_id,
                outcome="SUCCESS",
                detail={
                    "updated_fields":
                        list(
                            payload.model_dump(
                                exclude_unset=True
                            ).keys()
                        )
                },
            )

            return {
                "status": "success",
                "message": (
                    f"Special train {special_train_id} "
                    "updated successfully"
                ),
            }


# ============================================================
# ACTIVE / INACTIVE
# ============================================================

@router.patch(
    "/{special_train_id}/active",
    dependencies=[Depends(require_permission("special_trains.manage"))],
)
def toggle_special_train(
    special_train_id: str,
    payload: ActiveToggleSchema,
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT special_id
                FROM special_train_services
                WHERE special_id = %s
            """, (special_train_id,))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Special train not found",
                )

            new_status = (
                "SCHEDULED"
                if payload.active
                else "INACTIVE"
            )

            cur.execute("""
                UPDATE special_train_services
                SET status = %s
                WHERE special_id = %s
            """, (
                new_status,
                special_train_id,
            ))

            conn.commit()

            record_audit(
                actor_role=user.role_id,
                actor_name=user.name,
                method="PATCH",
                path=f"/special-trains/{special_train_id}/active",
                action=(
                    "ACTIVATE_SPECIAL_TRAIN"
                    if payload.active
                    else "DEACTIVATE_SPECIAL_TRAIN"
                ),
                target_type="special_train",
                target_id=special_train_id,
                outcome="SUCCESS",
                detail={"active": payload.active},
            )

            return {
                "status": "success",
                "special_train_id": special_train_id,
                "active": payload.active,
            }


# ============================================================
# IMPACT ANALYSIS
# ============================================================

@router.get(
    "/{special_train_id}/impact",
    dependencies=[Depends(require_permission("special_trains.view"))],
)
def get_special_train_impact(
    special_train_id: str,
    user: CurrentUser = Depends(get_current_user),
):

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    special_id,
                    train_number,
                    train_name,
                    event_name,
                    event_type,
                    corridor_id,
                    service_date,
                    arrival_time,
                    departure_time,
                    operational_priority,
                    status
                FROM special_train_services
                WHERE special_id = %s
            """, (special_train_id,))

            sp = cur.fetchone()

            if not sp:
                raise HTTPException(
                    status_code=404,
                    detail="Special train not found",
                )

            (
                s_id,
                train_number,
                train_name,
                event_name,
                event_type,
                corridor_id,
                service_date,
                arrival_time,
                departure_time,
                priority,
                train_status,
            ) = sp

            if user.scope != "network":
                allowed = get_relevant_corridor_ids(
                    cur,
                    user.dept,
                )

                if corridor_id not in allowed:
                    raise HTTPException(
                        status_code=403,
                        detail="Corridor outside department scope",
                    )

            # ------------------------------------------------
            # BLOCK CONFLICTS
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    block_id,
                    corridor_id,
                    block_date,
                    start_time,
                    end_time,
                    duration_min,
                    utilization_percent,
                    train_impact_score,
                    optimization_score
                FROM optimized_blocks
                WHERE corridor_id = %s
                  AND block_date = %s
            """, (
                corridor_id,
                service_date,
            ))

            block_rows = cur.fetchall()

            overlapping_blocks = []

            for b in block_rows:

                overlaps, overlap_min = windows_overlap(
                    departure_time,
                     arrival_time,
                    b[3],
                    b[4],
                )

                if overlaps:
                    overlapping_blocks.append({
                        "block_id": b[0],
                        "corridor_id": b[1],
                        "block_date": str(b[2]),
                        "start_time": str(b[3]),
                        "end_time": str(b[4]),
                        "duration_min": b[5],
                        "overlap_minutes": overlap_min,
                        "utilization_percent": float(b[6] or 0),
                        "train_impact_score": float(b[7] or 0),
                        "optimization_score": float(b[8] or 0),
                    })

            # ------------------------------------------------
            # PENDING REQUEST CONFLICTS
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    request_id,
                    task_id,
                    team_id,
                    corridor_id,
                    requested_date,
                    requested_start,
                    requested_end,
                    requested_duration_min
                FROM block_requests
                WHERE corridor_id = %s
                  AND requested_date = %s
                  AND request_status = 'PENDING'
            """, (
                corridor_id,
                service_date,
            ))

            request_rows = cur.fetchall()

            overlapping_requests = []

            for r in request_rows:

                overlaps, overlap_min = windows_overlap(
                    arrival_time,
                    departure_time,
                    r[5],
                    r[6],
                )

                if overlaps:
                    overlapping_requests.append({
                        "request_id": r[0],
                        "task_id": r[1],
                        "team_id": r[2],
                        "corridor_id": r[3],
                        "requested_date": str(r[4]),
                        "requested_start": str(r[5]),
                        "requested_end": str(r[6]),
                        "requested_duration_min": r[7],
                        "overlap_minutes": overlap_min,
                    })

            # ------------------------------------------------
            # SHIFT RECOMMENDATION
            # ------------------------------------------------

            recommended_shift = None

            if overlapping_blocks:

                traffic = load_traffic_for_day(
                    cur,
                    corridor_id,
                    service_date,
                )

                lowest_conflicts = 999
                best_candidate = None

                for block in overlapping_blocks:

                    start_min = time_to_minutes(
                        block["start_time"]
                    )

                    duration = block["duration_min"]

                    for offset in [
                        -180,
                        -120,
                        -60,
                        60,
                        120,
                        180,
                        240,
                    ]:

                        candidate_start = (
                            start_min + offset
                        ) % 1440

                        candidate_end = (
                            candidate_start + duration
                        )

                        conflicts = 0

                        for train in traffic:

                            arr = train.get("arrival_time")
                            dep = train.get("departure_time")

                            if not arr or not dep:
                                continue

                            overlap, _ = windows_overlap(
                                minutes_to_time_str(candidate_start),
                                minutes_to_time_str(candidate_end),
                                arr,
                                dep,
                            )

                            if overlap:
                                conflicts += 1

                        if conflicts < lowest_conflicts:

                            lowest_conflicts = conflicts

                            best_candidate = {
                                "block_id": block["block_id"],
                                "shift_offset_min": offset,
                                "proposed_start":
                                    minutes_to_time_str(
                                        candidate_start
                                    ),
                                "proposed_end":
                                    minutes_to_time_str(
                                        candidate_end
                                    ),
                                "expected_train_conflicts":
                                    conflicts,
                                "rationale": (
                                    f"Shift block "
                                    f"{block['block_id']} "
                                    f"by {offset:+d} minutes "
                                    f"to reduce conflict with "
                                    f"{train_number}."
                                ),
                            }

                recommended_shift = best_candidate

            return {
                "status": "success",
                "special_train_id": s_id,
                "train_number": train_number,
                "train_name": train_name,
                "special_type": event_type,
                "corridor_id": corridor_id,
                "service_date": str(service_date),
                "arrival_time": str(arrival_time),
                "departure_time": str(departure_time),
                "operational_priority": priority,
                "expected_passengers": 0,
                "active": train_status == "SCHEDULED",
                "has_conflicts": bool(
                    overlapping_blocks or overlapping_requests
                ),
                "overlapping_blocks_count":
                    len(overlapping_blocks),
                "overlapping_blocks":
                    overlapping_blocks,
                "overlapping_requests_count":
                    len(overlapping_requests),
                "overlapping_requests":
                    overlapping_requests,
                "recommended_shift":
                    recommended_shift,
                "workflow_note":
                    "AI advisory only. Block shifts require Chief Controller review and Admin authorization.",
            }