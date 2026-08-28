from fastapi import APIRouter

router = APIRouter(
    prefix="/trains",
    tags=["Trains"]
)


@router.get("/")
def get_trains():
    return [
        {
            "id": "TR-101",
            "name": "Rajdhani Express",
            "type": "Express",
            "status": "Running",
            "corridor": "C-12",
            "nextStation": "Station B"
        },
        {
            "id": "TR-205",
            "name": "Shatabdi Express",
            "type": "Express",
            "status": "Running",
            "corridor": "C-08",
            "nextStation": "Station C"
        },
        {
            "id": "TR-312",
            "name": "Intercity Express",
            "type": "Passenger",
            "status": "Scheduled",
            "corridor": "C-05",
            "nextStation": "Station D"
        }
    ]