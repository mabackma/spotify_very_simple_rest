use very_simple_rest::prelude::*;

use serde::{Serialize, Deserialize, Deserializer};
use sqlx::{SqlitePool, FromRow};
use csv::Reader;

fn bool_from_csv<'de, D>(deserializer: D) -> Result<Option<i32>, D::Error>
where
    D: Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s.as_deref() {
        //Some("TRUE") | Some("true") => Ok(Some(true)),
        //Some("FALSE") | Some("false") => Ok(Some(false)),
        Some("TRUE") | Some("true") => Ok(Some(1)),
        Some("FALSE") | Some("false") => Ok(Some(0)),
        Some(_) => Err(serde::de::Error::custom("invalid boolean")),
        None => Ok(None),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, RestApi)]
#[rest_api(table = "post", id = "id", db = "sqlite")]
#[require_role(read = "user", update = "user", patch = "user", delete = "user")]
pub struct Track {
    track_id: String,
    track_name: Option<String>,
    track_number: Option<i32>,
    track_popularity: Option<i32>,
    #[serde(deserialize_with = "bool_from_csv")]
    //explicit: Option<bool>,
    explicit: Option<i32>,
    artist_name: Option<String>,
    artist_popularity: Option<i32>,
    artist_followers: Option<i32>,
    artist_genres: Option<String>,
    album_id: Option<String>,
    album_name: Option<String>,
    album_release_date: Option<String>,
    album_total_tracks: Option<i32>,
    album_type: Option<String>,
    track_duration_min: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, RestApi)]
#[rest_api(table = "user", id = "id", db = "sqlite")]
#[require_role(read = "admin", update = "admin", delete = "admin")]
pub struct User {
    pub id: Option<i64>,
    pub email: String,
    pub password_hash: String,
    pub role: String,
}

pub async fn initialize_spotify_db(pool: &SqlitePool, csv_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Create table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS track (
            track_id TEXT PRIMARY KEY,
            track_name TEXT,
            track_number INTEGER,
            track_popularity INTEGER,
            explicit INTEGER,
            artist_name TEXT,
            artist_popularity INTEGER,
            artist_followers INTEGER,
            artist_genres TEXT,
            album_id TEXT,
            album_name TEXT,
            album_release_date TEXT,
            album_total_tracks INTEGER,
            album_type TEXT,
            track_duration_min REAL
        )"
    )
    .execute(pool)
    .await?;

    println!("Spotify database created");
    // Import CSV
    let mut rdr = Reader::from_path(csv_path)?;
    for result in rdr.deserialize() {
        let track: Track = result?;
        sqlx::query(
            "INSERT INTO track (
                track_id,
                track_name,
                track_number,
                track_popularity,
                explicit,
                artist_name,
                artist_popularity,
                artist_followers,
                artist_genres,
                album_id,
                album_name,
                album_release_date,
                album_total_tracks,
                album_type,
                track_duration_min
            )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&track.track_id)
        .bind(&track.track_name)
        .bind(&track.track_number)
        .bind(&track.track_popularity)
        //.bind(&track.explicit.map(|b| b as i64))
        .bind(&track.explicit)
        .bind(&track.artist_name)
        .bind(&track.artist_popularity)
        .bind(&track.artist_followers)
        .bind(&track.artist_genres)
        .bind(&track.album_id)
        .bind(&track.album_name)
        .bind(&track.album_release_date)
        .bind(&track.album_total_tracks)
        .bind(&track.album_type)
        .bind(&track.track_duration_min)
        .execute(pool)
        .await?;
    }
    println!("CSV imported.");
    
    Ok(())
}