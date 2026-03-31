package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"github.com/redis/go-redis/v9"
)

type OTPService interface {
	GenerateAndSendOTP(userID int64, email, name string) error
	VerifyOTP(userID int64, code string) bool
	GenerateAndSendResetToken(userID int64, email, name, frontendURL string) error
	VerifyResetToken(token string) (int64, bool)
	GenerateAndSendVerificationToken(userID int64, email, name, frontendURL string) error
	VerifyAccountToken(token string) (int64, bool)
}

type otpService struct {
	redisClient *redis.Client
	emailSvc    EmailService
}

func NewOTPService(rdb *redis.Client, emailSvc EmailService) OTPService {
	return &otpService{
		redisClient: rdb,
		emailSvc:    emailSvc,
	}
}

func (s *otpService) GenerateAndSendOTP(userID int64, email, name string) error {
	// Generate 6 digit pin
	val, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return err
	}
	otpCode := fmt.Sprintf("%06d", val.Int64()+100000)

	// Save to Redis with 5 minutes expiration
	ctx := context.Background()
	key := fmt.Sprintf("otp:user:%d", userID)
	
	err = s.redisClient.Set(ctx, key, otpCode, 5*time.Minute).Err()
	if err != nil {
		return err
	}

	// Send via Email Service
	return s.emailSvc.SendOTP(email, name, otpCode)
}

func (s *otpService) VerifyOTP(userID int64, code string) bool {
	ctx := context.Background()
	key := fmt.Sprintf("otp:user:%d", userID)

	val, err := s.redisClient.Get(ctx, key).Result()
	if err == redis.Nil || err != nil {
		return false
	}

	if val == code {
		// Valid, clear the OTP
		s.redisClient.Del(ctx, key)
		return true
	}

	return false
}

func (s *otpService) GenerateAndSendResetToken(userID int64, email, name, frontendURL string) error {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return err
	}
	token := hex.EncodeToString(b)
	
	ctx := context.Background()
	key := fmt.Sprintf("reset:token:%s", token)
	
	err = s.redisClient.Set(ctx, key, userID, 15*time.Minute).Err()
	if err != nil {
		return err
	}
	
	resetLink := fmt.Sprintf("%s/auth/reset-password?token=%s", frontendURL, token)
	return s.emailSvc.SendResetPasswordEmail(email, name, resetLink)
}

func (s *otpService) VerifyResetToken(token string) (int64, bool) {
	ctx := context.Background()
	key := fmt.Sprintf("reset:token:%s", token)
	
	val, err := s.redisClient.Get(ctx, key).Int64()
	if err == redis.Nil || err != nil {
		return 0, false
	}
	
	// Valid token, consumed successfully
	s.redisClient.Del(ctx, key)
	return val, true
}

func (s *otpService) GenerateAndSendVerificationToken(userID int64, email, name, frontendURL string) error {
	b := make([]byte, 24)
	_, err := rand.Read(b)
	if err != nil {
		return err
	}
	token := hex.EncodeToString(b)
	
	ctx := context.Background()
	key := fmt.Sprintf("verify:token:%s", token)
	
	err = s.redisClient.Set(ctx, key, userID, 24*time.Hour).Err()
	if err != nil {
		return err
	}
	
	verifyLink := fmt.Sprintf("%s/auth/verify?token=%s", frontendURL, token)
	return s.emailSvc.SendVerificationEmail(email, name, verifyLink)
}

func (s *otpService) VerifyAccountToken(token string) (int64, bool) {
	ctx := context.Background()
	key := fmt.Sprintf("verify:token:%s", token)
	
	val, err := s.redisClient.Get(ctx, key).Int64()
	if err == redis.Nil || err != nil {
		return 0, false
	}
	
	s.redisClient.Del(ctx, key)
	return val, true
}
