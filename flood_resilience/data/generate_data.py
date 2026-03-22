import os
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
import random

# Ensure output directory exists
os.makedirs(os.path.dirname(__file__), exist_ok=True)

# 38 Districts of Bihar
bihar_districts = [
    "Patna", "Nalanda", "Bhojpur", "Rohtas", "Buxar", "Kaimur", "Gaya", "Jehanabad", "Arwal", "Nawada", 
    "Aurangabad", "Saran", "Siwan", "Gopalganj", "West Champaran", "East Champaran", "Muzaffarpur", "Sitamarhi", 
    "Sheohar", "Vaishali", "Darbhanga", "Madhubani", "Samastipur", "Saharsa", "Supaul", "Madhepura", "Purnia", 
    "Kishanganj", "Araria", "Katihar", "Munger", "Lakhisarai", "Sheikhpura", "Jamui", "Khagaria", "Begusarai", 
    "Bhagalpur", "Banka"
]

def generate_mock_shapefiles():
    print("Generating mock shapefiles for 38 districts...")
    
    # Bihar approx bounding box
    minx, miny, maxx, maxy = 83.3, 24.2, 88.3, 27.5
    
    # Create a grid of polygons
    nx, ny = 7, 6 # 42 chunks, we need 38
    
    width = (maxx - minx) / nx
    height = (maxy - miny) / ny
    
    polygons = []
    idx = 0
    for i in range(nx):
        for j in range(ny):
            if idx >= 38:
                break
            x1 = minx + i * width
            y1 = miny + j * height
            x2 = minx + (i + 1) * width
            y2 = miny + (j + 1) * height
            
            # Create a rectangle with slight randomization for realism
            poly = Polygon([
                (x1, y1), 
                (x2, y1), 
                (x2, y2), 
                (x1, y2)
            ])
            polygons.append(poly)
            idx += 1
            
    gdf = gpd.GeoDataFrame({
        'district': bihar_districts,
        'geometry': polygons
    }, crs="EPSG:4326")
    
    # Save as GeoJSON
    out_path = os.path.join(os.path.dirname(__file__), 'bihar_districts.geojson')
    gdf.to_file(out_path, driver='GeoJSON')
    print(f"Saved: {out_path}")

def generate_synthetic_data():
    print("Generating synthetic 10-year flood dataset...")
    years = np.arange(2015, 2025)
    
    # Create district x year combinations
    records = []
    for district in bihar_districts:
        # Base stats for the district to ensure consistency across years
        base_rainfall = np.random.normal(1100, 100)
        vuln_score = np.random.uniform(0.1, 0.9)
        base_pop = np.random.randint(1000000, 4000000)
        
        for year in years:
            # Add temporal variance
            rain_factor = np.random.normal(1.0, 0.2)
            rainfall_mm = max(300, base_rainfall * rain_factor)
            
            # Predict outcome based on rainfall and vulnerability
            severity = (rainfall_mm / 1500) * vuln_score
            
            inundated_area_km2 = max(0, rainfall_mm * vuln_score * np.random.uniform(0.01, 0.05))
            population_affected = int(base_pop * severity * np.random.uniform(0.01, 0.2))
            cropped_area_destroyed_ha = inundated_area_km2 * 100 * np.random.uniform(0.5, 0.9)
            
            # PERC Metrics
            response_time_hrs = max(4, 72 - (24 * vuln_score) + np.random.normal(0, 10))
            relief_reach_pct = min(1.0, max(0.1, 0.9 - (vuln_score * 0.4) + np.random.normal(0, 0.1)))
            recovery_cost_cr = inundated_area_km2 * np.random.uniform(1.5, 5.0)
            
            # Embankment breach tracking
            embankment_age = np.random.randint(5, 50)
            maintenance_score = max(1, min(10, 10 - (embankment_age/10) + np.random.normal(0, 2)))
            breach_prob = (11 - maintenance_score) * 0.1 * severity
            embankment_breach = 1 if np.random.random() < breach_prob else 0
            
            records.append({
                'district': district,
                'year': year,
                'rainfall_mm': round(rainfall_mm, 1),
                'inundated_area_km2': round(inundated_area_km2, 2),
                'population_affected': population_affected,
                'cropped_area_destroyed_ha': round(cropped_area_destroyed_ha, 2),
                'response_time_hrs': round(response_time_hrs, 1),
                'relief_reach_pct': round(relief_reach_pct, 2),
                'recovery_cost_cr': round(recovery_cost_cr, 2),
                'embankment_age': embankment_age,
                'maintenance_score': round(maintenance_score, 1),
                'embankment_breach': embankment_breach,
                'vuln_score': round(vuln_score, 2)
            })
            
    df = pd.DataFrame(records)
    
    out_path = os.path.join(os.path.dirname(__file__), 'flood_data.csv')
    df.to_csv(out_path, index=False)
    print(f"Saved: {out_path} ({len(df)} records)")

if __name__ == "__main__":
    np.random.seed(42)
    random.seed(42)
    generate_mock_shapefiles()
    generate_synthetic_data()
    print("Data generation complete!")
