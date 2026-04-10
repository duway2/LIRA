package main

import (
	"log"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/lira/backend/internal/config"
	"github.com/lira/backend/internal/delivery/http/handlers"
	"github.com/lira/backend/internal/delivery/http/middleware"
	"github.com/lira/backend/internal/repository"
	"github.com/lira/backend/internal/service"
	"github.com/lira/backend/pkg/database"
	"github.com/lira/backend/pkg/utils"
)

func main() {
	// Initialize Config
	cfg := config.LoadConfig()

	// Connect to MySQL
	db, err := database.ConnectMySQL(cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName)
	if err != nil {
		log.Fatalf("Could not connect to database: %v", err)
	}
	defer db.Close()

	// Connect to Redis
	redisClient, err := database.ConnectRedis(cfg.RedisHost, cfg.RedisPort, cfg.RedisPass)
	if err != nil {
		log.Printf("Warning: Redis failed to connect: %v (2FA and caching will fail)", err)
	}

	// Initialize Dependencies
	userRepo := repository.NewUserRepository(db)

	emailService := service.NewEmailService(cfg)
	otpService := service.NewOTPService(redisClient, emailService)
	authService := service.NewAuthService(userRepo, otpService)
	authHandler := handlers.NewAuthHandler(authService, cfg)

	userService := service.NewUserService(userRepo, emailService)
	userHandler := handlers.NewUserHandler(userService)

	memberRepo := repository.NewMemberRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	memberService := service.NewMemberService(memberRepo, userRepo, paymentRepo, emailService)
	memberHandler := handlers.NewMemberHandler(memberService)

	articleRepo := repository.NewArticleRepository(db)
	articleService := service.NewArticleService(articleRepo, memberRepo)
	articleHandler := handlers.NewArticleHandler(articleService)

	paymentService := service.NewPaymentService(paymentRepo, memberRepo, cfg.MidtransServerKey)
	paymentHandler := handlers.NewPaymentHandler(paymentService, memberService)

	// Router setup
	r := gin.Default()

	allowedOrigins := map[string]bool{
		strings.TrimRight(cfg.FrontendURL, "/"): true,
		"http://localhost:3000":             true,
		"http://127.0.0.1:3000":             true,
	}

	// Expose Static /uploads directory
	handlers.ServeUploads(r)

	// CORS Middleware (basic implementation)
	r.Use(func(c *gin.Context) {
		origin := strings.TrimRight(c.GetHeader("Origin"), "/")
		defaultOrigin := strings.TrimRight(cfg.FrontendURL, "/")

		if origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", defaultOrigin)
		} else if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Vary", "Origin")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// V1 API Group
	v1 := r.Group("/api/v1")
	{
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "LIRA monolith API is running",
			})
		})
		v1.Static("/uploads", utils.GetUploadsRootDir())
		v1.GET("/members/public/:id", memberHandler.PublicMemberStatus)

		// Protected Route Example
		v1.GET("/protected", middleware.RequireAuth(cfg.JWTSecret), func(c *gin.Context) {
			userID, _ := c.Get("userID")
			role, _ := c.Get("userRole")
			c.JSON(200, gin.H{
				"message": "You have access to protected data!",
				"user_id": userID,
				"role":    role,
			})
		})

		// Auth Routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/2fa/verify", authHandler.Verify2FALogin)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			auth.POST("/verify-account", authHandler.VerifyAccount)
			auth.POST("/2fa/toggle", middleware.RequireAuth(cfg.JWTSecret), authHandler.Toggle2FA)
			auth.GET("/google/login", authHandler.GoogleLogin)
			auth.GET("/google/logout", authHandler.GoogleLogout)
			auth.GET("/google/callback", authHandler.GoogleCallback)
		}

		userRouter := v1.Group("/users", middleware.RequireAuth(cfg.JWTSecret))
		{
			userRouter.PUT("/profile", userHandler.UpdateMyProfile)
		}

		adminRouter := v1.Group("/admin/users", middleware.RequireAuth(cfg.JWTSecret), middleware.RequireRole("admin"))
		{
			adminRouter.GET("/", userHandler.AdminGetUsers)
			adminRouter.POST("/reset-password", userHandler.AdminResetUserPassword)
			adminRouter.POST("/status", userHandler.AdminSetUserStatus)
		}

		adminMembersRouter := v1.Group("/admin/members", middleware.RequireAuth(cfg.JWTSecret), middleware.RequireRole("admin"))
		{
			adminMembersRouter.GET("", memberHandler.AdminGetMembers)
			adminMembersRouter.POST("/:id/verify", memberHandler.AdminVerifyMember)
		}

		memberRouter := v1.Group("/members", middleware.RequireAuth(cfg.JWTSecret))
		{
			memberRouter.GET("/profile", memberHandler.GetMyProfile)
			memberRouter.PUT("/profile", memberHandler.UpsertMyProfile)
			memberRouter.POST("/upload", memberHandler.UploadDocument)
			memberRouter.POST("/generate-id", memberHandler.GenerateIDCard)
		}

		// --- Article CMS Module ---
		publicArticles := v1.Group("/articles")
		{
			publicArticles.GET("", articleHandler.GetPublicArticles)
			publicArticles.GET("/", articleHandler.GetPublicArticles)
			publicArticles.GET("/:slug", articleHandler.GetArticleBySlug)
		}
		v1.GET("/categories", articleHandler.GetCategories)

		protectedArticles := v1.Group("/articles", middleware.RequireAuth(cfg.JWTSecret))
		{
			protectedArticles.POST("/", articleHandler.CreateArticle)
			protectedArticles.POST("/upload-image", articleHandler.UploadImage)
		}

		v1.GET("/me/articles", middleware.RequireAuth(cfg.JWTSecret), articleHandler.GetMyArticles)

		editorArticles := v1.Group("/admin/articles", middleware.RequireAuth(cfg.JWTSecret))
		{
			editorArticles.GET("", articleHandler.AdminGetArticles)
			editorArticles.GET("/", articleHandler.AdminGetArticles)
			editorArticles.POST("/:id/review", articleHandler.ReviewArticle)
		}

		// --- Payment Module ---
		protectedPayment := v1.Group("/payments", middleware.RequireAuth(cfg.JWTSecret))
		{
			protectedPayment.POST("/checkout", paymentHandler.Checkout)
		}
		// Public Webhook listener for Midtrans Server
		v1.POST("/webhooks/midtrans", paymentHandler.MidtransWebhook)
	}

	log.Printf("Starting Monolith Server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
