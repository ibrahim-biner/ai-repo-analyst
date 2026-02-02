import google.generativeai as genai
import os
from dotenv import load_dotenv

# .env dosyasındaki API Key'i yüklüyoruz
load_dotenv() 

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("HATA: .env dosyasında GOOGLE_API_KEY bulunamadı!")
else:
    genai.configure(api_key=api_key)

    print("\n🔍 KULLANABİLECEĞİN EMBEDDING MODELLERİ:")
    print("-" * 40)
    
    found = False
    try:
        # Tüm modelleri listeliyoruz
        for m in genai.list_models():
            # Sadece 'embedContent' (vektörleştirme) yeteneği olanları filtreliyoruz
            if 'embedContent' in m.supported_generation_methods:
                print(f"✅ {m.name}")
                found = True
        
        if not found:
            print("❌ Hiçbir embedding modeli bulunamadı. API Key veya bölge kısıtlaması olabilir.")
            
    except Exception as e:
        print(f"Bir hata oluştu: {e}")

    print("-" * 40)