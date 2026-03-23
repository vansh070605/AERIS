from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(base_dir, 'flood_prediction_model.pkl')
encoder_path = os.path.join(base_dir, 'district_encoder.pkl')

model = None
encoder = None

try:
    model = joblib.load(model_path)
    encoder = joblib.load(encoder_path)
    print("Models loaded successfully.")
    print(f"Model feature names: {getattr(model, 'feature_names_in_', 'Unknown')}")
except Exception as e:
    print(f"Error loading models: {e}")

@app.route('/predict', methods=['POST'])
def predict():
    if not model or not encoder:
        return jsonify({'error': 'Prediction models are not available'}), 500

    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided'}), 400
            
        rainfall = float(data.get('Rainfall_mm', 0))
        river_level = float(data.get('River_Level_m', 0))
        danger_level = float(data.get('Danger_Level_m', 0))
        population = int(data.get('Population', 0))
        crop_area = float(data.get('Crop_Area_ha', 0))
        month = int(data.get('Month', 1))
        year = int(data.get('Year', 2026))
        district = data.get('District', 'Patna')

        try:
            district_encoded = encoder.transform([district])[0]
        except ValueError:
            district_encoded = 0

        # Use Pandas DataFrame so model can map columns automatically by name if needed.
        # The typical names match the dataset: Rainfall_mm, River_Level_m, Danger_Level_m, Population, Crop_Area_ha, District
        feature_dict = {
            'District': district_encoded,
            'Rainfall_mm': rainfall,
            'River_Level_m': river_level,
            'Danger_Level_m': danger_level,
            'Population': population,
            'Crop_Area_ha': crop_area,
            'Month': month,
            'Year': year
        }
        
        features = pd.DataFrame([feature_dict])

        prediction = model.predict(features)
        probability = model.predict_proba(features)
        
        # Typically probability array is shape (1, 2) where index 1 is class '1' (Flood)
        prob_flood = probability[0][1] * 100

        return jsonify({
            'prediction': int(prediction[0]),
            'probability': float(prob_flood),
            'message': 'High Risk' if prediction[0] == 1 else 'Safe'
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 400

if __name__ == '__main__':
    app.run(port=5001, debug=True)
