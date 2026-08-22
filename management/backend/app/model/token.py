from sqlmodel import Field, SQLModel

from app.model.system.user import PASSWORD_MIN_LENGTH


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)
