use very_simple_rest::prelude::*;

use spotify_very_simple_rest::initialize::{User, Track, initialize_spotify_db};
use sqlx::SqlitePool;

fn log_available_endpoints() {
    let id = "1";
    info!("===== Available API Endpoints =====");

    // Auth endpoints
    info!("Authentication:");
    info!("  POST   /api/auth/register  - Register a new user");
    info!("  POST   /api/auth/login     - Login and get a JWT token");
    info!("  GET    /api/auth/me        - Get authenticated user info");

    // User endpoints
    info!("Users (requires admin role):");
    info!("  GET    /api/user          - Get all users");
    info!("  GET    /api/user/{id}     - Get user by ID");
    info!("  POST   /api/user          - Create a new user");
    info!("  PUT    /api/user/{id}     - Update user");
    info!("  DELETE /api/user/{id}     - Delete user");

    // Track endpoints
    info!("Tracks (requires user role):");
    info!("  GET    /api/track          - Get all tracks");
    info!("  GET    /api/track/{id}     - Get track by ID");
    info!("  POST   /api/track          - Create a new track");
    info!("  PUT    /api/track/{id}     - Update track");
    info!("  PATCH  /api/track/{id}     - Update track");
    info!("  DELETE /api/track/{id}     - Delete track");

    info!("=====================================");
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    initialize_database().await.unwrap();

    // Initialize logger
    env_logger::Builder::from_env(Env::default().default_filter_or("info"))
        .format_timestamp_secs()
        .init();

    info!("Initializing REST API server...");

    sqlx::any::install_default_drivers();

    info!("Connecting to database...");
    let pool = AnyPool::connect("sqlite://./spotify.db?mode=rwc").await.unwrap();
    info!("Database connection established");

    // Tables will be automatically created by the RestApi macro
    info!("Configuring server with automatic table creation...");

    let server_pool = pool.clone();
    let server = HttpServer::new(move || {
        // Configure CORS for frontend
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .wrap(DefaultHeaders::new().add(("X-Version", "0.1.0")))
            // Api routes
            .service(
                scope("/api")
                    .configure(|cfg| auth::auth_routes(cfg, server_pool.clone()))
                    .configure(|cfg| User::configure(cfg, server_pool.clone()))
                    .configure(|cfg| Track::configure(cfg, server_pool.clone())),
            )
            // Serve static files from the public directory
            .service(fs::Files::new("/", "demo/public").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?;

    // Check for admin user or create one interactively if needed
    info!("Checking for admin user...");
    match auth::ensure_admin_exists(&pool).await {
        Ok(true) => info!("Admin user is ready for login"),
        Ok(false) => {
            error!("Failed to create admin user - shutting down");
            return Ok(());
        }
        Err(e) => {
            error!(
                "Database error when checking/creating admin user: {} - shutting down",
                e
            );
            return Ok(());
        }
    }

    // Log available endpoints
    log_available_endpoints();

    info!("Server starting at http://127.0.0.1:8080");
    server.run().await
}

async fn initialize_database() -> Result<(), Box<dyn std::error::Error>> {
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