import os
import sys
import django
import random
from datetime import timezone

# --- CORRECTION DU CHEMIN (Le "Hack" pour que ça marche) ---
# Cela permet au script de trouver le dossier 'core' même s'il est mal placé
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)
# -----------------------------------------------------------

# 1. Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'confing.settings')
django.setup()

# 2. Import des modèles
from services.admin_service.app.models import UserAdminView, House, Listing, HouseReview, PhoneNumber

# Dictionnaire pour la logique Rating
CAT_LOGIC = {
    1: "Studio/basic",
    2: "Small apartment",
    3: "Standard house",
    4: "Large/quality house",
    5: "Villa/premium property"
}

print("🚀 Démarrage du script de population...")
try:
    for i in range(1, 16):
        # --- 3. HOUSE ---
        rating = (i % 5) + 1
        house = House.objects.create(
            adresse=f"Rue {i}", 
            number_rooms=random.randint(1, 5), 
            city="Agadir",
            rating=rating, 
            categorie=CAT_LOGIC[rating]
        )
        
        # --- 4. LISTING ---
        Listing.objects.create(
            house=house, 
            price=1000 + (rating*500), 
            title=f"Location {CAT_LOGIC[rating]}", 
            description="Description test"
        )
        
        # --- 5. REVIEW ---
        HouseReview.objects.create(
            house_id=house.house_id, 
            reviewer_id=99, 
            rating=4, 
            comment="Test auto", 
            is_reported=(i%3==0)
        )

    print("✅ SUCCÈS ! 15 lignes ajoutées dans chaque table.")

except Exception as e:
    print(f"❌ Erreur : {e}")