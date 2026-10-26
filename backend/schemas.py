from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AnalysisInput(BaseModel):
    input_type: str = Field(default="article", description="article, headline, claim, url")
    content: Optional[str] = Field(default="", description="text content to analyze")
    url: Optional[str] = Field(default="", description="URL to verify")
    language: Optional[str] = Field(default="English", description="language")
    user_id: Optional[str] = Field(default="ANON_USER", description="user ID")

class URLVerifyInput(BaseModel):
    url: str
    user_id: Optional[str] = Field(default="ANON_USER")

class ClaimItem(BaseModel):
    claim_id: str
    claim_text: str
    claim_type: Optional[str] = "factual_assertion"
    status: str
    confidence: Optional[float] = 85.0
    subject: Optional[str] = ""
    predicate: Optional[str] = ""
    object: Optional[str] = ""
    date_reference: Optional[str] = ""
    location: Optional[str] = ""

class EvidenceItem(BaseModel):
    evidence_id: str
    claim_id: str
    source_name: str
    source_url: Optional[str] = ""
    evidence_text: str
    relationship: str
    evidence_type: Optional[str] = "official_source"
    source_date: Optional[str] = ""
    retrieved_at: Optional[str] = ""

class SourceInfo(BaseModel):
    name: str
    domain: str
    publisher: str
    author: str
    publication_date: str
    source_status: str
    source_information: Optional[str] = ""

class NLPFeatures(BaseModel):
    sentiment_score: float
    sentiment_label: Optional[str] = "Neutral"
    subjectivity_score: float
    clickbait_score: float
    clickbait_signal: Optional[str] = "Low"
    sensationalism_score: float
    sensationalism_signal: Optional[str] = "Medium"
    language_score: float
    semantic_score: float

class PredictionProbabilities(BaseModel):
    real_probability: float
    fake_probability: float
    misleading_probability: float
    unverified_probability: float

class ResultSummary(BaseModel):
    classification: str
    confidence_score: float
    evidence_strength: str

class ExplanationEngine(BaseModel):
    explanation: List[str]
    reason_codes: List[str]
    supporting_points: List[str]
    contradicting_points: List[str]
    missing_information: List[str]

class PreprocessingInfo(BaseModel):
    raw_text: str
    clean_text: str
    tokens: List[str]
    sentences: List[str]
    keywords: List[str]
    entities: List[Dict[str, str]]
    language: str

class CompleteAnalysisResponse(BaseModel):
    analysis_id: str
    user_id: str
    input: Dict[str, Any]
    source: SourceInfo
    preprocessing: Optional[PreprocessingInfo] = None
    claims: List[ClaimItem]
    nlp: NLPFeatures
    prediction: PredictionProbabilities
    result: ResultSummary
    evidence: List[EvidenceItem]
    explanation: ExplanationEngine
    model: Dict[str, str]
    created_at: str

class FeedbackInput(BaseModel):
    analysis_id: Optional[str] = None
    user_id: Optional[str] = "ANON_USER"
    feedback_type: Optional[str] = "CONTACT_INQUIRY"
    comment: Optional[str] = ""
    name: Optional[str] = ""
    email: Optional[str] = ""
    subject: Optional[str] = ""

class HistoryItem(BaseModel):
    analysis_id: str
    user_id: Optional[str]
    input_type: str
    title: str
    classification: str
    confidence_score: float
    evidence_strength: str
    created_at: str

class ComparisonInput(BaseModel):
    article_a: str
    article_b: str
    title_a: Optional[str] = "Article A"
    title_b: Optional[str] = "Article B"

