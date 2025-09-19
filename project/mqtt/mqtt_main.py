# mqtt_main.py
import os
import sys
import paho.mqtt.client as mqtt

# Remove django.setup() — NOT needed anymore
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'machine_log_api.settings')

from mqtt import mqtt_handler

def start_mqtt():
    client = mqtt.Client()
    client.on_connect = mqtt_handler.on_connect
    client.on_message = mqtt_handler.on_message
    client.connect("broker.hivemq.com", 1883, 60)
    client.loop_forever()

if __name__ == "__main__":
    start_mqtt()
