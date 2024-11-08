from flask import Flask, request, jsonify
import requests
import json
import base64
from flask_cors import CORS
import pg8000  

app = Flask(__name__)
CORS(app)

DB_NAME = "staging"
DB_USER = "postgres"
DB_PASS = "CMOAI"
DB_HOST = "localhost"
DB_PORT = 5432  

url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

headers = {
    "Content-Type": "application/json",
    "Authorization": "PcYD3f6WgosaSlLXLa7K7f5OteKLYQ6Cjyn0dyHEt2Fm7Ho7Sq-oo44N73XZvdDs"
}

@app.route('/hello', methods=['GET'])
def hello():
    print("Hello Waahlida")
    return "hello 123"


def get_db_connection():
    conn = pg8000.connect(
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT
    )
    return conn

@app.route('/process_audio', methods=['POST'])
def process_audio():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    

    if 'lang' not in request.form:
       return jsonify({"error": "Language not provided"}), 400


    lang = request.form['lang']
    print("$$$$$$$$$$$$$$$$$$$$$$",lang)
    print("$$$$$$$$$$$$$$$$$$$$$$", type(lang))
    sev_id  = "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4"
    if lang == "en":
        sev_id = "ai4bharat/whisper-medium-en--gpu--t4"

    try:
        audio_base64 = base64.b64encode(file.read()).decode('utf-8')

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",

                    "config": {
                        "preProcessors": ["vad"],
                        "language": {
                            "sourceLanguage": lang
                        },
                        "serviceId": sev_id,
                        ### gu - ai4bharat/conformer-multilingual-indo_aryan-gpu--t4
                        ### eng - ai4bharat/whisper-medium-en--gpu--t4

                        "audioFormat": "wav",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_base64
                    }
                ]
            }
        }

        response = requests.post(url, headers=headers, data=json.dumps(payload))
        if response.status_code == 200:
            try:
                source = response.json()['pipelineResponse'][0]['output'][0]['source']

                conn = get_db_connection()
                cursor = conn.cursor()

                cursor.execute('''
                    INSERT INTO audio_records (audio_base64, source) VALUES (%s, %s) RETURNING id;
                ''', (audio_base64, source))

                new_id = cursor.fetchone()[0]
                conn.commit()
                cursor.close()
                conn.close()

                return jsonify({"text": source, 'id': new_id}), 200

            except Exception as e:
                return jsonify({"error": "Audio processed, but format error", "details": str(e)}), 500
        else:
            return jsonify({"error": "Failed to process audio"}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/submit_audio', methods=['POST'])
def submit_audio():
    try:
        data = request.get_json()
        if not data or not data.get('id') or not data.get('text'):
            return jsonify({'status': 'fail', 'message': 'Missing id or text'}), 400

        id = int(data['id'])
        text = data['text']

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE audio_records
            SET edit_source = %s, sentiment_anaylis = %s
            WHERE id = %s;
        ''', (text, 0, id))

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'status': 'fail', 'message': 'Record not found'}), 404

        cursor.close()
        conn.close()

        return jsonify({'status': 'success', 'message': 'Record updated successfully'}), 200

    except pg8000.DatabaseError as e:
        return jsonify({'status': 'fail', 'message': f'Database error: {str(e)}'}), 500

    except Exception as e:
        return jsonify({'status': 'fail', 'message': f'An error occurred: {str(e)}'}), 500

@app.route('/acc_rating', methods=['POST'])
def acc_rating():
    try:
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
        data = request.get_json()
        if not data or not data.get('id') or not data.get('rating'):
            return jsonify({'status': 'fail', 'message': 'Missing id or rating'}), 400
        
        id = int(data['id'])
        text = data['rating']
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE audio_records
            SET rating = %s
            WHERE id = %s;
        ''', (text, id))

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'status': 'fail', 'message': 'Record not found'}), 404

        cursor.close()
        conn.close()

        return jsonify({"status": "success", "message": "Rating updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    try:
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
        data = request.get_json()
        if not data or not data.get('id') or not data.get('rating'):
            return jsonify({'status': 'fail', 'message': 'Missing id or text'}), 400
        
        id = int(data['id'])
        text = data['rating']
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE audio_records
            SET rating = %s
            WHERE id = %s;
        ''', (text, id))

        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({'status': 'fail', 'message': 'Record not found'}), 404

        cursor.close()
        conn.close()
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>")
        return "Success"

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_grievance_records', methods=['GET'])
def fetch_all_audio_records():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT id, source, edit_source, sentiment_anaylis, rating FROM audio_records')
        rows = cursor.fetchall()

        result = [{"id": row[0], "source": row[1], "edit_source": row[2], "sentiment_anaylis": row[3], "rating": row[4]} for row in rows]

        cursor.close()
        conn.close()

        return jsonify(result), 200

    except pg8000.DatabaseError as e:
        return jsonify({"error": "Database error occurred", "message": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='10.10.2.179', port='6162', debug=True)
