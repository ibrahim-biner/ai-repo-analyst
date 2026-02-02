"""
Gemini API'de erişilebilir modelleri listeler.
Çalıştırma: cd backend && python scripts/list_gemini_models.py
"""

import os

from dotenv import load_dotenv
import google.generativeai as genai


def main() -> None:
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("GOOGLE_API_KEY bulunamadı. backend/.env dosyasını kontrol et.")

    genai.configure(api_key=api_key)

    print("=== GenerateContent destekleyen Gemini modelleri ===")
    found = 0
    for m in genai.list_models():
        methods = getattr(m, "supported_generation_methods", []) or []
        if "generateContent" in methods:
            print("-", m.name)
            found += 1

    if not found:
        print("Hiç model bulunamadı. Kota/izin/bölge kısıtı olabilir.")


if __name__ == "__main__":
    main()

