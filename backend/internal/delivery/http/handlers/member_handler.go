package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/service"
)

type MemberHandler struct {
	memberSvc service.MemberService
}

func NewMemberHandler(memberSvc service.MemberService) *MemberHandler {
	return &MemberHandler{memberSvc: memberSvc}
}

func (h *MemberHandler) GetMyProfile(c *gin.Context) {
	userID := c.GetInt64("userID")
	member, err := h.memberSvc.GetMyProfile(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	if member == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found. Please setup profile."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": member})
}

func (h *MemberHandler) UpsertMyProfile(c *gin.Context) {
	userID := c.GetInt64("userID")
	
	var req models.MemberProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	member, err := h.memberSvc.UpsertProfile(userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile saved", "profile": member})
}

func (h *MemberHandler) UploadDocument(c *gin.Context) {
	userID := c.GetInt64("userID")
	docType := c.PostForm("type") // "profile" or "identity"

	if docType != "profile" && docType != "identity" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sort of document type"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	if file.Size > 5*1024*1024 { // 5MB limit
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 5MB"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG/PNG images are allowed"})
		return
	}

	// Upload Directory Creation
	uploadDir := "./uploads/members"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create upload directory"})
		return
	}

	filename := fmt.Sprintf("%d_%s%s", userID, docType, ext)
	dst := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	fileURL := "/uploads/members/" + filename

	var profileURL, identityURL string
	if docType == "profile" {
		profileURL = fileURL
	} else {
		identityURL = fileURL
	}

	err = h.memberSvc.UpdatePhotos(userID, profileURL, identityURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully", "url": fileURL})
}

func (h *MemberHandler) GenerateIDCard(c *gin.Context) {
	userID := c.GetInt64("userID")
	err := h.memberSvc.GenerateDigitalID(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Digital ID Generated (Implementation Pending)"})
}

func (h *MemberHandler) PublicMemberStatus(c *gin.Context) {
	memberID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || memberID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid member id"})
		return
	}

	member, err := h.memberSvc.GetMemberByID(memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if member == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "member not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"member": gin.H{
			"id":                member.ID,
			"member_code":       member.MemberCode,
			"full_name":         member.FullName,
			"status":            member.Status,
			"is_active":         strings.EqualFold(member.Status, "active"),
			"city":              member.City,
			"province":          member.Province,
			"membership_expiry": member.MembershipExpiry,
			"barcode_data":      member.BarcodeData,
		},
	})
}

// For serve static
func ServeUploads(router *gin.Engine) {
	router.Static("/uploads", "./uploads")
}

// --- Admin Endpoints ---

func (h *MemberHandler) AdminGetMembers(c *gin.Context) {
	members, err := h.memberSvc.GetAllMembers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

func (h *MemberHandler) AdminVerifyMember(c *gin.Context) {
	adminID := c.GetInt64("userID")
	
	// parse ID from numeric param /members/:id/verify
	memberIDStr := c.Param("id")
	var memberID int64
	fmt.Sscanf(memberIDStr, "%d", &memberID)
	
	var req struct {
		Status      string `json:"status" binding:"required"` // active, rejected
		SkipPayment bool   `json:"skip_payment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.memberSvc.SetMemberStatus(adminID, memberID, req.Status, req.SkipPayment)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member status updated to " + req.Status})
}
