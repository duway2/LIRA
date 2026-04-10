package service

import (
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/repository"
	"github.com/lira/backend/pkg/utils"
	"github.com/skip2/go-qrcode"
)

type MemberService interface {
	GetMyProfile(userID int64) (*models.Member, error)
	GetMemberByID(memberID int64) (*models.Member, error)
	UpsertProfile(userID int64, req *models.MemberProfileRequest) (*models.Member, error)
	UpdatePhotos(userID int64, profilePhotoURL string, identityPhotoURL string) error
	GenerateDigitalID(userID int64) error
	SetMemberStatus(adminID int64, memberID int64, status string, skipPayment bool) error
	GetAllMembers() ([]models.Member, error)
}

type memberService struct {
	memberRepo  repository.MemberRepository
	userRepo    repository.UserRepository
	paymentRepo repository.PaymentRepository
	emailSvc    EmailService
}

func NewMemberService(
	memberRepo repository.MemberRepository,
	userRepo repository.UserRepository,
	paymentRepo repository.PaymentRepository,
	emailSvc EmailService,
) MemberService {
	return &memberService{
		memberRepo:  memberRepo,
		userRepo:    userRepo,
		paymentRepo: paymentRepo,
		emailSvc:    emailSvc,
	}
}

func (s *memberService) GetMyProfile(userID int64) (*models.Member, error) {
	return s.memberRepo.GetMemberByUserID(userID)
}

func (s *memberService) GetMemberByID(memberID int64) (*models.Member, error) {
	return s.memberRepo.GetMemberByID(memberID)
}

func (s *memberService) GetAllMembers() ([]models.Member, error) {
	return s.memberRepo.GetAllMembers()
}

func (s *memberService) UpsertProfile(userID int64, req *models.MemberProfileRequest) (*models.Member, error) {
	fullName := strings.TrimSpace(req.FullName)
	phone := strings.TrimSpace(req.Phone)
	city := strings.TrimSpace(req.City)
	province := strings.TrimSpace(req.Province)

	if fullName == "" || phone == "" || city == "" || province == "" {
		return nil, errors.New("profil wajib diisi lengkap: nama, nomor HP, kota/kabupaten, dan provinsi")
	}

	if !req.TermsAccepted {
		return nil, errors.New("anda harus menyetujui syarat dan ketentuan penyimpanan data")
	}

	member, err := s.memberRepo.GetMemberByUserID(userID)
	if err != nil {
		return nil, err
	}

	if member == nil {
		// Create new profile, status defaults to 'pending' from schema
		newMember := &models.Member{
			UserID:        userID,
			FullName:      &fullName,
			Phone:         &phone,
			City:          &city,
			Province:      &province,
			TermsAccepted: req.TermsAccepted,
			Bio:           &req.Bio,
			Status:        "pending",
		}
		err = s.memberRepo.CreateMember(newMember)
		if err != nil {
			return nil, err
		}
		return newMember, nil
	}

	// Update existing profile
	member.FullName = &fullName
	member.Phone = &phone
	member.City = &city
	member.Province = &province
	member.TermsAccepted = req.TermsAccepted
	member.Bio = &req.Bio

	err = s.memberRepo.UpdateMember(member)
	if err != nil {
		return nil, err
	}

	return member, nil
}

func (s *memberService) UpdatePhotos(userID int64, profilePhotoURL string, identityPhotoURL string) error {
	member, err := s.memberRepo.GetMemberByUserID(userID)
	if err != nil || member == nil {
		return errors.New("member profile not found")
	}

	if profilePhotoURL != "" {
		member.ProfilePhotoURL = &profilePhotoURL
	}
	if identityPhotoURL != "" {
		member.IdentityPhotoURL = &identityPhotoURL
	}

	return s.memberRepo.UpdateMember(member)
}

func memberCardStatusLabel(status string) string {
	if strings.EqualFold(strings.TrimSpace(status), "active") {
		return "Aktif"
	}

	return "Tidak Aktif"
}

func resolveUploadLocalPath(uploadURL string) string {
	cleaned := strings.TrimSpace(uploadURL)
	if cleaned == "" {
		return ""
	}

	if strings.HasPrefix(cleaned, "http://") || strings.HasPrefix(cleaned, "https://") {
		if parsed, err := url.Parse(cleaned); err == nil {
			cleaned = parsed.Path
		}
	}

	cleaned = strings.TrimPrefix(cleaned, "/")
	cleaned = strings.TrimPrefix(cleaned, "api/v1/")
	cleaned = strings.TrimPrefix(cleaned, "uploads/")
	if cleaned == "" {
		return ""
	}

	return filepath.Join(utils.GetUploadsRootDir(), filepath.FromSlash(cleaned))
}

