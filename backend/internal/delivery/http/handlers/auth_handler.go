package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lira/backend/internal/config"
	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/service"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type AuthHandler struct {
	authService service.AuthService
	cfg         *config.Config
	oauthConfig *oauth2.Config
}

func NewAuthHandler(authService service.AuthService, cfg *config.Config) *AuthHandler {
	oauthConf := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
	return &AuthHandler{
		authService: authService,
		cfg:         cfg,
		oauthConfig: oauthConf,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authService.Register(&req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, requiresOTP, err := h.authService.Login(&req, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if requiresOTP {
		c.JSON(http.StatusOK, gin.H{
			"message":      "OTP has been sent to your email",
			"requires_otp": true,
			"email":        user.Email,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": map[string]interface{}{
			"id":     user.ID,
			"email":  user.Email,
			"name":   user.Name,
			"role":   user.Role,
			"is_2fa": user.Is2FAEnabled,
		},
	})
}

// Verify2FALogin receives an OTP to complete authentication
func (h *AuthHandler) Verify2FALogin(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, err := h.authService.Verify2FALogin(req.Email, req.Code, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login verified via 2FA",
		"token":   token,
		"user": map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

// Toggle2FA allows currently logged-in user to turn 2FA on/off
func (h *AuthHandler) Toggle2FA(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID, ok := userIDVal.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
		return
	}

	var req struct {
		Enable bool `json:"enable"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.authService.Toggle2FA(userID, req.Enable)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "2FA status updated"})
}

// GoogleLogin redirects the user to the Google OAuth consent screen
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OAuth state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(b)
	// Optionally, store state in cookie to validate against CSRF.
	// Force account chooser so users can switch account after logout.
	authURL := h.oauthConfig.AuthCodeURL(
		state,
		oauth2.SetAuthURLParam("prompt", "select_account"),
		oauth2.SetAuthURLParam("include_granted_scopes", "true"),
	)
	c.Redirect(http.StatusFound, authURL)
}

// GoogleLogout signs user out from Google session and returns to login page.
func (h *AuthHandler) GoogleLogout(c *gin.Context) {
	frontendBase := strings.TrimRight(h.cfg.FrontendURL, "/")
	if frontendBase == "" {
		frontendBase = "http://localhost:3000"
	}

	returnURL := fmt.Sprintf("%s/auth/login?logged_out=1", frontendBase)
	googleLogoutURL := "https://accounts.google.com/Logout?continue=" +
		url.QueryEscape("https://appengine.google.com/_ah/logout?continue="+url.QueryEscape(returnURL))

	c.Redirect(http.StatusFound, googleLogoutURL)
}

// GoogleCallback handles the returning user from Google OAuth
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	// Normally we would validate the state parameter here
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code not found"})
		return
	}

	token, err := h.oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to exchange token"})
		return
	}

	client := h.oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		Id    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
		return
	}

	jwtToken, user, err := h.authService.GoogleLoginCallback(userInfo.Email, userInfo.Name, userInfo.Id, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// We redirect back to frontend with the token
	// Frontend must extract from URL params (in production, better use HTTP-Only secure cookies)
	frontendBase := strings.TrimRight(h.cfg.FrontendURL, "/")
	redirectURL := fmt.Sprintf("%s/auth/login?token=%s&role=%s",
		frontendBase,
		url.QueryEscape(jwtToken),
		url.QueryEscape(user.Role),
	)
	c.Redirect(http.StatusFound, redirectURL)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	// We purposely ignore any returned error so we don't leak information
	h.authService.ForgotPassword(req.Email, h.cfg.FrontendURL)
	c.JSON(http.StatusOK, gin.H{"message": "Jika email terdaftar, instruksi reset telah dikirim."})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload tidak valid"})
		return
	}

	err := h.authService.ResetPassword(req.Token, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui. Silakan login."})
}

func (h *AuthHandler) VerifyAccount(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token tidak valid atau kosong"})
		return
	}

	err := h.authService.VerifyAccount(req.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Akun berhasil diverifikasi! Anda sekarang dapat masuk."})
}
