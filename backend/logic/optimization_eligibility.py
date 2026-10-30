"""Shared rules for deciding which requisitions the optimizer may process."""

from contextlib import contextmanager

OPTIMIZATION_ELIGIBLE_STATUS = "PENDING"
OPTIMIZATION_ELIGIBLE_REVIEW_STATUS = "APPROVED"


class EligibleRequestSetChanged(RuntimeError):
    """Raised when the eligible queue changes before persistence begins."""


def count_eligible_requests(status_counts: dict[str, int]) -> int:
    """Count pending requests that have also passed officer review.

    Keys are ``REQUEST_STATUS|REVIEW_STATUS`` so scheduling and review state
    remain separate lifecycle dimensions.
    """
    return sum(
        int(count or 0)
        for lifecycle, count in status_counts.items()
        if tuple(str(lifecycle or "").upper().split("|", 1))
        == (OPTIMIZATION_ELIGIBLE_STATUS, OPTIMIZATION_ELIGIBLE_REVIEW_STATUS)
    )


def lock_pending_requests(cursor, expected_request_ids: set[str]) -> None:
    """Lock and recheck the exact approved-pending set before persistence."""
    cursor.execute(
        """
        SELECT request_id FROM block_requests
        WHERE UPPER(COALESCE(request_status, '')) = %s
          AND UPPER(COALESCE(review_status, '')) = %s
        FOR UPDATE
        """,
        (OPTIMIZATION_ELIGIBLE_STATUS, OPTIMIZATION_ELIGIBLE_REVIEW_STATUS),
    )
    actual_request_ids = {str(row[0]) for row in cursor.fetchall()}
    if actual_request_ids != {str(request_id) for request_id in expected_request_ids}:
        raise EligibleRequestSetChanged(
            "The set of pending requests changed while optimization was running; "
            "no plan was saved. Refresh and retry."
        )


def mark_request_optimized(cursor, request_id: str) -> None:
    """Transition an approved pending request only after its block is persisted."""
    cursor.execute(
        """
        UPDATE block_requests
        SET request_status = 'OPTIMIZED', updated_at = CURRENT_TIMESTAMP
        WHERE request_id = %s
          AND UPPER(COALESCE(request_status, '')) = %s
          AND UPPER(COALESCE(review_status, '')) = %s
        """,
        (request_id, OPTIMIZATION_ELIGIBLE_STATUS, OPTIMIZATION_ELIGIBLE_REVIEW_STATUS),
    )
    if cursor.rowcount != 1:
        raise RuntimeError(
            f"Request {request_id} was no longer pending during optimization."
        )


def mark_included_requests_optimized(
    cursor,
    included_request_ids: list[str],
    eligible_request_ids: set[str],
) -> set[str]:
    """Mark only eligible requests represented by persisted plan task links."""
    included = {str(request_id) for request_id in included_request_ids}
    eligible = {str(request_id) for request_id in eligible_request_ids}
    if included - eligible:
        raise RuntimeError("The saved plan contains requests outside the approved pending set.")
    for request_id in sorted(included):
        mark_request_optimized(cursor, request_id)
    return included


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
