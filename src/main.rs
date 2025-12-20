use spotify_very_simple_rest::initialize::initialize_spotify_db;
use sqlx::SqlitePool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = SqlitePool::connect("sqlite://./spotify.db?mode=rwc").await?;

    let table_exists: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='track'")
        .fetch_one(&pool)
        .await?;

    if table_exists.0 == 0 {
        initialize_spotify_db(&pool, "./spotify_data.csv").await?;
    } else {
        println!("Database already initialized.");
    }

    Ok(())
}