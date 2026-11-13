from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator

class Model(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class Login(Model):
    username: str
    password: str

class DevoteeIn(Model):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default='', max_length=100)
    date_of_birth: date | None = None
    phone: str | None = None
    email: str | None = None

class FamilyIn(Model):
    name: str = Field(min_length=1, max_length=160)
    head_devotee_id: str | None = None
    contact_phone: str | None = None
    visit_consent: bool = False
    visit_consent_source: str | None = None
    visit_consent_ref: str | None = None

class VisitConsentIn(Model):
    consent: bool
    source: str = Field(min_length=3, max_length=80)
    evidence_ref: str = Field(min_length=3, max_length=200)

class FamilyMemberIn(Model):
    devotee_id: str
    relationship: str = Field(default='member', max_length=40)
    is_primary_contact: bool = False

class AddressIn(Model):
    unit: str = Field(min_length=1, max_length=150)
    building: str = Field(default='', max_length=150)
    street: str = Field(default='', max_length=200)
    locality: str = Field(default='', max_length=150)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=12)

class AddressLink(Model):
    address_id: str

class GeoVerify(Model):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(gt=0, le=200)
    source: str = Field(min_length=2, max_length=80)

class DecisionIn(Model):
    decision: str  # merge / reject / related / not_sure
    survivor_devotee_id: str | None = None
    reason: str = Field(min_length=10, max_length=1200)
    confirmed_same_person: bool = False

class UserIn(Model):
    username: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=12, max_length=128)
    role: str
    zone: str | None = None

class GPSIn(Model):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(gt=0, le=100)
    consent: bool = False

class AssignmentIn(Model):
    family_id: str
    address_id: str
    purpose: str = Field(default='community visit', max_length=120)

class VisitIn(Model):
    outcome: str
    notes: str = Field(default='', max_length=2000)

class PaymentIn(Model):
    purpose: str  # seva / donation
    sevaIds: list[str] = Field(default_factory=list)
    devotee: dict | None = None
    donor: dict | None = None
    amount: int = Field(ge=1, le=2000000)  # rupees

class VerifyPayment(Model):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class LookupIn(Model):
    receipt_no: str
    phone: str
