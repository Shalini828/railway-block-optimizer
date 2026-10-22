"""Shared rules for deciding which requisitions the optimizer may process."""

from contextlib import contextmanager

OPTIMIZATION_ELIGIBLE_STATUS = "PENDING"


class EligibleRequestSetChanged(RuntimeError):
    """Raised when the eligible queue changes before persistence begins."""


def count_eligible_requests(status_counts: dict[str, int]) -> int:
    """Return the number of requests whose persisted status is optimizer eligible."""
    return sum(
        int(count or 0)
        for status, count in status_counts.items()
        if str(status or "").strip().upper() == OPTIMIZATION_ELIGIBLE_STATUS
    )


def lock_pending_requests(cursor, expected_request_ids: set[str]) -> None:
    """Lock and recheck the exact pending set before writing an optimization."""
    cursor.execute(
        "SELECT request_id FROM block_requests WHERE request_status = %s FOR UPDATE",
        (OPTIMIZATION_ELIGIBLE_STATUS,),
    )
    actual_request_ids = {str(row[0]) for row in cursor.fetchall()}
    if actual_request_ids != {str(request_id) for request_id in expected_request_ids}:
        raise EligibleRequestSetChanged(
            "The set of pending requests changed while optimization was running; "
            "no plan was saved. Refresh and retry."
        )


def mark_request_optimized(cursor, request_id: str) -> None:
    """Transition a pending request only after its block has been persisted."""
    cursor.execute(
        """
        UPDATE block_requests
        SET request_status = 'OPTIMIZED', updated_at = CURRENT_TIMESTAMP
        WHERE request_id = %s AND request_status = %s
        """,
        (request_id, OPTIMIZATION_ELIGIBLE_STATUS),
    )
    if cursor.rowcount != 1:
        raise RuntimeError(
            f"Request {request_id} was no longer pending during optimization."
        )


@contextmanager
def commit_or_rollback(connection):
    """Commit a complete plan write or roll every write back on failure."""
    try:
        yield
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()
