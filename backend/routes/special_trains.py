"""
Special Train Services Management Routes.
IR-ABPS Block Planning Engine.

Provides:
- GET /special-trains/ (filtered, corridor-scoped for department roles)
- GET /special-trains/{id}
- POST /special-trains/ (creates with date-range expansion, validation, audit)
- PUT /special-trains/{id} (updates with validation, audit)
- PATCH /special-trains/{id}/active (soft toggle activate/deactivate, audit)
- GET /special-trains/{id}/impact (human-in-the-loop impact review and shift recommendation)
"""

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
    normalize_train_type,
    windows_overlap,
    time_to_minutes,
    minutes_to_time_str,
    build_constraint_profile,
    load_traffic_for_day,
)

router = APIRouter(
    prefix="/special-trains",
    tags=["Special Trains"]
)

VALID_SPECIAL_TYPES = {"FESTIVAL", "HOLIDAY", "EVENT", "MILITARY", "RELIEF", "SEASONAL", "OTHER"}
VALID_DIRECTIONS = {"UP", "DOWN"}


class SpecialTrainCreateSchema(BaseModel):
    train_number: str = Field(..., min_length=1, max_length=20)
    train_name: str = Field(..., min_length=1, max_length=150)
    special_type: str = Field(..., description="FESTIVAL, HOLIDAY, EVENT, MILITARY, RELIEF, SEASONAL, OTHER")
    corridor_id: str = Field(..., min_length=1, max_length=20)
    service_date: Optional[str] = Field(None, description="Single service date YYYY-MM-DD")
    service_date_from: Optional[str] = Field(None, description="Start date for range expansion YYYY-MM-DD")
    service_date_to: Optional[str] = Field(None, description="End date for range expansion YYYY-MM-DD")
    arrival_time: str = Field(..., description="HH:MM:SS or HH:MM")
    departure_time: str = Field(..., description="HH:MM:SS or HH:MM")
    direction: str = Field("UP", description="UP or DOWN")
    operational_priority: int = Field(4, ge=1, le=5)
    expected_passengers: int = Field(0, ge=0)
    reason: Optional[str] = None
    origin_station: Optional[str] = None
    destination_station: Optional[str] = None
    active: bool = True


class SpecialTrainUpdateSchema(BaseModel):
    train_number: Optional[str] = Field(None, min_length=1, max_length=20)
    train_name: Optional[str] = Field(None, min_length=1, max_length=150)
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


def _parse_time(t_val: Any) -> time:
    if isinstance(t_val, time):
        return t_val
    t_str = str(t_val).strip()
    if len(t_str) == 5:
        t_str += ":00"
    return datetime.strptime(t_str[:8], "%H:%M:%S").time()


def _parse_date(d_val: Any) -> date:
    if isinstance(d_val, (date, datetime)):
        return d_val if isinstance(d_val, date) else d_val.date()
    return datetime.strptime(str(d_val)[:10], "%Y-%m-%d").date()


def _generate_special_train_id(cur: Any) -> str:
    """Generates an ID like SPL-0001 using the sequence, with fallback."""
    try:
        cur.execute("SELECT nextval('special_train_seq')")
        val = cur.fetchone()[0]
        return f"SPL-{val:04d}"
    except Exception:
        # Fallback if sequence is missing in old schema
        cur.execute("""
            SELECT special_train_id
            FROM special_train_services
            WHERE special_train_id LIKE 'SPL-%'
            ORDER BY special_train_id DESC
            LIMIT 1
        """)
        last = cur.fetchone()
        if last and last[0]:
            try:
                num = int(last[0].split("-")[1]) + 1
                return f"SPL-{num:04d}"
            except Exception:
                pass
        return f"SPL-{int(datetime.now().timestamp()) % 10000:04d}"


# ============================================================
# 1. LIST SPECIAL TRAINS (GET /special-trains)
# ============================================================

