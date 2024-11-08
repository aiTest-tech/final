CREATE TABLE IF NOT EXISTS audio_records (
    id SERIAL PRIMARY KEY,
    audio_base64 TEXT NOT NULL,
    source TEXT,
    edit_source TEXT,
    sentiment_anaylis NUMERIC
);
