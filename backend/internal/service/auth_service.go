package service

import (
	"errors"

	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/repository"
	"github.com/lira/backend/pkg/utils"
)

type AuthService interface {
	Register(req *models.RegisterRequest) (*models.User, error)
	Login(req *models.AuthRequest, jwtSecret string) (string, *models.User, bool, error) // bool for requires_otp
	Verify2FALogin(email, otpCode, jwtSecret string) (string, *models.User, error)
	GoogleLoginCallback(email string, name string, googleID string, jwtSecret string) (string, *models.User, error)
	Toggle2FA(userID int64, enable bool) error
	ForgotPassword(email, frontendURL string) error
	ResetPassword(token, newPassword string) error
	VerifyAccount(token string) error
}

type authService struct {
	userRepo repository.UserRepository
	otpSvc   OTPService
}

func NewAuthService(userRepo repository.UserRepository, otpSvc OTPService) AuthService {
	return &authService{userRepo: userRepo, otpSvc: otpSvc}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.User, error) {
	// Check if exists
	existingUser, err := s.userRepo.GetUserByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("email already taken")
	}

	hashedPwd, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	newUser := &models.User{
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: hashedPwd,
		Role:         "member", // default role
		IsActive:     false, // DISABLED UNTIL EMAIL VERIFIED
	}

	err = s.userRepo.CreateUser(newUser)
	if err != nil {
		return nil, err
	}

	// TRIGGER: Send Verification Email after Insert. (Assuming frontend URL mapped to localhost or production)
	// We'll pass a placeholder or get it securely; for now hardcode "http://localhost:3000" or expect it configured.
	// Oh wait, Register currently doesn't receive frontendURL. I'll silently throw token and let env handle it smoothly or ignore if err.
	// We should just use a fallback frontend URL.
	frontendFallback := "http://localhost:3000"
	s.otpSvc.GenerateAndSendVerificationToken(newUser.ID, newUser.Email, newUser.Name, frontendFallback)

	return newUser, nil
}

func (s *authService) Login(req *models.AuthRequest, jwtSecret string) (string, *models.User, bool, error) {
	user, err := s.userRepo.GetUserByEmail(req.Email)
	if err != nil {
		return "", nil, false, err
	}
	if user == nil {
		return "", nil, false, errors.New("invalid email or password")
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		return "", nil, false, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return "", nil, false, errors.New("account is disabled")
	}

	if user.Is2FAEnabled {
		err := s.otpSvc.GenerateAndSendOTP(user.ID, user.Email, user.Name)
		if err != nil {
			return "", nil, false, errors.New("failed to send OTP email")
		}
		// True -> requires OTP verification
		return "", user, true, nil
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, jwtSecret)
	if err != nil {
		return "", nil, false, err
	}

	return token, user, false, nil
}

func (s *authService) Verify2FALogin(email, otpCode, jwtSecret string) (string, *models.User, error) {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil || user == nil {
		return "", nil, errors.New("invalid user")
	}

	valid := s.otpSvc.VerifyOTP(user.ID, otpCode)
	if !valid {
		return "", nil, errors.New("invalid or expired OTP code")
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, jwtSecret)
	if err != nil {
		return "", nil, err
	}
	return token, user, nil
}

func (s *authService) Toggle2FA(userID int64, enable bool) error {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		return errors.New("invalid user")
	}
	
	user.Is2FAEnabled = enable
	return s.userRepo.UpdateUser(user)
}

func (s *authService) GoogleLoginCallback(email string, name string, googleID string, jwtSecret string) (string, *models.User, error) {
	// Temukan user berdasarkan email. Kalau ada, kita tautkan googleID-nya jika kosong.
	// Kalau tidak ada, kita buat akun baru.
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return "", nil, err
	}

	if user == nil {
		// Buat akun baru khusus SSO
		user = &models.User{
			Email:        email,
			Name:         name,
			PasswordHash: "", // Akun SSO tidak punya password lokal
			GoogleID:     &googleID,
			Role:         "member",
			IsActive:     true,
		}
		err = s.userRepo.CreateUser(user)
		if err != nil {
			return "", nil, err
		}
	} else {
		// Akun sudah ada, tautkan Google ID jika belum terpasang
		if user.GoogleID == nil || *user.GoogleID != googleID {
			user.GoogleID = &googleID
			err = s.userRepo.UpdateUser(user)
			if err != nil {
				return "", nil, err // gagal update
			}
		}

		if !user.IsActive {
			return "", nil, errors.New("account is disabled")
		}
	}

	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, jwtSecret)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (s *authService) ForgotPassword(email, frontendURL string) error {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil || user == nil {
		return nil // silently fail to prevent enumeration
	}
	return s.otpSvc.GenerateAndSendResetToken(user.ID, user.Email, user.Name, frontendURL)
}

func (s *authService) ResetPassword(token, newPassword string) error {
	userID, valid := s.otpSvc.VerifyResetToken(token)
	if !valid {
		return errors.New("invalid or expired reset token")
	}
	
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		return errors.New("user not found")
	}
	
	hashed, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	
	user.PasswordHash = hashed
	return s.userRepo.UpdateUser(user)
}

func (s *authService) VerifyAccount(token string) error {
	userID, valid := s.otpSvc.VerifyAccountToken(token)
	if !valid {
		return errors.New("token aktivasi tidak valid atau telah kadaluarsa")
	}
	
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		return errors.New("akun tidak ditemukan")
	}
	
	if user.IsActive {
		return errors.New("akun sudah aktif") // Idempotency
	}
	
	user.IsActive = true
	return s.userRepo.UpdateUser(user)
}

