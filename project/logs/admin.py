from django.contrib import admin
from import_export.admin import ExportMixin, ImportExportModelAdmin
from import_export import resources
from .models import MachineLog
from .models import ModeMessage, Operator


# Define resource for import/export
class MachineLogResource(resources.ModelResource):
    class Meta:
        model = MachineLog
        fields = ('MACHINE_ID', 'LINE_NUMB', 'OPERATOR_ID', 'DATE', 'START_TIME', 'END_TIME',
                  'MODE', 'STITCH_COUNT', 'NEEDLE_RUNTIME', 'NEEDLE_STOPTIME', 'Tx_LOGID',
                  'Str_LOGID', 'DEVICE_ID', 'RESERVE', 'created_at')

# Admin Configuration
class MachineLogAdmin(ImportExportModelAdmin, admin.ModelAdmin):
    resource_class = MachineLogResource
    list_display = ('MACHINE_ID', 'OPERATOR_ID', 'DATE', 'START_TIME', 'END_TIME', 'MODE' , 'created_at')
    search_fields = ('MACHINE_ID', 'OPERATOR_ID', 'DATE')
    list_filter = ('DATE', 'MODE')

# Register the model with custom admin
admin.site.register(MachineLog, MachineLogAdmin)

# Register ModeMessage model
@admin.register(ModeMessage)
class ModeMessageAdmin(admin.ModelAdmin):
    list_display = ['mode', 'message']
    search_fields = ['mode', 'message']


# Register Operator model
@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display = ['rfid_card_no', 'operator_name', 'remarks']
    search_fields = ['rfid_card_no', 'operator_name', 'remarks']


   
    
from django.contrib import admin
from .models import MachineData

admin.site.register(MachineData)
