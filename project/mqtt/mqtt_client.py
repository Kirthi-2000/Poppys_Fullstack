import os
import sys
import json
import paho.mqtt.client as mqtt

# Setup Django environment (but don't call django.setup())
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'machine_log_api.settings')

# ✅ REMOVED: django.setup() - This was causing the error

from logs.models import MachineLog
from datetime import datetime


def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe("factory/logs")  # ✅ Fixed topic name


def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode()
        print(f"[MQTT] Received: {payload}")
        data = json.loads(payload)

        date_obj = datetime.strptime(data["DATE"], "%Y:%m:%d").date()
        start_time = datetime.strptime(data["START_TIME"], "%H:%M:%S").time()
        end_time = datetime.strptime(data["END_TIME"], "%H:%M:%S").time()

        # ✅ ADD: Include AVERG and PIECECNT with defaults
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
            # ✅ NEW: Add AVERG and PIECECNT with proper defaults
            AVERG=data.get("AVERG", 0),
            PIECECNT=data.get("PIECECNT", 0),
        )
        print("[MQTT] Data saved")
    except Exception as e:
        print(f"[MQTT] Error: {e}")


def start_mqtt():
    """Function to start MQTT client"""
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect("localhost", 1883, 60)
    client.subscribe("factory/logs")
    client.loop_forever()


if __name__ == "__main__":
    # Only setup Django if running as standalone script
    import django
    django.setup()
    start_mqtt()