func (s *memberService) GenerateDigitalID(userID int64) error {
	member, err := s.memberRepo.GetMemberByUserID(userID)
	if err != nil || member == nil {
		return errors.New("member not found")
	}

	if member.Status != "active" {
		return errors.New("member is not active, cannot generate ID Card")
	}

	if member.MemberCode == nil || strings.TrimSpace(*member.MemberCode) == "" {
		fallbackMemberCode := fmt.Sprintf("LIRA-%d-%d", time.Now().Year(), member.ID)
		member.MemberCode = &fallbackMemberCode
	}

	memberName := "ANGGOTA LIRA"
	if member.FullName != nil && strings.TrimSpace(*member.FullName) != "" {
		memberName = *member.FullName
	}

	frontendBaseURL := strings.TrimRight(s.emailSvc.GetFrontendURL(), "/")
	if frontendBaseURL == "" {
		frontendBaseURL = "http://localhost:3000"
	}

	// Construct member verification URL for QR
	barcodeData := fmt.Sprintf("%s/member/%d", frontendBaseURL, member.ID)
	member.BarcodeData = &barcodeData

	// 1. Generate QR Code
	qrDir, err := utils.EnsureUploadSubDir("barcodes")
	if err != nil {
		return fmt.Errorf("failed to prepare barcode directory: %v", err)
	}
	qrPath := filepath.Join(qrDir, fmt.Sprintf("%d.png", userID))

	err = qrcode.WriteFile(barcodeData, qrcode.Medium, 256, qrPath)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %v", err)
	}

	// 2. Generate PDF ID Card
	pdfDir, err := utils.EnsureUploadSubDir("idcards")
	if err != nil {
		return fmt.Errorf("failed to prepare id card directory: %v", err)
	}
	pdfPath := filepath.Join(pdfDir, fmt.Sprintf("%d.pdf", userID))

	// LIRA Colors: Merah (#C41E3A), Hitam (#1A1A1A), Emas (#FFD700)
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		UnitStr: "mm",
		Size:    gofpdf.SizeType{Wd: 85.6, Ht: 54.0}, // Standard CR80 ID Card size
	})
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)

	pdf.AddPage()

	// Background Hitam
	pdf.SetFillColor(26, 26, 26) // #1A1A1A
	pdf.Rect(0, 0, 85.6, 54.0, "F")

	// Latar Belakang Aksen Merah di Atas
	pdf.SetFillColor(196, 30, 58) // #C41E3A
	pdf.Rect(0, 0, 85.6, 12.0, "F")

	// Header LIRA Text
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(255, 215, 0) // Gold #FFD700
	pdf.SetXY(5, 3)
	pdf.CellFormat(75.6, 6, "LUMBUNG INFORMASI RAKYAT", "", 0, "C", false, 0, "")

	// Member Info
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetXY(25, 18)
	pdf.CellFormat(55, 5, memberName, "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(200, 200, 200)
	pdf.SetXY(25, 24)
	pdf.CellFormat(55, 4, fmt.Sprintf("ID: %s", *member.MemberCode), "", 0, "L", false, 0, "")

	cityProv := ""
	if member.City != nil && member.Province != nil {
		cityProv = fmt.Sprintf("%s, %s", *member.City, *member.Province)
	} else if member.City != nil {
		cityProv = *member.City
	}

	pdf.SetXY(25, 29)
	pdf.CellFormat(55, 4, cityProv, "", 0, "L", false, 0, "")

	expiry := ""
	if member.MembershipExpiry != nil {
		expiry = member.MembershipExpiry.Format("02 Jan 2006")
	}
	pdf.SetXY(25, 34)
	pdf.CellFormat(55, 4, fmt.Sprintf("Berlaku s/d: %s", expiry), "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 8)
	if strings.EqualFold(strings.TrimSpace(member.Status), "active") {
		pdf.SetTextColor(102, 255, 153)
	} else {
		pdf.SetTextColor(255, 178, 178)
	}
	pdf.SetXY(25, 39)
	pdf.CellFormat(36, 4, fmt.Sprintf("Status: %s", memberCardStatusLabel(member.Status)), "", 0, "L", false, 0, "")

	// Embed Profile Photo (if exists and is local png/jpg)
	if member.ProfilePhotoURL != nil && *member.ProfilePhotoURL != "" {
		photoLocalPath := resolveUploadLocalPath(*member.ProfilePhotoURL)
		if photoLocalPath != "" {
			if _, err := os.Stat(photoLocalPath); err == nil {
				var opt gofpdf.ImageOptions
				opt.ImageType = "" // Auto-detect
				pdf.ImageOptions(photoLocalPath, 5, 18, 18, 24, false, opt, 0, "")
			} else {
				// Placeholder foto jika tidak ketemu file lokalnya
				pdf.SetFillColor(50, 50, 50)
				pdf.Rect(5, 18, 18, 24, "F")
			}
		} else {
			pdf.SetFillColor(50, 50, 50)
			pdf.Rect(5, 18, 18, 24, "F")
		}
	} else {
		pdf.SetFillColor(50, 50, 50)
		pdf.Rect(5, 18, 18, 24, "F")
	}

	// Embed QR Code
	var optQR gofpdf.ImageOptions
	optQR.ImageType = "PNG"
	pdf.ImageOptions(qrPath, 65, 35, 15, 15, false, optQR, 0, "")

	// Footer Accent Gold Edge
	pdf.SetFillColor(255, 215, 0) // Gold
	pdf.Rect(0, 52, 85.6, 2, "F")

	err = pdf.OutputFileAndClose(pdfPath)
	if err != nil {
		return fmt.Errorf("failed to generate PDF: %v", err)
	}

	return s.memberRepo.UpdateMember(member)
}

func (s *memberService) generateInvoicePDF(member *models.Member, payment *models.Payment) (string, error) {
	invoiceDir, err := utils.EnsureUploadSubDir("invoices")
	if err != nil {
		return "", fmt.Errorf("failed to prepare invoice directory: %v", err)
	}

	fileName := fmt.Sprintf("%s.pdf", payment.OrderID)
	filePath := filepath.Join(invoiceDir, fileName)

	memberName := "Member LIRA"
	if member.FullName != nil && strings.TrimSpace(*member.FullName) != "" {
		memberName = *member.FullName
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(196, 30, 58)
	pdf.Cell(190, 10, "INVOICE KEANGGOTAAN LIRA")
	pdf.Ln(14)

	pdf.SetFont("Arial", "", 11)
	pdf.SetTextColor(40, 40, 40)
	pdf.Cell(190, 8, fmt.Sprintf("Order ID: %s", payment.OrderID))
	pdf.Ln(7)
	pdf.Cell(190, 8, fmt.Sprintf("Tanggal Pembayaran: %s", payment.CreatedAt.Format("02 Jan 2006 15:04")))
	pdf.Ln(7)
	pdf.Cell(190, 8, fmt.Sprintf("Nama Member: %s", memberName))
	pdf.Ln(7)

	if member.MemberCode != nil && strings.TrimSpace(*member.MemberCode) != "" {
		pdf.Cell(190, 8, fmt.Sprintf("Kode Member: %s", *member.MemberCode))
		pdf.Ln(7)
	}

	pdf.Ln(6)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(130, 9, "Deskripsi")
	pdf.CellFormat(60, 9, "Nominal", "", 0, "R", false, 0, "")
	pdf.Ln(9)

	pdf.SetFont("Arial", "", 11)
	pdf.Cell(130, 9, "Iuran Keanggotaan Penuh LIRA (1 Tahun)")
	pdf.CellFormat(60, 9, fmt.Sprintf("Rp %.0f", payment.Amount), "", 0, "R", false, 0, "")
	pdf.Ln(11)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(130, 9, "Total")
	pdf.CellFormat(60, 9, fmt.Sprintf("Rp %.0f", payment.Amount), "", 0, "R", false, 0, "")
	pdf.Ln(14)

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(90, 90, 90)
	pdf.MultiCell(190, 6, "Pembayaran ini telah dikonfirmasi. Simpan invoice ini sebagai bukti pembayaran resmi keanggotaan LIRA.", "", "L", false)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return "", fmt.Errorf("failed to generate invoice PDF: %v", err)
	}

	return "/uploads/invoices/" + fileName, nil
}

func (s *memberService) SetMemberStatus(adminID int64, memberID int64, status string, skipPayment bool) error {
	member, err := s.memberRepo.GetMemberByID(memberID)
	if err != nil || member == nil {
		return errors.New("member not found")
	}

	if status != "active" && status != "rejected" {
		return errors.New("status verification must be active or rejected")
	}

	var successfulPayment *models.Payment
	if status == "active" {
		if member.IdentityPhotoURL == nil || strings.TrimSpace(*member.IdentityPhotoURL) == "" {
			return errors.New("foto KTP wajib diunggah sebelum approval")
		}

		if !member.TermsAccepted {
			return errors.New("member belum menyetujui syarat dan ketentuan")
		}

		successfulPayment, err = s.paymentRepo.GetLatestSuccessfulPaymentByMemberID(member.ID)
		if err != nil {
			return err
		}

		if successfulPayment == nil && !skipPayment {
			return errors.New("member belum memiliki pembayaran sukses")
		}
	}

	member.Status = status

	if status == "active" {
		now := time.Now()

		if member.MembershipStart == nil {
			member.MembershipStart = &now
		}

		if member.MembershipExpiry == nil {
			expiry := now.AddDate(1, 0, 0) // 1 year membership
			member.MembershipExpiry = &expiry
		}

		if member.MemberCode == nil || strings.TrimSpace(*member.MemberCode) == "" {
			memberCode := fmt.Sprintf("LIRA-%d-%d", now.Year(), member.ID)
			member.MemberCode = &memberCode
		}
	}

	err = s.memberRepo.UpdateMember(member)
	if err != nil {
		return err
	}

	// Kirim email notifikasi ke user (bergabung dengan Users tabel untuk ambil email)
	user, err := s.userRepo.GetUserByID(member.UserID)
	if err == nil && user != nil {
		memberName := "Member LIRA"
		if member.FullName != nil && strings.TrimSpace(*member.FullName) != "" {
			memberName = *member.FullName
		}

		if status == "active" {
			if err := s.GenerateDigitalID(member.UserID); err != nil {
				return err
			}
			baseURL := strings.TrimRight(s.emailSvc.GetFrontendURL(), "/")
			cardLink := fmt.Sprintf("%s/api/v1/uploads/idcards/%d.pdf", baseURL, member.UserID)

			htmlBody := ""
			if successfulPayment != nil {
				invoiceURL, err := s.generateInvoicePDF(member, successfulPayment)
				if err != nil {
					return err
				}

				if err := s.paymentRepo.UpdatePaymentInvoiceURL(successfulPayment.OrderID, invoiceURL); err != nil {
					return err
				}

				invoiceLink := fmt.Sprintf("%s%s", baseURL, invoiceURL)
				htmlBody = fmt.Sprintf(`<p>Selamat! Akun keanggotaan LIRA Anda telah disetujui admin dan aktif.</p>
					<p>Invoice pembayaran dan Kartu Anggota Digital Anda telah tersedia:</p>
					<ul>
						<li><a href="%s" style="color:#C41E3A;font-weight:bold;">Unduh Invoice Keanggotaan</a></li>
						<li><a href="%s" style="color:#C41E3A;font-weight:bold;">Unduh Kartu Member LIRA</a></li>
					</ul>
					<p>Terima kasih telah bergabung bersama LIRA Indonesia.</p>`, invoiceLink, cardLink)
			} else {
				htmlBody = fmt.Sprintf(`<p>Selamat! Akun keanggotaan LIRA Anda telah disetujui admin dan aktif.</p>
					<p>Aktivasi dilakukan oleh admin tanpa transaksi pembayaran. Kartu Anggota Digital Anda telah tersedia:</p>
					<ul>
						<li><a href="%s" style="color:#C41E3A;font-weight:bold;">Unduh Kartu Member LIRA</a></li>
					</ul>
					<p>Terima kasih telah bergabung bersama LIRA Indonesia.</p>`, cardLink)
			}

			if err := s.emailSvc.SendEmail(user.Email, memberName, "Keanggotaan LIRA Disetujui", htmlBody); err != nil {
				log.Printf("warning: failed to send member approval email to %s: %v", user.Email, err)
			}
		} else if status == "rejected" {
			if err := s.emailSvc.SendEmail(user.Email, memberName, "Pembaruan Status Keanggotaan LIRA",
				"<p>Mohon maaf, pengajuan keanggotaan Anda saat ini Ditolak. Hubungi pengurus regional untuk informasi lebih lanjut.</p>"); err != nil {
				log.Printf("warning: failed to send member rejection email to %s: %v", user.Email, err)
			}
		}
	}

	return nil
}
