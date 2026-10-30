import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from routes.dashboard_api import summarize_requisition_lifecycle


def lifecycle_row(request_status, review_status, count=1, minutes=0):
    return {
        "request_status": request_status,
        "review_status": review_status,
        "count": count,
        "optimized_requested_minutes": minutes,
    }


def test_approved_request_stays_pending_ai_scheduling_until_optimized():
    awaiting_review = summarize_requisition_lifecycle([
        lifecycle_row("PENDING", "PENDING_REVIEW"),
    ])
    approved_but_unscheduled = summarize_requisition_lifecycle([
        lifecycle_row("PENDING", "APPROVED"),
    ])
    scheduled = summarize_requisition_lifecycle([
        lifecycle_row("OPTIMIZED", "APPROVED", minutes=120),
    ])

    assert awaiting_review["pending"] == 1
    assert awaiting_review["approved"] == 0

    # Review approval alone does not complete AI scheduling.
    assert approved_but_unscheduled["pending"] == 1
    assert approved_but_unscheduled["approved"] == 1

    # The optimizer's persisted status transition removes it from pending.
    assert scheduled["pending"] == 0
    assert scheduled["optimized"] == 1
    assert scheduled["approved"] == 1
    assert scheduled["optimized_requested_minutes"] == 120


def test_pipeline_counts_pending_and_approved_as_independent_lifecycle_states():
    totals = summarize_requisition_lifecycle([
        lifecycle_row("PENDING", "PENDING_REVIEW", count=93),
        lifecycle_row("PENDING", "APPROVED", count=2),
        lifecycle_row("OPTIMIZED", "APPROVED", count=4, minutes=480),
        lifecycle_row("COMPLETED", "APPROVED", count=3),
    ])

    assert totals["pending"] == 95
    assert totals["approved"] == 9
    assert totals["optimized"] == 4
    assert totals["completed"] == 3
    assert totals["optimized_requested_minutes"] == 480
