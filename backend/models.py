import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship as orm_relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="analyst")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login = Column(DateTime, default=datetime.datetime.utcnow)

    analyses = orm_relationship("Analysis", back_populates="user")
    feedbacks = orm_relationship("Feedback", back_populates="user")

class Analysis(Base):
    __tablename__ = "analyses"

    analysis_id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    input_type = Column(String(30), nullable=False)  # article, headline, claim, url
    content = Column(Text, nullable=False)
    url = Column(String(500), nullable=True)
    title = Column(String(300), nullable=True)
    language = Column(String(50), default="English")
    source_name = Column(String(150), nullable=True)
    publisher = Column(String(150), nullable=True)
    author = Column(String(150), nullable=True)
    publication_date = Column(String(100), nullable=True)
    classification = Column(String(50), nullable=False)  # REAL, FAKE, MISLEADING, UNVERIFIED
    confidence_score = Column(Float, nullable=False)
    evidence_strength = Column(String(50), default="MEDIUM")  # HIGH, MEDIUM, LOW, INSUFFICIENT
    model_name = Column(String(100), default="BERT + TruthLens Hybrid Ensemble")
    model_version = Column(String(50), default="1.2.0")
    full_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = orm_relationship("User", back_populates="analyses")
    claims = orm_relationship("Claim", back_populates="analysis", cascade="all, delete-orphan")
    predictions = orm_relationship("Prediction", back_populates="analysis", cascade="all, delete-orphan")
    feedbacks = orm_relationship("Feedback", back_populates="analysis", cascade="all, delete-orphan")

class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(String(50), primary_key=True, index=True)
    analysis_id = Column(String(50), ForeignKey("analyses.analysis_id"), nullable=False)
    claim_text = Column(Text, nullable=False)
    claim_type = Column(String(50), default="factual_assertion")
    claim_status = Column(String(50), default="UNVERIFIED")  # SUPPORTED, CONTRADICTED, PARTIALLY_SUPPORTED, UNVERIFIED
    claim_confidence = Column(Float, default=75.0)
    subject = Column(String(200), nullable=True)
    predicate = Column(String(200), nullable=True)
    object = Column(String(200), nullable=True)
    date_reference = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analysis = orm_relationship("Analysis", back_populates="claims")
    evidence = orm_relationship("Evidence", back_populates="claim", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(String(50), primary_key=True, index=True)
    claim_id = Column(String(50), ForeignKey("claims.claim_id"), nullable=False)
    source_name = Column(String(150), nullable=False)
    source_url = Column(String(500), nullable=True)
    evidence_text = Column(Text, nullable=False)
    relationship = Column(String(50), default="SUPPORTS")  # SUPPORTS, CONTRADICTS, PARTIALLY_SUPPORTS, UNRELATED, INSUFFICIENT
    evidence_type = Column(String(50), default="official_source")
    source_date = Column(String(100), nullable=True)
    retrieved_at = Column(DateTime, default=datetime.datetime.utcnow)

    claim = orm_relationship("Claim", back_populates="evidence")

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(String(50), primary_key=True, index=True)
    analysis_id = Column(String(50), ForeignKey("analyses.analysis_id"), nullable=False)
    real_probability = Column(Float, nullable=False)
    fake_probability = Column(Float, nullable=False)
    misleading_probability = Column(Float, nullable=False)
    unverified_probability = Column(Float, nullable=False)
    final_classification = Column(String(50), nullable=False)
    model_version = Column(String(50), default="1.2.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analysis = orm_relationship("Analysis", back_populates="predictions")

class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(String(50), primary_key=True, index=True)
    analysis_id = Column(String(50), ForeignKey("analyses.analysis_id"), nullable=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    feedback_type = Column(String(50), nullable=False)  # USEFUL_YES, USEFUL_NO, WRONG_RESULT, MISSING_EVIDENCE, WRONG_SOURCE, UNCLEAR, GENERAL_CONTACT
    comment = Column(Text, nullable=True)
    name = Column(String(100), nullable=True)
    email = Column(String(120), nullable=True)
    subject = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analysis = orm_relationship("Analysis", back_populates="feedbacks")
    user = orm_relationship("User", back_populates="feedbacks")
