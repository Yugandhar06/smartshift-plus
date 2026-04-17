import sys
sys.path.append('.')
from database import SessionLocal
import models.zone as models_zone
import models.zone_score as models_zone_score
from datetime import datetime

CITY_AREAS = {
  'Mumbai': ['Andheri', 'Bandra', 'Borivali', 'Dadar', 'Goregaon', 'Juhu', 'Kandivali', 'Malad', 'Powai', 'Vile Parle'],
  'Bangalore': ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Jayanagar', 'JP Nagar', 'Malleshwaram', 'BTM Layout', 'Marathahalli', 'Bellandur'],
  'Delhi': ['Connaught Place', 'South Extension', 'Hauz Khas', 'Karol Bagh', 'Lajpat Nagar', 'Vasant Kunj', 'Saket', 'Dwarka', 'Rohini', 'Janakpuri'],
  'Hyderabad': ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Gachibowli', 'Kukatpally', 'Madhapur', 'Kondapur', 'Begumpet', 'Ameerpet', 'Secunderabad'],
  'Chennai': ['T Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Mylapore', 'Besant Nagar', 'Nungambakkam', 'Thiruvanmiyur', 'Guindy', 'Alwarpet'],
  'Kolkata': ['Park Street', 'Salt Lake', 'Ballygunge', 'New Town', 'Alipore', 'Jadavpur', 'Bhawanipore', 'Gariahat', 'Tollygunge', 'Rajarhat'],
  'Pune': ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Aundh', 'Hinjewadi', 'Kothrud', 'Wakad', 'Magarpatta', 'Shivajinagar'],
  'Ahmedabad': ['Vastrapur', 'Bodakdev', 'Satellite', 'Prahlad Nagar', 'Navrangpura', 'Thaltej', 'Makarba', 'Maninagar', 'SG Highway', 'Bopal'],
  'Jaipur': ['Malviya Nagar', 'Vaishali Nagar', 'C Scheme', 'Mansarovar', 'Bani Park', 'Raja Park', 'Jagatpura', 'Civil Lines', 'Shyam Nagar', 'Tonk Road'],
  'Surat': ['Adajan', 'Vesu', 'Piplod', 'Athwa Lines', 'Palanpur', 'Rander', 'Bhatar', 'City Light', 'Udhna', 'Varachha'],
  'Lucknow': ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Vikas Nagar', 'Kapoorthala', 'Chowk', 'Aminabad', 'Ashiyana'],
  'Kanpur': ['Swaroop Nagar', 'Kakadeo', 'Arya Nagar', 'Tilak Nagar', 'Civil Lines', 'Kidwai Nagar', 'Lajpat Nagar', 'Sisamau', 'Shastri Nagar', 'Fazalganj']
}

db = SessionLocal()

# Clear existing zones (Warning: this might break foreign keys in Shifts if not cascaded, but for demo it's probably okay or we can just append)
# Actually, better to just check if it exists and add if missing!

import random

# Geocodes mapping for centers of these cities roughly to generate pseudo lat/lngs for the areas
CITY_CENTERS = {
    'Mumbai': (19.0760, 72.8777),
    'Bangalore': (12.9716, 77.5946),
    'Delhi': (28.7041, 77.1025),
    'Hyderabad': (17.3850, 78.4867),
    'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639),
    'Pune': (18.5204, 73.8567),
    'Ahmedabad': (23.0225, 72.5714),
    'Jaipur': (26.9124, 75.7873),
    'Surat': (21.1702, 72.8311),
    'Lucknow': (26.8467, 80.9462),
    'Kanpur': (26.4499, 80.3319)
}

added_count = 0

for city, areas in CITY_AREAS.items():
    center_lat, center_lng = CITY_CENTERS.get(city, (20.0, 78.0))
    for area in areas:
        existing = db.query(models_zone.Zone).filter_by(name=area, city=city).first()
        if not existing:
            lat = center_lat + (random.random() - 0.5) * 0.15
            lng = center_lng + (random.random() - 0.5) * 0.15
            
            z = models_zone.Zone(
                name=area,
                city=city,
                lat_min=lat - 0.01,
                lat_max=lat + 0.01,
                lng_min=lng - 0.01,
                lng_max=lng + 0.01,
                risk_multiplier=1.0
            )
            db.add(z)
            db.commit()
            db.refresh(z)
            added_count += 1
            
            # also generate a dummy zone score
            score = random.randint(10, 50)
            zs = models_zone_score.ZoneScore(
                zone_id=z.id,
                score=score,
                signals={'base': True},
                timestamp=datetime.utcnow()
            )
            db.add(zs)
            db.commit()

print(f"Added {added_count} missing zones.")
