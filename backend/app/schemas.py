from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    email: str

    class Config:
        orm_mode = True
