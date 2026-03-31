package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {

	Port               string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPass             string
	DBName             string
	RedisHost          string
	RedisPort          string
	RedisPass          string
	JWTSecret          string
	FrontendURL        string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	BrevoAPIKey        string
	EmailFrom          string
	EmailFromName      string
	MidtransServerKey  string
	MidtransClientKey  string
}

func LoadConfig() *Config {
	// Try common env paths for both local dev and deployed runtime.
	envCandidates := []string{
		os.Getenv("LIRA_ENV_FILE"),
		"../../../.env", // repo root when running from backend/cmd/api
		"../../.env",    // backend/.env when running from backend/cmd/api
		".env",          // current working directory fallback
	}

	loaded := false
	for _, candidate := range envCandidates {
		if candidate == "" {
			continue
		}

		if _, err := os.Stat(candidate); err == nil {
			if err := godotenv.Load(candidate); err == nil {
				loaded = true
				break
			}
		}
	}

	if !loaded {
		log.Println("Warning: No .env file found, using OS env variables")
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		DBHost:             getEnv("DB_HOST", "127.0.0.1"),
		DBPort:             getEnv("DB_PORT", "3306"),
		DBUser:             getEnv("DB_USER", "root"),
		DBPass:             getEnv("DB_PASSWORD", ""),
		DBName:             getEnv("DB_NAME", "lira_db"),
		RedisHost:          getEnv("REDIS_HOST", "127.0.0.1"),
		RedisPort:          getEnv("REDIS_PORT", "6379"),
		RedisPass:          getEnv("REDIS_PASSWORD", ""),
		JWTSecret:          getEnv("JWT_SECRET", "secret"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		BrevoAPIKey:        getEnv("BREVO_API_KEY", ""),
		EmailFrom:          getEnv("EMAIL_FROM", "noreply@lira-indonesia.org"),
		EmailFromName:      getEnv("EMAIL_FROM_NAME", "LIRA Indonesia"),
		MidtransServerKey:  getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey:  getEnv("MIDTRANS_CLIENT_KEY", ""),
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
