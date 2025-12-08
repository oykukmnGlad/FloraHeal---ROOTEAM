from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, validator
from passlib.context import CryptContext
from typing import Optional, List
from datetime import datetime, timedelta
import shutil
import os
import re
import smtplib
import random
from email.message import EmailMessage

# --- GMAIL AYARLARI (BURAYI KENDİ BİLGİLERİNLE DOLDUR) ---
MY_EMAIL = "floraheal.destek@gmail.com"  
MY_PASSWORD = "xxvw vodl himz rstb"    

# --- VERİTABANI ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODELLER ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    verification_code = Column(String, nullable=True) 
    is_verified = Column(Integer, default=0) 
    
    profile = relationship("Profile", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="owner", cascade="all, delete-orphan")
    plants = relationship("Plant", back_populates="owner", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    location = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="profile")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    join_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    owner = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")

class Plant(Base):
    __tablename__ = "plants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)           
    species = Column(String)        
    watering_frequency = Column(Integer)
    fertilizing_frequency = Column(Integer)
    last_watered = Column(DateTime)
    last_fertilized = Column(DateTime)
    image_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="plants")

Base.metadata.create_all(bind=engine)

# --- ŞEMALAR ---
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError('Geçersiz email.')
        return v

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır.')
        if not re.search(r"[A-Z]", v):
            raise ValueError('Büyük harf eksik.')
        return v

class VerifyEmail(BaseModel):
    email: str
    code: str

class ProfileBase(BaseModel):
    full_name: str
    bio: Optional[str] = None
    location: Optional[str] = None

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PostCreate(BaseModel):
    title: str
    content: str

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    user_id: int
    join_count: int
    created_at: datetime
    comments: List[CommentResponse] = []
    class Config:
        from_attributes = True

class PlantCreate(BaseModel):
    name: str
    species: str
    watering_frequency: int
    fertilizing_frequency: int
    last_watered_date: str

    @validator('last_watered_date')
    def validate_date(cls, v):
        try:
            datetime.strptime(v, '%d.%m.%Y')
        except:
            raise ValueError("Tarih 'GG.AA.YYYY' olmalı")
        return v

class PlantResponse(BaseModel):
    id: int
    name: str
    species: str
    watering_frequency: int
    last_watered: datetime
    last_fertilized: Optional[datetime] = None
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

# --- GÜVENLİK ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    return user