@router.get("/", dependencies=[Depends(require_permission("special_trains.view"))])
def get_special_trains(
    corridor_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    active: Optional[bool] = Query(None),
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    List special trains with filtering by corridor, date range, and active status.
    Scoped by corridor for department roles.
    """
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            allowed_corridors = None
            if user.scope != "network":
                allowed_corridors = get_relevant_corridor_ids(cur, user.dept)
                if not allowed_corridors:
                    return {
                        "status": "success",
                        "total_count": 0,
                        "special_trains": [],
                        "scope": user.scope,
                        "department": user.dept,
                    }

            query = """
                SELECT
                    special_train_id,
                    train_number,
                    train_name,
                    special_type,
                    corridor_id,
                    service_date,
                    arrival_time,
                    departure_time,
                    direction,
                    operational_priority,
                    expected_passengers,
                    reason,
                    active,
                    origin_station,
                    destination_station,
                    created_by,
                    created_at,
                    updated_at
                FROM special_train_services
                WHERE 1=1
            """
            params: List[Any] = []

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
                query += " AND active = %s"
                params.append(active)

            query += " ORDER BY service_date ASC, departure_time ASC"

            cur.execute(query, params)
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]

            items = []
            for r in rows:
                item = dict(zip(cols, r))
                item["service_date"] = str(item["service_date"])
                item["arrival_time"] = str(item["arrival_time"]) if item["arrival_time"] else None
                item["departure_time"] = str(item["departure_time"]) if item["departure_time"] else None
                item["created_at"] = str(item["created_at"]) if item["created_at"] else None
                item["updated_at"] = str(item["updated_at"]) if item["updated_at"] else None
                items.append(item)

            return {
                "status": "success",
                "total_count": len(items),
                "special_trains": items
            }


# ============================================================
# 2. GET SPECIAL TRAIN BY ID (GET /special-trains/{id})
# ============================================================

@router.get("/{special_train_id}", dependencies=[Depends(require_permission("special_trains.view"))])
def get_special_train(
    special_train_id: str,
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """Retrieve single special train by ID."""
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    special_train_id,
                    train_number,
                    train_name,
                    special_type,
                    corridor_id,
                    service_date,
                    arrival_time,
                    departure_time,
                    direction,
                    operational_priority,
                    expected_passengers,
                    reason,
                    active,
                    origin_station,
                    destination_station,
                    created_by,
                    created_at,
                    updated_at
                FROM special_train_services
                WHERE special_train_id = %s
            """, (special_train_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Special train {special_train_id} not found")

            cols = [d[0] for d in cur.description]
            item = dict(zip(cols, row))

            if user.scope != "network":
                allowed = get_relevant_corridor_ids(cur, user.dept)
                if item["corridor_id"] not in allowed:
                    raise HTTPException(status_code=403, detail="Corridor outside department operational scope")

            item["service_date"] = str(item["service_date"])
            item["arrival_time"] = str(item["arrival_time"]) if item["arrival_time"] else None
            item["departure_time"] = str(item["departure_time"]) if item["departure_time"] else None
            item["created_at"] = str(item["created_at"]) if item["created_at"] else None
            item["updated_at"] = str(item["updated_at"]) if item["updated_at"] else None

            return {
                "status": "success",
                "special_train": item
            }


# ============================================================
# 3. CREATE SPECIAL TRAIN(S) (POST /special-trains)
# ============================================================

@router.post("/", dependencies=[Depends(require_permission("special_trains.manage"))], status_code=status.HTTP_201_CREATED)
def create_special_train(
    payload: SpecialTrainCreateSchema,
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create one or more special trains. If date range given, expands to one entry per day.
    Performs duplicate checks and validation against corridors, priority, and special types.
    """
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            # 1. Validate corridor
            cur.execute("SELECT corridor_id FROM corridors WHERE corridor_id = %s", (payload.corridor_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Corridor '{payload.corridor_id}' does not exist")

            # 2. Validate special type
            spec_type = payload.special_type.strip().upper()
            if spec_type not in VALID_SPECIAL_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid special_type '{payload.special_type}'. Must be one of: {sorted(list(VALID_SPECIAL_TYPES))}"
                )

            # 3. Validate direction
            dir_val = payload.direction.strip().upper()
            if dir_val not in VALID_DIRECTIONS:
                raise HTTPException(status_code=400, detail=f"Invalid direction '{payload.direction}'. Must be UP or DOWN")

            # 4. Parse times
            try:
                arr_t = _parse_time(payload.arrival_time)
                dep_t = _parse_time(payload.departure_time)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid time format: {e}")

            # 5. Expand date range
            dates_to_insert: List[date] = []
            if payload.service_date_from and payload.service_date_to:
                start_d = _parse_date(payload.service_date_from)
                end_d = _parse_date(payload.service_date_to)
                if end_d < start_d:
                    raise HTTPException(status_code=400, detail="service_date_to cannot be before service_date_from")
                curr = start_d
                while curr <= end_d:
                    dates_to_insert.append(curr)
                    curr += timedelta(days=1)
            elif payload.service_date:
                dates_to_insert.append(_parse_date(payload.service_date))
            else:
                raise HTTPException(status_code=400, detail="Must provide either 'service_date' or 'service_date_from' and 'service_date_to'")

            # 6. Duplicate check across all dates
            train_num = payload.train_number.strip()
            for d in dates_to_insert:
                cur.execute("""
                    SELECT special_train_id
                    FROM special_train_services
                    WHERE train_number = %s
                      AND corridor_id = %s
                      AND service_date = %s
                """, (train_num, payload.corridor_id, d))
                dup = cur.fetchone()
                if dup:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Special train {train_num} already exists on corridor {payload.corridor_id} for date {d} ({dup[0]})"
                    )

            # 7. Insert each date
            created_ids: List[str] = []
            for d in dates_to_insert:
                new_id = _generate_special_train_id(cur)
                cur.execute("""
                    INSERT INTO special_train_services (
                        special_train_id,
                        train_number,
                        train_name,
                        special_type,
                        corridor_id,
                        service_date,
                        arrival_time,
                        departure_time,
                        direction,
                        operational_priority,
                        expected_passengers,
                        reason,
                        active,
                        origin_station,
                        destination_station,
                        created_by
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_id,
                    train_num,
                    payload.train_name.strip(),
                    spec_type,
                    payload.corridor_id,
                    d,
                    arr_t,
                    dep_t,
                    dir_val,
                    payload.operational_priority,
                    payload.expected_passengers,
                    payload.reason,
                    payload.active,
                    payload.origin_station,
                    payload.destination_station,
                    f"{user.role_id}:{user.name}"
                ))
                created_ids.append(new_id)

                record_audit(
                    actor_role=user.role_id,
                    actor_name=user.name,
                    method="POST",
                    path="/special-trains",
                    action="CREATE_SPECIAL_TRAIN",
                    target_type="special_train",
                    target_id=new_id,
                    outcome="SUCCESS",
                    detail={
                        "train_number": train_num,
                        "corridor_id": payload.corridor_id,
                        "service_date": str(d),
                        "special_type": spec_type,
                        "priority": payload.operational_priority,
                    }
                )

            conn.commit()

            return {
                "status": "success",
                "message": f"Successfully created {len(created_ids)} special train service(s)",
                "created_count": len(created_ids),
                "created_ids": created_ids
            }


# ============================================================
# 4. UPDATE SPECIAL TRAIN (PUT /special-trains/{id})
# ============================================================

@router.put("/{special_train_id}", dependencies=[Depends(require_permission("special_trains.manage"))])
def update_special_train(
    special_train_id: str,
    payload: SpecialTrainUpdateSchema,
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """Update details of an existing special train."""
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT special_train_id, train_number, corridor_id, service_date
                FROM special_train_services
                WHERE special_train_id = %s
            """, (special_train_id,))
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail=f"Special train {special_train_id} not found")

            updates = []
            params: List[Any] = []

            if payload.train_number is not None:
                updates.append("train_number = %s")
                params.append(payload.train_number.strip())

            if payload.train_name is not None:
                updates.append("train_name = %s")
                params.append(payload.train_name.strip())

            if payload.special_type is not None:
                st = payload.special_type.strip().upper()
                if st not in VALID_SPECIAL_TYPES:
                    raise HTTPException(status_code=400, detail=f"Invalid special_type '{payload.special_type}'")
                updates.append("special_type = %s")
                params.append(st)

            if payload.corridor_id is not None:
                cur.execute("SELECT corridor_id FROM corridors WHERE corridor_id = %s", (payload.corridor_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=400, detail=f"Corridor '{payload.corridor_id}' does not exist")
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
                d_val = payload.direction.strip().upper()
                if d_val not in VALID_DIRECTIONS:
                    raise HTTPException(status_code=400, detail="Direction must be UP or DOWN")
                updates.append("direction = %s")
                params.append(d_val)

            if payload.operational_priority is not None:
                updates.append("operational_priority = %s")
                params.append(payload.operational_priority)

            if payload.expected_passengers is not None:
                updates.append("expected_passengers = %s")
                params.append(payload.expected_passengers)

            if payload.reason is not None:
                updates.append("reason = %s")
                params.append(payload.reason)

            if payload.origin_station is not None:
                updates.append("origin_station = %s")
                params.append(payload.origin_station)

            if payload.destination_station is not None:
                updates.append("destination_station = %s")
                params.append(payload.destination_station)

            if payload.active is not None:
                updates.append("active = %s")
                params.append(payload.active)

            if not updates:
                return {"status": "success", "message": "No changes provided"}

            updates.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE special_train_services SET {', '.join(updates)} WHERE special_train_id = %s"
            params.append(special_train_id)

            cur.execute(sql, params)
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
                detail={"updated_fields": list(payload.model_dump(exclude_unset=True).keys())}
            )

            return {
                "status": "success",
                "message": f"Special train {special_train_id} updated successfully"
            }


# ============================================================
# 5. SOFT TOGGLE ACTIVE (PATCH /special-trains/{id}/active)
# ============================================================

@router.patch("/{special_train_id}/active", dependencies=[Depends(require_permission("special_trains.manage"))])
def toggle_special_train_active(
    special_train_id: str,
    payload: ActiveToggleSchema,
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Soft activate or deactivate a special train service.
    No hard-delete endpoint exists to preserve audit and operational history.
    """
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT active FROM special_train_services WHERE special_train_id = %s", (special_train_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Special train {special_train_id} not found")

            cur.execute("""
                UPDATE special_train_services
                SET active = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE special_train_id = %s
            """, (payload.active, special_train_id))
            conn.commit()

            action_name = "ACTIVATE_SPECIAL_TRAIN" if payload.active else "DEACTIVATE_SPECIAL_TRAIN"
            record_audit(
                actor_role=user.role_id,
                actor_name=user.name,
                method="PATCH",
                path=f"/special-trains/{special_train_id}/active",
                action=action_name,
                target_type="special_train",
                target_id=special_train_id,
                outcome="SUCCESS",
                detail={"active": payload.active}
            )

            return {
                "status": "success",
                "message": f"Special train {special_train_id} active status set to {payload.active}",
                "special_train_id": special_train_id,
                "active": payload.active
            }


# ============================================================
# 6. HUMAN-IN-THE-LOOP IMPACT ANALYSIS & RECOMMENDED SHIFT
# ============================================================

@router.get("/{special_train_id}/impact", dependencies=[Depends(require_permission("special_trains.view"))])
def get_special_train_impact(
    special_train_id: str,
    user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Evaluates impact of a special train on planned maintenance blocks and pending requests.
    Suggests non-conflicting time shifts.
    IMPORTANT: This endpoint DOES NOT auto-move or modify any blocks. Human controllers
    retain full review authority.
    """
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    special_train_id,
                    train_number,
                    train_name,
                    special_type,
                    corridor_id,
                    service_date,
                    arrival_time,
                    departure_time,
                    operational_priority,
                    expected_passengers,
                    active
                FROM special_train_services
                WHERE special_train_id = %s
            """, (special_train_id,))
            sp = cur.fetchone()
            if not sp:
                raise HTTPException(status_code=404, detail=f"Special train {special_train_id} not found")

            (
                s_id, t_num, t_name, s_type, corr_id, s_date,
                arr_t, dep_t, prio, pax, is_active
            ) = sp

            if not arr_t or not dep_t:
                return {
                    "status": "success",
                    "special_train_id": s_id,
                    "has_times": False,
                    "overlapping_blocks": [],
                    "overlapping_requests": [],
                    "recommended_shift": None
                }

            # 1. Overlapping optimized blocks on same corridor and date
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
            """, (corr_id, s_date))
            block_rows = cur.fetchall()

            overlapping_blocks = []
            for b in block_rows:
                b_start = b[3]
                b_end = b[4]
                overlaps, overlap_min = windows_overlap(arr_t, dep_t, b_start, b_end)
                if overlaps:
                    overlapping_blocks.append({
                        "block_id": b[0],
                        "corridor_id": b[1],
                        "block_date": str(b[2]),
                        "start_time": str(b_start),
                        "end_time": str(b_end),
                        "duration_min": b[5],
                        "overlap_minutes": overlap_min,
                        "utilization_percent": float(b[6] or 0),
                        "train_impact_score": float(b[7] or 0),
                        "optimization_score": float(b[8] or 0),
                    })

            # 2. Overlapping pending block requests
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
            """, (corr_id, s_date))
            req_rows = cur.fetchall()

            overlapping_requests = []
            for r in req_rows:
                r_start = r[5]
                r_end = r[6]
                overlaps, overlap_min = windows_overlap(arr_t, dep_t, r_start, r_end)
                if overlaps:
                    overlapping_requests.append({
                        "request_id": r[0],
                        "task_id": r[1],
                        "team_id": r[2],
                        "corridor_id": r[3],
                        "requested_date": str(r[4]),
                        "requested_start": str(r_start),
                        "requested_end": str(r_end),
                        "requested_duration_min": r[7],
                        "overlap_minutes": overlap_min,
                    })

            # 3. Recommended shift calculation (find candidate alternative slots on that day)
            day_traffic = load_traffic_for_day(cur, corr_id, s_date)
            # Find an alternate window that minimizes overlap with traffic
            s_arr_min = time_to_minutes(arr_t)
            s_dep_min = time_to_minutes(dep_t)
            if s_dep_min <= s_arr_min:
                s_dep_min += 1440
            train_span = s_dep_min - s_arr_min

            recommended_shift = None
            if overlapping_blocks or overlapping_requests:
                # Test shifting the affected block window by -120, -60, +60, +120, +180 minutes
                best_candidate = None
                lowest_conflicts = 999

                for b in overlapping_blocks:
                    b_start_min = time_to_minutes(datetime.strptime(b["start_time"][:8], "%H:%M:%S").time())
                    b_dur = b["duration_min"]

                    for offset in [-180, -120, -60, 60, 120, 180, 240]:
                        cand_start = (b_start_min + offset) % 1440
                        cand_end = cand_start + b_dur

                        # Count traffic collisions in shifted candidate
                        collisions = 0
                        for item in day_traffic:
                            arr = item.get("arrival_time")
                            dep = item.get("departure_time")
                            if arr and dep:
                                over, _ = windows_overlap(
                                    minutes_to_time_str(cand_start),
                                    minutes_to_time_str(cand_end),
                                    arr, dep
                                )
                                if over:
                                    collisions += 1

                        if collisions < lowest_conflicts:
                            lowest_conflicts = collisions
                            best_candidate = {
                                "block_id": b["block_id"],
                                "shift_offset_min": offset,
                                "proposed_start": minutes_to_time_str(cand_start),
                                "proposed_end": minutes_to_time_str(cand_end),
                                "expected_train_conflicts": collisions,
                                "rationale": f"Shifting block {b['block_id']} by {offset:+d} min eliminates Special train conflict with {t_num} ({collisions} passenger/goods conflicts remaining)."
                            }

                recommended_shift = best_candidate

            return {
                "status": "success",
                "special_train_id": s_id,
                "train_number": t_num,
                "train_name": t_name,
                "special_type": s_type,
                "corridor_id": corr_id,
                "service_date": str(s_date),
                "arrival_time": str(arr_t),
                "departure_time": str(dep_t),
                "operational_priority": prio,
                "expected_passengers": pax,
                "active": is_active,
                "has_conflicts": bool(overlapping_blocks or overlapping_requests),
                "overlapping_blocks_count": len(overlapping_blocks),
                "overlapping_blocks": overlapping_blocks,
                "overlapping_requests_count": len(overlapping_requests),
                "overlapping_requests": overlapping_requests,
                "recommended_shift": recommended_shift,
                "workflow_note": "AI advisory only. Block shifts require Chief Controller review and Admin authorization."
            }
