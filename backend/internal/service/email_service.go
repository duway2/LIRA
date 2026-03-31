package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/lira/backend/internal/config"
)

type EmailService interface {
	SendEmail(toEmail, toName, subject, htmlContent string) error
	SendOTP(toEmail, toName, otpCode string) error
	SendResetPasswordEmail(toEmail, toName, resetLink string) error
	SendVerificationEmail(toEmail, toName, verifyLink string) error
	GetFrontendURL() string
}

type emailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	return &emailService{cfg: cfg}
}

type brevoPayload struct {
	Sender      sender      `json:"sender"`
	To          []recipient `json:"to"`
	Subject     string      `json:"subject"`
	HtmlContent string      `json:"htmlContent"`
}

type sender struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type recipient struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (s *emailService) SendEmail(toEmail, toName, subject, htmlContent string) error {
	if s.cfg.BrevoAPIKey == "" {
		return errors.New("brevo api key is not configured")
	}

	url := "https://api.brevo.com/v3/smtp/email"

	payload := brevoPayload{
		Sender: sender{
			Name:  s.cfg.EmailFromName,
			Email: s.cfg.EmailFrom,
		},
		To: []recipient{
			{Email: toEmail, Name: toName},
		},
		Subject:     subject,
		HtmlContent: htmlContent,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("api-key", s.cfg.BrevoAPIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to send email, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (s *emailService) SendOTP(toEmail, toName, otpCode string) error {
	subject := "Kode Verifikasi (OTP) LIRA Indonesia"
	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
			<h2 style="color: #C41E3A;">LUMBUNG INFORMASI RAKYAT (LIRA)</h2>
			<hr style="border: 1px solid #1A1A1A;"/>
			<p>Halo <strong>%s</strong>,</p>
			<p>Untuk alasan keamanan, berikut adalah kode OTP Anda. Kode ini hanya berlaku selama 5 menit.</p>
			<div style="background-color: #f5f5f5; padding: 20px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 8px;">
				%s
			</div>
			<p>PENTING: Jangan memberikan kode ini kepada siapapun termasuk pihak LIRA.</p>
			<p>Terima kasih,<br/>Sistem Keanggotaan LIRA</p>
		</div>
	`, toName, otpCode)

	return s.SendEmail(toEmail, toName, subject, htmlContent)
}

func (s *emailService) SendResetPasswordEmail(toEmail, toName, resetLink string) error {
	subject := "Reset Password LIRA Indonesia"
	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
			<h2 style="color: #C41E3A;">LUMBUNG INFORMASI RAKYAT (LIRA)</h2>
			<hr style="border: 1px solid #1A1A1A;"/>
			<p>Halo <strong>%s</strong>,</p>
			<p>Sistem kami menerima permintaan untuk mereset kata sandi akun Anda. Silakan klik tombol di bawah ini untuk mengganti password Anda secara aman:</p>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s" style="background-color: #C41E3A; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password Sekarang</a>
			</div>
			<p>Tautan ini hanya berlaku selama 15 menit. Jika Anda tidak merasa memintanya, abaikan email ini.</p>
			<p>Terima kasih,<br/>Tim Keamanan Sistem LIRA</p>
		</div>
	`, toName, resetLink)

	return s.SendEmail(toEmail, toName, subject, htmlContent)
}

func (s *emailService) SendVerificationEmail(toEmail, toName, verifyLink string) error {
	subject := "Verifikasi Pendaftaran Anggota LIRA Indonesia"
	htmlContent := fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
			<h2 style="color: #C41E3A;">SELAMAT DATANG DI LIRA</h2>
			<hr style="border: 1px solid #1A1A1A;"/>
			<p>Halo <strong>%s</strong>,</p>
			<p>Terima kasih telah mendaftar di portal Jurnalistik dan Keanggotaan Lumbung Informasi Rakyat. Sebelum Anda dapat masuk secara penuh, kami perlu memverifikasi kepemilikan alamat email ini.</p>
			<p>Silakan klik tautan aman di bawah ini untuk mengaktifkan akun Anda:</p>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s" style="background-color: #1A1A1A; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verifikasi Akun Saya</a>
			</div>
			<p>Tautan ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar, Anda bisa mengabaikan email ini.</p>
			<p>Merdeka!<br/>Tim Administrator LIRA</p>
		</div>
	`, toName, verifyLink)

	return s.SendEmail(toEmail, toName, subject, htmlContent)
}

func (s *emailService) GetFrontendURL() string {
	return s.cfg.FrontendURL
}
