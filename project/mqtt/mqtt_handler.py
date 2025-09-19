# mqtt_handler.py
import json
from datetime import datetime
from logs.models import MachineLog

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe("your/topic")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode()
        print(f"[MQTT] Received: {payload}")
        data = json.loads(payload)

        date_obj = datetime.strptime(data["DATE"], "%Y:%m:%d").date()
        start_time = datetime.strptime(data["START_TIME"], "%H:%M:%S").time()
        end_time = datetime.strptime(data["END_TIME"], "%H:%M:%S").time()

        MachineLog.objects.create(
            MACHINE_ID=data["MACHINE_ID"],
            LINE_NUMB=data["LINE_NUMB"],
            OPERATOR_ID=str(data["OPERATOR_ID"]),
            DATE=date_obj,
            START_TIME=start_time,
            END_TIME=end_time,
            MODE=data["MODE"],
            STITCH_COUNT=data["STITCH_COUNT"],
            NEEDLE_RUNTIME=data["NEEDLE_RUNTIME"],
            NEEDLE_STOPTIME=data["NEEDLE_STOPTIME"],
            Tx_LOGID=data["Tx_LOGID"],
            Str_LOGID=data["Str_LOGID"],
            DEVICE_ID=data["DEVICE_ID"],
            RESERVE=str(data.get("RESERVE", "")),
        )
        print("[MQTT] Data saved")
    except Exception as e:
        print(f"[MQTT] Error: {e}")
