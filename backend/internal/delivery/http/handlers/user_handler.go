package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lira/backend/internal/service"
)

type UserHandler struct {
	userSvc service.UserService
}

func NewUserHandler(userSvc service.UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

// UpdateMyProfile
func (h *UserHandler) UpdateMyProfile(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID := userIDVal.(int64)
	var req struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userSvc.UpdateProfile(userID, req.Email, req.Name, req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user": map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

// AdminResetUserPassword
func (h *UserHandler) AdminResetUserPassword(c *gin.Context) {
	var req struct {
		TargetUserID int64  `json:"target_user_id" binding:"required"`
		NewPassword  string `json:"new_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.userSvc.AdminResetPassword(req.TargetUserID, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User password force resetted successfully"})
}

// AdminGetUsers
func (h *UserHandler) AdminGetUsers(c *gin.Context) {
	users, err := h.userSvc.GetUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// AdminSetUserStatus (e.g. Reject user)
func (h *UserHandler) AdminSetUserStatus(c *gin.Context) {
	var req struct {
		TargetUserID int64 `json:"target_user_id" binding:"required"`
		IsActive   bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.userSvc.ManageUserStatus(req.TargetUserID, req.IsActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User status updated"})
}

func (h *UserHandler) AdminUpdateUser(c *gin.Context) {
	var req struct {
		TargetUserID int64  `json:"target_user_id" binding:"required"`
		Email        string `json:"email" binding:"required,email"`
		Name         string `json:"name" binding:"required"`
		Role         string `json:"role" binding:"required"`
		IsActive     bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.userSvc.AdminUpdateUser(
		req.TargetUserID,
		req.Email,
		req.Name,
		req.Role,
		req.IsActive,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated"})
}
