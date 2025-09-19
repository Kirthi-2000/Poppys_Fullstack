from django.apps import AppConfig
import threading


class MachineLogApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'machine_log_api'

    def ready(self):
        """
        This method is called when Django is ready.
        Start MQTT client in a separate thread to avoid blocking Django startup.
        """
        # ✅ FIXED: Import after Django is ready, not during module load
        if not hasattr(self, '_mqtt_started'):
            self._mqtt_started = True
            self.start_mqtt_client()

    def start_mqtt_client(self):
        """Start MQTT client in background thread"""
        try:
            from mqtt.mqtt_client import start_mqtt
            
            # Start MQTT in a separate daemon thread
            mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
            mqtt_thread.start()
            print("[Django] MQTT client started in background thread")
            
        except Exception as e:
            print(f"[Django] Failed to start MQTT client: {e}")