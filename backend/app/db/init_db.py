from app.db.session import engine
from app.db.base import Base
from app import models  # import all models
from app.db.seed import seed_database
from sqlalchemy.orm import Session


def init_db():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        seed_database(db)


if __name__ == '__main__':
    init_db()
    print('Database initialized successfully')
