package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/service"
)

type PaymentHandler struct {
	paymentSvc service.PaymentService
	memberSvc  service.MemberService // To get user details
}

func NewPaymentHandler(paymentSvc service.PaymentService, memberSvc service.MemberService) *PaymentHandler {
	return &PaymentHandler{
		paymentSvc: paymentSvc,
		memberSvc:  memberSvc,
	}
}

func (h *PaymentHandler) Checkout(c *gin.Context) {
	userID := c.GetInt64("userID")

	// Get Member details to populate CustomerDetail
	member, err := h.memberSvc.GetMyProfile(userID)
	if err != nil || member == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Member profile empty. Cannot checkout."})
		return
	}

	if member.Status == "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Keanggotaan Anda sudah aktif. Tidak perlu pembayaran ulang saat ini."})
		return
	}

	var missing []string
	if member.FullName == nil || strings.TrimSpace(*member.FullName) == "" {
		missing = append(missing, "Nama lengkap sesuai KTP")
	}
	if member.Phone == nil || strings.TrimSpace(*member.Phone) == "" {
		missing = append(missing, "Nomor handphone")
	}
	if member.Province == nil || strings.TrimSpace(*member.Province) == "" {
		missing = append(missing, "Provinsi")
	}
	if member.City == nil || strings.TrimSpace(*member.City) == "" {
		missing = append(missing, "Kota/Kabupaten")
	}
	if member.IdentityPhotoURL == nil || strings.TrimSpace(*member.IdentityPhotoURL) == "" {
		missing = append(missing, "Upload foto KTP")
	}
	if !member.TermsAccepted {
		missing = append(missing, "Persetujuan syarat dan ketentuan")
	}

	if len(missing) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "Profil belum lengkap untuk checkout membership",
			"missing_fields": missing,
		})
		return
	}

	// Get User's name/email. Since Member struct might not carry email,
	// we use full_name for both name and dummy email if needed, or extract from request context context.
	userEmail := c.GetString("userEmail") // Needs to be injected by JWT or queried
	if userEmail == "" {
		userEmail = "member@lira.org"
	}

	memberName := "Member LIRA"
	if member.FullName != nil {
		memberName = *member.FullName
	}

	token, err := h.paymentSvc.CreateTransaction(member.ID, memberName, userEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate payment token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"snap_token": token,
		"amount":     h.paymentSvc.GetAnnualMembershipFee(),
	})
}

// Webhook destination for Midtrans to hit asynchronously
func (h *PaymentHandler) MidtransWebhook(c *gin.Context) {
	var payload models.MidtransNotificationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification payload"})
		return
	}

	err := h.paymentSvc.ProcessNotification(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
