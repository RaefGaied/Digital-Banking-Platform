from pydantic import BaseModel, Field, validator

class TransferArgs(BaseModel):
    amount: float = Field(..., gt=0)
    receiverAccno: int = Field(..., gt=0)

    @validator("amount")
    def sane_amount(cls, v):
        if v > 1_000_000:
            raise ValueError("Amount too large")
        return v

class EmptyArgs(BaseModel):
    pass
