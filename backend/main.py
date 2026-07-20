import os
import json
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv
from fpdf import FPDF

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client()

# Define Pydantic structures for our AI outputs
class ExtractedDocumentData(BaseModel):
    doc_type: str = Field(description="Commercial Invoice, Packing List, or Bill of Lading")
    exporter: str = Field(default="N/A")
    importer: str = Field(default="N/A")
    invoice_number: str = Field(default="N/A")
    container_number: str = Field(default="N/A")
    hs_codes: List[str] = Field(default_factory=list)
    weight: str = Field(default="N/A")
    packages: str = Field(default="N/A")
    declared_value: str = Field(default="N/A")
    incoterms: str = Field(default="N/A")

class ValidationMismatches(BaseModel):
    invoice_matches_packing_list: bool
    weight_matches: bool
    quantity_matches: bool
    hs_code_matches: bool
    origin_matches: bool
    warnings: List[str] = Field(description="List of specific discrepancy warnings found")

class RiskAndRecommendations(BaseModel):
    risk_score: int = Field(description="Risk percentage from 0 to 100")
    risk_level: str = Field(description="LOW, MEDIUM, or HIGH RISK")
    recommendations: List[str] = Field(description="Actionable remediation steps")

class CompleteAnalysisReport(BaseModel):
    documents: List[ExtractedDocumentData]
    validation: ValidationMismatches
    risk: RiskAndRecommendations

# Temporary in-memory store for the latest generated report text/data
LATEST_REPORT_DATA = {}

@app.post("/api/process-documents")
async def process_documents(files: List[UploadFile] = File(...)):
    uploaded_contents = []
    
    try:
        for file in files:
            content = await file.read()
            uploaded_contents.append(
                types.Part.from_bytes(
                    data=content,
                    mime_type=file.content_type
                )
            )
        if not uploaded_contents:
            raise HTTPException(status_code=400, detail="No valid documents uploaded.")

    except Exception as e:
        print("\n" + "="*40)
        print("--- DETAILED ERROR TRACEBACK ---")
        traceback.print_exc() 
        print("="*40 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

    prompt = """
    You are an expert global Trade Document Auditor executing a strict 6-step pipeline:
    1. Classify each provided PDF document.
    2. Extract core text and identities.
    3. Generate clean structural data maps.
    4. Cross-check fields across every document to find mismatches in weights, values, quantities, or HS codes.
    5. Evaluate regulatory compliance risk levels.
    6. Formulate precise corrective actions.
    
    Analyze the attached trade data pack completely and return the findings structured exactly against the schema.
    """

    # Primary choice model, and secondary stable backup fallback model
    primary_model = "gemini-3.5-flash"
    backup_model = "gemini-1.5-flash"

    try:
        print(f"Attempting analysis with primary model: {primary_model}...")
        response = client.models.generate_content(
            model=primary_model,
            contents=[*uploaded_contents, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CompleteAnalysisReport,
                temperature=0.1
            ),
        )
    except Exception as primary_error:
        print(f"\n[!] Primary model ({primary_model}) failed or hit a 503 server spike.")
        print(f"Error Details: {str(primary_error)}")
        print(f"Switching automatically to fallback model: {backup_model}...\n")
        
        try:
            response = client.models.generate_content(
                model=backup_model,
                contents=[*uploaded_contents, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=CompleteAnalysisReport,
                    temperature=0.1
                ),
            )
        except Exception as fallback_error:
            print("\n" + "="*40)
            print("--- BOTH PRIMARY AND FALLBACK GEMINI API MODELS FAILED ---")
            traceback.print_exc() 
            print("="*40 + "\n")
            raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(fallback_error)}")
        
    try:
        report_json = json.loads(response.text)
        global LATEST_REPORT_DATA
        LATEST_REPORT_DATA = report_json
        return report_json
    except Exception as parse_error:
        raise HTTPException(status_code=500, detail=f"Failed to parse model JSON response: {str(parse_error)}")

@app.get("/api/download-report")
async def download_report():
    global LATEST_REPORT_DATA
    if not LATEST_REPORT_DATA:
        raise HTTPException(status_code=400, detail="No processed report available to print.")
        
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="Arveniq AI Trade Audit Report", ln=True, align='C')
    pdf.ln(10)
    
    # Extraction Summary
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="1. Shipment Summary Extracts", ln=True)
    pdf.set_font("Arial", size=11)
    
    docs = LATEST_REPORT_DATA.get("documents", [{}])
    primary = docs[0] if docs else {}
    
    fields = [
        f"Exporter: {primary.get('exporter', 'N/A')}",
        f"Importer: {primary.get('importer', 'N/A')}",
        f"Invoice Number: {primary.get('invoice_number', 'N/A')}",
        f"Container Number: {primary.get('container_number', 'N/A')}",
        f"Weight: {primary.get('weight', 'N/A')}",
        f"Incoterms: {primary.get('incoterms', 'N/A')}",
        f"Declared Value: {primary.get('declared_value', 'N/A')}"
    ]
    for field in fields:
        pdf.cell(200, 8, txt=field, ln=True)
        
    # Validation Grid
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="2. Consistency Verifications", ln=True)
    pdf.set_font("Arial", size=11)
    
    val = LATEST_REPORT_DATA.get("validation", {})
    pdf.cell(200, 8, txt=f"Invoice matches Packing List: {'PASS' if val.get('invoice_matches_packing_list') else 'FAIL'}", ln=True)
    pdf.cell(200, 8, txt=f"Weight matches: {'PASS' if val.get('weight_matches') else 'FAIL'}", ln=True)
    pdf.cell(200, 8, txt=f"Quantity matches: {'PASS' if val.get('quantity_matches') else 'FAIL'}", ln=True)
    
    # Warnings
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="3. System Warnings & Flags", ln=True)
    pdf.set_font("Arial", size=11)
    for warning in val.get("warnings", ["No deviations identified."]):
        pdf.cell(200, 8, txt=f"- {warning}", ln=True)
        
    # Risk
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    risk = LATEST_REPORT_DATA.get("risk", {})
    pdf.cell(200, 10, txt=f"4. Risk Profile: {risk.get('risk_score', 0)}% ({risk.get('risk_level', 'UNKNOWN')})", ln=True)
    
    # Recommendations
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="5. AI Resolution Steps", ln=True)
    pdf.set_font("Arial", size=11)
    for rec in risk.get("recommendations", []):
        pdf.cell(200, 8, txt=f"- {rec}", ln=True)
        
    # Using a local directory path so it executes smoothly on Windows environments
    pdf_dir = os.path.join(os.getcwd(), "temp_reports")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, "arveniq_report.pdf")
    
    pdf.output(pdf_path)
    
    return FileResponse(pdf_path, filename="Arveniq_Audit_Report.pdf", media_type="application/pdf")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)