import paho.mqtt.client as mqtt
import json
import time
import random

client = mqtt.Client()
client.connect("localhost", 1883, 60)

while True:
    data = {
        "MACHINE_ID": 3,
        "LINE_NUMB": 3,
        "OPERATOR_ID": 3,
        "DATE": "2025:8:5",  # ✅ Updated to current date
        "START_TIME": "11:10:00",
        "END_TIME": "11:20:00",
        "MODE": 1,  # ✅ Changed to Mode 1 (Sewing) for testing
        "STITCH_COUNT": 100,
        "NEEDLE_RUNTIME": 25,
        "NEEDLE_STOPTIME": 5,
        "Tx_LOGID": 200,
        "Str_LOGID": 200,
        "DEVICE_ID": 8,
        "RESERVE": 25,  # ✅ SPM value
        # ✅ NEW: Add AVERG and PIECECNT for testing
        "AVERG": random.randint(1000, 3000),
        "PIECECNT": random.randint(10, 50)
    }

    payload = json.dumps(data)
    client.publish("factory/logs", payload)
    print(f"Published: {payload}")
    time.sleep(10)  # ✅ Increased interval to 10 seconds