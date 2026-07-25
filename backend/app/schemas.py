import math
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID

class ReadingPayload(BaseModel):
    boot_id: UUID
    sequence_number: int
    fire_raw: Optional[float] = Field(None, ge=0, le=1)      # Digital 0/1
    gas_raw: Optional[float] = Field(None, ge=0, le=4095)     # 12-bit ADC
    water_raw: Optional[float] = Field(None, ge=0, le=4095)   # 12-bit ADC
    pir_raw: Optional[bool] = None
    ms_since_boot: Optional[int] = None
    is_late: bool = False
    warmup: bool = False

    @field_validator('fire_raw', 'gas_raw', 'water_raw', mode='before')
    @classmethod
    def reject_nan(cls, v):
        if v is not None and isinstance(v, float) and math.isnan(v):
            raise ValueError('NaN values are not allowed')
        return v

class BatchReadingPayload(BaseModel):
    readings: list[ReadingPayload]
