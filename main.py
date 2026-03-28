from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str

users = []

@app.get('/')
def read_root():
    return {'Hello': 'World'}

@app.post('/users/')
def create_user(user: User):
    users.append(user.dict())
    return user

@app.get('/users/{user_id}')
def read_user(user_id: int):
    for user in users:
        if user['id'] == user_id:
            return user
    return {'error': 'User not found'}

@app.put('/users/{user_id}')
def update_user(user_id: int, updated: User):
    for idx, user in enumerate(users):
        if user['id'] == user_id:
            users[idx] = updated.dict()
            return users[idx]
    return {'error': 'User not found'}

@app.delete('/users/{user_id}')
def delete_user(user_id: int):
    for idx, user in enumerate(users):
        if user['id'] == user_id:
            return users.pop(idx)
    return {'error': 'User not found'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
