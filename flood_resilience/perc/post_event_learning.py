import pandas as pd

def analyze_post_event(df: pd.DataFrame, year: int) -> dict:
    """
    Processes the flood dataset for a specific year to extract PERC metrics.
    """
    df_year = df[df['year'] == year].copy()
    if df_year.empty:
        return {}
        
    metrics = {
        'total_inundated_km2': df_year['inundated_area_km2'].sum(),
        'total_pop_affected': df_year['population_affected'].sum(),
        'total_cropped_area_destroyed_ha': df_year['cropped_area_destroyed_ha'].sum(),
        'avg_response_time_hrs': df_year['response_time_hrs'].mean(),
        'avg_relief_reach_pct': df_year['relief_reach_pct'].mean(),
        'total_recovery_cost_cr': df_year['recovery_cost_cr'].sum(),
        'embankment_breaches': df_year['embankment_breach'].sum()
    }
    return metrics

def generate_ml_feedback(df: pd.DataFrame, district: str, year: int) -> str:
    """
    Provide insightful 'ML feedback' string based on the data.
    E.g. "Why did Patna flood despite embankments?"
    """
    record = df[(df['district'] == district) & (df['year'] == year)]
    if record.empty:
        return f"No records found for {district} in {year}."
    
    row = record.iloc[0]
    
    insights = []
    if row['rainfall_mm'] > 1200:
        insights.append(f"exceptional rainfall ({row['rainfall_mm']} mm)")
    if row['embankment_breach'] == 1:
        insights.append(f"embankment breach (age: {row['embankment_age']} yrs, maintenance score: {row['maintenance_score']}/10)")
    if row['vuln_score'] > 0.7:
        insights.append("high natural zoning vulnerability")
        
    if not insights:
        return f"{district} experienced minor flooding due to localized waterlogging."
    
    reason = " combined with ".join(insights)
    feedback = f"In {year}, {district} experienced significant flooding primarily due to {reason}."
    
    return feedback

def get_worst_hit_districts(df: pd.DataFrame, year: int, top_n: int = 5) -> pd.DataFrame:
    """
    Returns the districts with the highest damaged cropped area for a year.
    """
    df_year = df[df['year'] == year]
    return df_year.nlargest(top_n, 'cropped_area_destroyed_ha')[['district', 'cropped_area_destroyed_ha', 'population_affected', 'recovery_cost_cr']]
