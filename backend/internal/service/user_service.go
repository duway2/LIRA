package service

import (
	"errors"

	"github.com/lira/backend/internal/models"
	"github.com/lira/backend/internal/repository"
	"github.com/lira/backend/pkg/utils"
)

type UserService interface {
	UpdateProfile(userID int64, email, name, password string) (*models.User, error)
	AdminResetPassword(targetUserID int64, newPassword string) error
	GetUsers() ([]models.User, error)
	ManageUserStatus(targetUserID int64, isActive bool) error
}

type userService struct {
	userRepo repository.UserRepository
	emailSvc EmailService
}

func NewUserService(userRepo repository.UserRepository, emailSvc EmailService) UserService {
	return &userService{
		userRepo: userRepo,
		emailSvc: emailSvc,
	}
}

func (s *userService) UpdateProfile(userID int64, email, name, password string) (*models.User, error) {
	user, err := s.userRepo.GetUserByID(userID)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	// Cek apakah email sudah digunakan user lain
	if email != "" && email != user.Email {
		existingUser, _ := s.userRepo.GetUserByEmail(email)
		if existingUser != nil {
			return nil, errors.New("email is already fully registered")
		}
		user.Email = email
	}

	if name != "" {
		user.Name = name
	}

	if password != "" {
		hash, err := utils.HashPassword(password)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = hash
		
		// Kirim email notifikasi bahwa password telah diganti
		s.emailSvc.SendEmail(user.Email, user.Name, "Password Anda Telah Diperbarui", 
			"<p>Halo, Password akun LIRA Anda baru saja diperbarui. Jika ini bukan Anda, segera hubungi Admin.</p>")
	}

	err = s.userRepo.UpdateUser(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) AdminResetPassword(targetUserID int64, newPassword string) error {
	user, err := s.userRepo.GetUserByID(targetUserID)
	if err != nil || user == nil {
		return errors.New("target user not found")
	}

	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hash

	err = s.userRepo.UpdateUser(user)
	if err == nil {
		s.emailSvc.SendEmail(user.Email, user.Name, "Password Anda Direset Admin",
			"<p>Halo, Admin LIRA baru saja mereset password Anda. Pastikan untuk segera login dan mengganti password demi keamanan.</p>")
	}
	return err
}

func (s *userService) GetUsers() ([]models.User, error) {
	return s.userRepo.GetUsers()
}

func (s *userService) ManageUserStatus(targetUserID int64, isActive bool) error {
	user, err := s.userRepo.GetUserByID(targetUserID)
	if err != nil || user == nil {
		return errors.New("target user not found")
	}

	if user.IsActive == isActive {
		return nil // no change is needed
	}

	user.IsActive = isActive
	err = s.userRepo.UpdateUser(user)

	if err == nil && !isActive {
		// Mengirim notifikasi penolakan / ban sesuai permintaan #1 Member ditolak
		s.emailSvc.SendEmail(user.Email, user.Name, "Pemberitahuan Status Akun LIRA", 
			"<p>Halo, Mohon maaf status akun keanggotaan LIRA Anda saat ini dinonaktifkan (ditolak).</p>")
	}

	return err
}
