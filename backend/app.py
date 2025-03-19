from flask import Flask, jsonify
from flask_cors import CORS
from data_processing import load_and_wrangle_data

app = Flask(__name__)
CORS(app)  # Allow requests from React frontend

@app.route('/fish-data', methods=['GET'])
def get_fish_data():
    return jsonify(load_and_wrangle_data())

if __name__ == "__main__":
    app.run(debug=True)