def send_email_task(to_email: str, subject: str, body: str):
    """Bu fonksiyon arka planda çalışır, ekranı dondurmaz."""
    if "xxxx" in MY_PASSWORD:
        print("❌ HATA: Şifre girilmemiş!")
        return
    
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = MY_EMAIL
    msg['To'] = to_email
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=15)
        server.starttls()
        server.login(MY_EMAIL, MY_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Mail gönderildi: {to_email}")
    except Exception as e:
        print(f"❌ Mail Hatası: {e}")

# --- UYGULAMA ---
app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- ENDPOINTLER ---

@app.post("/register")
def register(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Kullanıcı adı alınmış.")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı.")
    
    code = str(random.randint(1000, 9999))
    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=get_password_hash(user.password),
        verification_code=code,
        is_verified=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Otomatik Profil Oluştur
    new_profile = Profile(full_name=user.username, user_id=new_user.id)
    db.add(new_profile)
    db.commit()
    
    # Mail Arka Planda
    email_body = f"Merhaba FloraHeal doğrulama kodun {code} lütfen ekranda gördüğün 4 haneli boş yere bu kodu gir ve sende aramıza katıl.🥳"
    background_tasks.add_task(send_email_task, user.email, "FloraHeal Doğrulama Kodu", email_body)
    
    return {"msg": "Kod gönderiliyor...", "email": user.email}

@app.post("/verify-email")
def verify_email(data: VerifyEmail, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı yok")
    
    if user.verification_code == data.code:
        user.is_verified = 1
        user.verification_code = None
        db.commit()
        
        # Hoşgeldin Maili
        welcome_msg = f"Merhaba {user.username}, FloraHeal'a hoşgeldin! Artık bitkilerini ekleyebilir ve onlara daha iyi bakabilirsin. 🌱🌸"
        background_tasks.add_task(send_email_task, user.email, "FloraHeal'a Hoşgeldin! 🎉🌿", welcome_msg)
        
        return {"msg": "Doğrulandı."}
    
    raise HTTPException(400, "Kod yanlış.")

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Hatalı giriş")
    if user.is_verified == 0:
        raise HTTPException(status_code=400, detail="Mailini doğrula!")
    
    return {"access_token": user.username, "token_type": "bearer"}

@app.delete("/profile/me")
def delete_my_account(u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(u)
    db.commit()
    return {"msg": "Silindi"}

@app.post("/profile", response_model=ProfileResponse)
def create_profile(p: ProfileBase, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if u.profile:
        return update_profile(p, u, db)
    np = Profile(**p.dict(), user_id=u.id)
    db.add(np)
    db.commit()
    db.refresh(np)
    return np

@app.get("/profile/me", response_model=ProfileResponse)
def get_my_profile(u: User = Depends(get_current_user)):
    if not u.profile:
        np = Profile(full_name=u.username, user_id=u.id)
        db.add(np)
        db.commit()
        db.refresh(np)
        return np
    return u.profile

@app.put("/profile/me", response_model=ProfileResponse)
def update_profile(p: ProfileUpdate, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not u.profile:
        u.profile = Profile(user_id=u.id)
    u.profile.full_name = p.full_name
    u.profile.bio = p.bio
    u.profile.location = p.location
    db.commit()
    db.refresh(u.profile)
    return u.profile

@app.post("/profile/upload-image")
def upload_img(file: UploadFile = File(...), u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    path = f"static/{u.id}_{file.filename}"
    with open(path, "wb") as b:
        shutil.copyfileobj(file.file, b)
    if not u.profile:
        u.profile = Profile(user_id=u.id)
    u.profile.image_url = path
    db.commit()
    return {"url": path}

@app.post("/posts", response_model=PostResponse)
def create_post(p: PostCreate, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    np = Post(title=p.title, content=p.content, user_id=u.id)
    db.add(np)
    db.commit()
    db.refresh(np)
    return np

@app.get("/posts", response_model=List[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    return db.query(Post).all()

@app.post("/posts/{post_id}/join")
def join_post(post_id: int, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post yok")
    post.join_count += 1
    db.commit()
    return {"msg": "Katıldınız", "count": post.join_count}

@app.post("/posts/{pid}/comments", response_model=CommentResponse)
def create_comment(pid: int, c: CommentCreate, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nc = Comment(content=c.content, user_id=u.id, post_id=pid)
    db.add(nc)
    db.commit()
    db.refresh(nc)
    return nc

@app.post("/my-plants", response_model=PlantResponse)
def add_plant(p: PlantCreate, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = datetime.strptime(p.last_watered_date, '%d.%m.%Y')
    np = Plant(
        name=p.name,
        species=p.species,
        watering_frequency=p.watering_frequency,
        fertilizing_frequency=p.fertilizing_frequency,
        last_watered=d,
        last_fertilized=d,
        user_id=u.id
    )
    db.add(np)
    db.commit()
    db.refresh(np)
    return np

@app.get("/my-plants", response_model=List[PlantResponse])
def get_my_plants(u: User = Depends(get_current_user)):
    return u.plants

@app.post("/my-plants/{pid}/water")
def water_plant(pid: int, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Plant).filter(Plant.id == pid, Plant.user_id == u.id).first()
    if not p:
        raise HTTPException(404, "Bitki yok")
    p.last_watered = datetime.utcnow()
    db.commit()
    return {"msg": "Sulandı"}

@app.post("/my-plants/{pid}/fertilize")
def fertilize_plant(pid: int, u: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Plant).filter(Plant.id == pid, Plant.user_id == u.id).first()
    if not p:
        raise HTTPException(404, "Bitki yok")
    p.last_fertilized = datetime.utcnow()
    db.commit()
    return {"msg": "Gübrelendi"}

@app.get("/check-reminders")
def check_reminders(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    reminders = []
    now = datetime.utcnow()
    for p in db.query(Plant).all():
        if now >= p.last_watered + timedelta(days=p.watering_frequency):
            msg = f"Merhaba {p.owner.username}, {p.name} oldukça susamış lütfen onu sulamayı unutma!🪴"
            background_tasks.add_task(send_email_task, p.owner.email, f"💧 {p.name} Susadı!", msg)
            reminders.append(f"Su: {p.name}")
            
        last_fert = p.last_fertilized if p.last_fertilized else p.last_watered
        if now >= last_fert + timedelta(days=p.fertilizing_frequency):
            msg = f"Merhaba {p.owner.username}, {p.name} gübreye ihtiyacı var lütfen onu beslemeyi unutma!🪴"
            background_tasks.add_task(send_email_task, p.owner.email, f"🧪 {p.name} Besin Vakti!", msg)
            reminders.append(f"Gübre: {p.name}")
            
    return {"msg": "Kontrol edildi", "detay": reminders}
