import pandas as pd
import geopandas as gpd
import folium
import numpy as np

def calculate_ahp_risk(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Simulate AHP Multi-criteria flood zoning for each district:
    - DEM slope < 2% (30%)
    - Distance to Kosi/Gandak < 5km (25%)
    - Soil permeability LOW (20%)
    - Rainfall >1200mm (15%)
    - Landuse: agriculture/settlement (10%)
    """
    # Use deterministic random values based on district length
    np.random.seed(42)
    # Mock parameters representing sub-district averaged scores
    gdf['dem_slope_score'] = np.random.uniform(0.1, 1.0, len(gdf))
    gdf['dist_river_score'] = np.random.uniform(0.1, 1.0, len(gdf))
    gdf['soil_perm_score'] = np.random.uniform(0.1, 1.0, len(gdf))
    gdf['rainfall_score'] = np.random.uniform(0.1, 1.0, len(gdf))
    gdf['landuse_score'] = np.random.uniform(0.1, 1.0, len(gdf))
    
    # AHP weights as required
    weights = {'dem': 0.30, 'river': 0.25, 'soil': 0.20, 'rain': 0.15, 'land': 0.10}
    
    gdf['risk_score'] = (
        gdf['dem_slope_score'] * weights['dem'] +
        gdf['dist_river_score'] * weights['river'] +
        gdf['soil_perm_score'] * weights['soil'] +
        gdf['rainfall_score'] * weights['rain'] +
        gdf['landuse_score'] * weights['land']
    )
    
    # Define Risk Zones
    conditions = [
        (gdf['risk_score'] < 0.45),
        (gdf['risk_score'] >= 0.45) & (gdf['risk_score'] < 0.65),
        (gdf['risk_score'] >= 0.65)
    ]
    choices = ['Low', 'Medium', 'High']
    gdf['risk_zone'] = np.select(conditions, choices, default='Medium')
    
    return gdf

def generate_risk_map(geojson_path: str):
    """
    Generate an interactive Folium choropleth of Bihar district flood risks.
    """
    gdf = gpd.read_file(geojson_path)
    gdf = calculate_ahp_risk(gdf)
    
    # Center map roughly on Bihar coords
    m = folium.Map(location=[25.5, 85.5], zoom_start=7, tiles='CartoDB positron')
    
    # Create Choropleth
    folium.Choropleth(
        geo_data=gdf,
        name='AHP Flood Risk Zones',
        data=gdf,
        columns=['district', 'risk_score'],
        key_on='feature.properties.district',
        fill_color='YlOrRd',
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name='Flood Risk Score (AHP Multi-criteria)'
    ).add_to(m)
    
    # Add tooltip interactions for popup stats
    folium.GeoJson(
        gdf,
        name='District Details',
        style_function=lambda x: {'fillColor': 'transparent', 'color': 'black', 'weight': 1},
        tooltip=folium.GeoJsonTooltip(
            fields=['district', 'risk_zone', 'risk_score'],
            aliases=['District', 'Risk Zone', 'Score'],
            labels=True,
            sticky=False
        )
    ).add_to(m)
    
    folium.LayerControl().add_to(m)
    return m, gdf
